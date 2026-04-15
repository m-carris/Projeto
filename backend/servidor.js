// ============================================================
// SERVIDOR.JS — O Coração do Backend
// ============================================================
// Este ficheiro é o "cérebro" do nosso sistema. É aqui que:
// - Criamos o servidor web (usando Express)
// - Definimos todas as "rotas" (URLs que aceitam pedidos)
// - Ligamos o Socket.io (para mensagens em tempo real)
// - Verificamos logins e passwords
//
// Para arrancar o servidor:
//   1. Abre o terminal na pasta "backend"
//   2. Corre: npm install (só na primeira vez)
//   3. Corre: node servidor.js
//   4. O servidor fica a correr em http://localhost:3000
// ============================================================

// ============================================================
// PASSO 1: Importar as ferramentas que precisamos
// ============================================================
// 'require' é como ir buscar uma ferramenta à caixa de ferramentas.
// Cada ferramenta (módulo) tem um propósito específico.

// Express é a ferramenta que cria o servidor web
// Pensa nele como o "esqueleto" do nosso servidor
const express = require('express');

// CORS (Cross-Origin Resource Sharing) permite que o backoffice
// e a extensão falem com o servidor a partir de outro endereço.
// Sem isto, o browser bloqueia os pedidos por segurança.
const cors = require('cors');

// HTTP é um módulo que já vem com o Node.js
// Precisamos dele para o Socket.io funcionar em cima do Express
const http = require('http');

// Socket.io permite enviar mensagens em tempo real
// É como um "walkie-talkie" entre o servidor e os clientes
// Quando o coordenador envia uma mensagem, o Socket.io avisa
// imediatamente todos os operadores que estão ligados
const socketIo = require('socket.io');

// jsonwebtoken (JWT) cria "bilhetes de identidade" digitais (tokens)
// Quando alguém faz login com sucesso, recebe um token
// Esse token prova quem é a pessoa em cada pedido seguinte
const jwt = require('jsonwebtoken');

// bcryptjs compara passwords de forma segura
// Usamo-lo para verificar se a password que o utilizador escreveu
// corresponde à password encriptada guardada no ficheiro
const bcryptjs = require('bcryptjs');

// path ajuda a construir caminhos de ficheiros corretamente
// Funciona em qualquer sistema operativo (Windows, Mac, Linux)
const path = require('path');

// Importar as funções da nossa "base de dados" (ficheiros JSON)
// Estas funções foram definidas no ficheiro basededados.js
const baseDeDados = require('./basededados');

// ============================================================
// PASSO 2: Configurações do servidor
// ============================================================

// A porta onde o servidor vai "ouvir" pedidos
// É como o número da porta de uma casa — os clientes batem nesta porta
const PORTA = 3000;

// O "segredo" usado para criar e verificar tokens JWT
// É como a chave de uma fechadura — só o servidor a conhece
// Em produção, isto deveria ser uma string muito longa e aleatória
const SEGREDO_JWT = 'segredo-super-secreto-carris-2024';

// Quanto tempo o token é válido antes de expirar
// '24h' significa 24 horas — depois disso, o utilizador tem de fazer login outra vez
const DURACAO_TOKEN = '24h';

// ============================================================
// PASSO 3: Criar a aplicação Express e o servidor
// ============================================================

// Criar a "aplicação" Express
// A partir daqui, 'app' é o nosso servidor web
let app = express();

// Criar o servidor HTTP "por cima" do Express
// O Socket.io precisa deste servidor para funcionar
let servidor = http.createServer(app);

// Criar o Socket.io e ligá-lo ao nosso servidor
// As opções de cors permitem que qualquer site/extensão se conecte
let io = socketIo(servidor, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// ============================================================
// PASSO 4: Configurar "middlewares"
// ============================================================
// Middlewares são como "porteiros" que processam cada pedido
// ANTES de chegar à rota final. Fazem coisas como:
// - Permitir pedidos de outros sites (CORS)
// - Converter dados JSON para objetos JavaScript
// - Servir ficheiros estáticos (HTML, CSS, JS)

// Permitir pedidos de qualquer origem (backoffice, extensão, etc.)
app.use(cors());

// Permitir que o servidor entenda dados enviados em formato JSON
// Quando o backoffice envia { "username": "joao" }, o Express
// converte isso num objeto JavaScript que podemos usar
app.use(express.json());

// Servir os ficheiros do backoffice como páginas web
// Quando alguém visita http://localhost:3000/, o Express
// envia o ficheiro index.html da pasta "backoffice"
app.use(express.static(path.join(__dirname, '..', 'backoffice')));

// ============================================================
// PASSO 5: Inicializar a base de dados
// ============================================================
// Antes de aceitar pedidos, garantimos que os ficheiros da
// base de dados existem e têm os dados iniciais
baseDeDados.inicializarDados();

// ============================================================
// PASSO 6: Função "Segurança" — Verificar Token JWT
// ============================================================
// Esta função é chamada ANTES de certas rotas para verificar
// se o utilizador tem um "bilhete" (token) válido.
// Se o token é válido, o pedido continua. Se não, é rejeitado.
//
// Como funciona:
// 1. O cliente envia o token no cabeçalho "Authorization"
//    Ex: Authorization: Bearer eyJhbGciOi...
// 2. Esta função extrai e verifica o token
// 3. Se válido, guarda os dados do utilizador em req.utilizador
// 4. Se inválido, responde com erro 401 (Não Autorizado)

function verificarToken(req, res, next) {
    // Buscar o cabeçalho "Authorization" do pedido
    // req.headers contém todos os cabeçalhos enviados pelo cliente
    let cabecalho = req.headers['authorization'];

    // Se não existe cabeçalho, o utilizador não enviou token
    if (!cabecalho) {
        res.status(401).json({ erro: 'Token não fornecido. Faz login primeiro.' });
        return;
    }

    // O token vem no formato "Bearer XXXXXX"
    // Precisamos de separar a palavra "Bearer" do token real
    // .split(' ') divide a string pelo espaço
    let partes = cabecalho.split(' ');

    // A segunda parte (índice 1) é o token propriamente dito
    let token = partes[1];

    // Se não existe token depois do "Bearer", o formato é inválido
    if (!token) {
        res.status(401).json({ erro: 'Formato do token inválido.' });
        return;
    }

    // Tentar verificar se o token é válido
    // jwt.verify descodifica o token usando o nosso SEGREDO
    // Se o token foi alterado ou expirou, dá erro
    try {
        // dadosDoToken contém as informações que guardámos no token
        // (id, username, role do utilizador)
        let dadosDoToken = jwt.verify(token, SEGREDO_JWT);

        // Guardar os dados do utilizador no pedido
        // Assim, as rotas seguintes sabem quem é o utilizador
        req.utilizador = dadosDoToken;

        // Chamar next() para continuar para a rota seguinte
        // É como o segurança dizer "pode passar!"
        next();
    } catch (erro) {
        // Se o token é inválido ou expirou, rejeitar o pedido
        res.status(401).json({ erro: 'Token inválido ou expirado. Faz login novamente.' });
        return;
    }
}

// ============================================================
// PASSO 7: ROTAS DE AUTENTICAÇÃO (Login)
// ============================================================

// ---- POST /auth/login ----
// O que faz: Verifica username e password, devolve um token JWT
// Quando é chamada: Quando o utilizador clica "Entrar" no login
// Recebe: { username: "...", password: "..." }
// Devolve: { token: "...", utilizador: { id, username, role, nome } }

app.post('/auth/login', function(req, res) {
    // Buscar o username e password enviados pelo cliente
    let username = req.body.username;
    let password = req.body.password;

    // Verificar se os campos foram preenchidos
    if (!username || !password) {
        res.status(400).json({ erro: 'Username e password são obrigatórios.' });
        return;
    }

    // Ler a lista de utilizadores da base de dados
    let utilizadores = baseDeDados.lerUtilizadores();

    // Procurar o utilizador com o username indicado
    // Usamos um ciclo for para percorrer todos os utilizadores
    let utilizadorEncontrado = null;
    for (let i = 0; i < utilizadores.length; i = i + 1) {
        if (utilizadores[i].username === username) {
            utilizadorEncontrado = utilizadores[i];
        }
    }

    // Se não encontrámos nenhum utilizador com esse username
    if (utilizadorEncontrado === null) {
        res.status(401).json({ erro: 'Username ou password incorretos.' });
        return;
    }

    // Comparar a password enviada com a password encriptada guardada
    // bcryptjs.compareSync devolve true se correspondem, false se não
    let passwordCorreta = bcryptjs.compareSync(password, utilizadorEncontrado.password);

    // Se a password está errada
    if (!passwordCorreta) {
        res.status(401).json({ erro: 'Username ou password incorretos.' });
        return;
    }

    // Se chegámos aqui, o login está correto!
    // Criar um token JWT com os dados do utilizador
    // Estes dados ficam "dentro" do token e podem ser lidos depois
    let dadosParaToken = {
        id: utilizadorEncontrado.id,
        username: utilizadorEncontrado.username,
        role: utilizadorEncontrado.role,
        nome: utilizadorEncontrado.nome
    };

    // jwt.sign cria o token usando os dados e o nosso segredo
    let token = jwt.sign(dadosParaToken, SEGREDO_JWT, { expiresIn: DURACAO_TOKEN });

    // Devolver o token e os dados do utilizador ao cliente
    // O cliente vai guardar o token e usá-lo nos próximos pedidos
    res.json({
        token: token,
        utilizador: {
            id: utilizadorEncontrado.id,
            username: utilizadorEncontrado.username,
            role: utilizadorEncontrado.role,
            nome: utilizadorEncontrado.nome
        }
    });

    // Mostrar no terminal que alguém fez login
    console.log('🔑 Login bem-sucedido: ' + utilizadorEncontrado.nome);
});

// ============================================================
// PASSO 8: ROTAS DE UTILIZADORES
// ============================================================

// ---- GET /users ----
// O que faz: Devolve a lista de todos os utilizadores
// Nota: Não devolve as passwords (por segurança)
// Precisa: Token válido (verificarToken)

app.get('/users', verificarToken, function(req, res) {
    // Ler todos os utilizadores da base de dados
    let utilizadores = baseDeDados.lerUtilizadores();

    // Criar uma nova lista SEM as passwords
    // Nunca devolvemos passwords ao cliente, mesmo encriptadas
    let utilizadoresSemPassword = [];
    for (let i = 0; i < utilizadores.length; i = i + 1) {
        let utilizadorLimpo = {
            id: utilizadores[i].id,
            username: utilizadores[i].username,
            role: utilizadores[i].role,
            nome: utilizadores[i].nome
        };
        utilizadoresSemPassword.push(utilizadorLimpo);
    }

    // Devolver a lista limpa
    res.json(utilizadoresSemPassword);
});

// ---- POST /users ----
// O que faz: Cria um novo utilizador
// Recebe: { username, password, role, nome }
// Precisa: Token válido + ser coordenador

app.post('/users', verificarToken, function(req, res) {
    // Verificar se o utilizador que faz o pedido é coordenador
    // Apenas coordenadores podem criar novos utilizadores
    if (req.utilizador.role !== 'coordenador') {
        res.status(403).json({ erro: 'Apenas coordenadores podem criar utilizadores.' });
        return;
    }

    // Buscar os dados enviados
    let username = req.body.username;
    let password = req.body.password;
    let role = req.body.role;
    let nome = req.body.nome;

    // Verificar se todos os campos foram preenchidos
    if (!username || !password || !role || !nome) {
        res.status(400).json({ erro: 'Todos os campos são obrigatórios: username, password, role, nome.' });
        return;
    }

    // Verificar se o role é válido (apenas 'coordenador' ou 'operador')
    if (role !== 'coordenador' && role !== 'operador') {
        res.status(400).json({ erro: 'O role deve ser "coordenador" ou "operador".' });
        return;
    }

    // Ler utilizadores existentes
    let utilizadores = baseDeDados.lerUtilizadores();

    // Verificar se já existe um utilizador com o mesmo username
    let usernameExiste = false;
    for (let i = 0; i < utilizadores.length; i = i + 1) {
        if (utilizadores[i].username === username) {
            usernameExiste = true;
        }
    }

    if (usernameExiste) {
        res.status(400).json({ erro: 'Já existe um utilizador com esse username.' });
        return;
    }

    // Encriptar a password antes de guardar
    let passwordEncriptada = bcryptjs.hashSync(password, 10);

    // Criar o novo utilizador com um ID único
    let novoUtilizador = {
        id: baseDeDados.proximoId(utilizadores),
        username: username,
        password: passwordEncriptada,
        role: role,
        nome: nome
    };

    // Adicionar o novo utilizador à lista
    utilizadores.push(novoUtilizador);

    // Guardar a lista atualizada no ficheiro
    baseDeDados.guardarUtilizadores(utilizadores);

    // Devolver o utilizador criado (sem a password)
    res.status(201).json({
        id: novoUtilizador.id,
        username: novoUtilizador.username,
        role: novoUtilizador.role,
        nome: novoUtilizador.nome
    });

    console.log('👤 Novo utilizador criado: ' + nome + ' (' + role + ')');
});

// ============================================================
// PASSO 9: ROTAS DE MENSAGENS
// ============================================================

// ---- POST /messages ----
// O que faz: Cria e envia uma nova mensagem
// Recebe: { conteudo, prioridade, tipo, destinatario }
// Precisa: Token válido + ser coordenador

app.post('/messages', verificarToken, function(req, res) {
    // Verificar se é coordenador
    if (req.utilizador.role !== 'coordenador') {
        res.status(403).json({ erro: 'Apenas coordenadores podem enviar mensagens.' });
        return;
    }

    // Buscar os dados da mensagem
    let conteudo = req.body.conteudo;
    let prioridade = req.body.prioridade;
    let tipo = req.body.tipo;
    let destinatario = req.body.destinatario;

    // Verificar se o conteúdo foi preenchido
    if (!conteudo) {
        res.status(400).json({ erro: 'O conteúdo da mensagem é obrigatório.' });
        return;
    }

    // Se a prioridade não foi indicada, usar "normal"
    if (!prioridade) {
        prioridade = 'normal';
    }

    // Se o tipo não foi indicado, usar "geral"
    if (!tipo) {
        tipo = 'geral';
    }

    // Se o destinatário não foi indicado, enviar para "todos"
    if (!destinatario) {
        destinatario = 'todos';
    }

    // Ler as mensagens existentes
    let mensagens = baseDeDados.lerMensagens();

    // Criar a nova mensagem com um ID único e a data/hora atual
    let novaMensagem = {
        id: baseDeDados.proximoId(mensagens),
        conteudo: conteudo,
        prioridade: prioridade,
        tipo: tipo,
        destinatario: destinatario,
        remetenteId: req.utilizador.id,
        remetenteNome: req.utilizador.nome,
        criadaEm: new Date().toISOString()
    };

    // Adicionar a nova mensagem à lista
    mensagens.push(novaMensagem);

    // Guardar a lista atualizada no ficheiro
    baseDeDados.guardarMensagens(mensagens);

    // *** PARTE MÁGICA: Enviar a mensagem em tempo real! ***
    // io.emit envia a mensagem para TODOS os clientes conectados
    // via Socket.io. É como gritar num altifalante para todos ouvirem.
    io.emit('nova-mensagem', novaMensagem);

    // Devolver a mensagem criada como resposta
    res.status(201).json(novaMensagem);

    // Mostrar no terminal
    let icone = '📢';
    if (prioridade === 'alta') {
        icone = '🚨';
    }
    console.log(icone + ' Nova mensagem enviada por ' + req.utilizador.nome + ': ' + conteudo);
});

// ---- GET /messages ----
// O que faz: Devolve a lista de mensagens, com opção de filtros
// Parâmetros opcionais na URL (?search=texto&prioridade=alta&data=2024-01-15):
//   - search: procurar texto no conteúdo da mensagem
//   - prioridade: filtrar por prioridade ('normal' ou 'alta')
//   - data: filtrar por data (formato AAAA-MM-DD)
// Precisa: Token válido

app.get('/messages', verificarToken, function(req, res) {
    // Ler todas as mensagens da base de dados
    let todasMensagens = baseDeDados.lerMensagens();

    // Buscar os filtros da URL (se existirem)
    // req.query contém os parâmetros da URL (o que vem depois do ?)
    let filtroPesquisa = req.query.search;
    let filtroPrioridade = req.query.prioridade;
    let filtroData = req.query.data;

    // Começar com todas as mensagens
    let mensagensFiltradas = [];

    // Percorrer todas as mensagens e aplicar os filtros
    for (let i = 0; i < todasMensagens.length; i = i + 1) {
        let mensagem = todasMensagens[i];
        let incluirMensagem = true;

        // Filtro de pesquisa: verificar se o conteúdo contém o texto procurado
        if (filtroPesquisa) {
            // Converter ambos para minúsculas para a pesquisa não ser sensível a maiúsculas
            let conteudoMinusculas = mensagem.conteudo.toLowerCase();
            let pesquisaMinusculas = filtroPesquisa.toLowerCase();

            // Se o conteúdo NÃO contém o texto procurado, excluir esta mensagem
            if (conteudoMinusculas.indexOf(pesquisaMinusculas) === -1) {
                incluirMensagem = false;
            }
        }

        // Filtro de prioridade: verificar se corresponde
        if (filtroPrioridade) {
            if (mensagem.prioridade !== filtroPrioridade) {
                incluirMensagem = false;
            }
        }

        // Filtro de data: verificar se a mensagem foi criada nesse dia
        if (filtroData) {
            // A data da mensagem está no formato ISO: "2024-01-15T10:30:00.000Z"
            // Precisamos apenas dos primeiros 10 caracteres: "2024-01-15"
            let dataMensagem = mensagem.criadaEm.substring(0, 10);

            if (dataMensagem !== filtroData) {
                incluirMensagem = false;
            }
        }

        // Se a mensagem passou todos os filtros, adicioná-la à lista
        if (incluirMensagem) {
            mensagensFiltradas.push(mensagem);
        }
    }

    // Ordenar as mensagens por data (mais recentes primeiro)
    // Usamos um ciclo simples de ordenação (bubble sort)
    for (let i = 0; i < mensagensFiltradas.length; i = i + 1) {
        for (let j = 0; j < mensagensFiltradas.length - 1; j = j + 1) {
            // Comparar as datas como texto (funciona porque estão em formato ISO)
            if (mensagensFiltradas[j].criadaEm < mensagensFiltradas[j + 1].criadaEm) {
                // Trocar as posições (a mais recente vai para cima)
                let temporaria = mensagensFiltradas[j];
                mensagensFiltradas[j] = mensagensFiltradas[j + 1];
                mensagensFiltradas[j + 1] = temporaria;
            }
        }
    }

    // Devolver as mensagens filtradas e ordenadas
    res.json(mensagensFiltradas);
});

// ---- GET /messages/recentes ----
// O que faz: Devolve as últimas N mensagens (padrão: 20)
// Parâmetro opcional: ?limite=10 (quantas mensagens devolver)
// Precisa: Token válido

app.get('/messages/recentes', verificarToken, function(req, res) {
    // Ler todas as mensagens
    let todasMensagens = baseDeDados.lerMensagens();

    // Determinar o limite (quantas mensagens devolver)
    let limite = 20; // Valor padrão
    if (req.query.limite) {
        limite = parseInt(req.query.limite);
    }

    // Ordenar por data (mais recentes primeiro) usando bubble sort
    for (let i = 0; i < todasMensagens.length; i = i + 1) {
        for (let j = 0; j < todasMensagens.length - 1; j = j + 1) {
            if (todasMensagens[j].criadaEm < todasMensagens[j + 1].criadaEm) {
                let temporaria = todasMensagens[j];
                todasMensagens[j] = todasMensagens[j + 1];
                todasMensagens[j + 1] = temporaria;
            }
        }
    }

    // Pegar apenas as primeiras N mensagens (as mais recentes)
    let mensagensRecentes = [];
    for (let i = 0; i < todasMensagens.length && i < limite; i = i + 1) {
        mensagensRecentes.push(todasMensagens[i]);
    }

    // Devolver as mensagens recentes
    res.json(mensagensRecentes);
});

// ============================================================
// PASSO 10: ROTAS DE TEMPLATES (Mensagens Rápidas)
// ============================================================

// ---- GET /templates ----
// O que faz: Devolve a lista de templates ativos
// Precisa: Token válido

app.get('/templates', verificarToken, function(req, res) {
    // Ler todos os templates
    let todosTemplates = baseDeDados.lerTemplates();

    // Filtrar apenas os que estão ativos (ativo === true)
    let templatesAtivos = [];
    for (let i = 0; i < todosTemplates.length; i = i + 1) {
        if (todosTemplates[i].ativo === true) {
            templatesAtivos.push(todosTemplates[i]);
        }
    }

    // Devolver os templates ativos
    res.json(templatesAtivos);
});

// ---- POST /templates ----
// O que faz: Cria um novo template
// Recebe: { nome, conteudo, prioridade, tipo }
// Precisa: Token válido + ser coordenador

app.post('/templates', verificarToken, function(req, res) {
    // Verificar se é coordenador
    if (req.utilizador.role !== 'coordenador') {
        res.status(403).json({ erro: 'Apenas coordenadores podem criar templates.' });
        return;
    }

    // Buscar os dados do template
    let nome = req.body.nome;
    let conteudo = req.body.conteudo;
    let prioridade = req.body.prioridade;
    let tipo = req.body.tipo;

    // Verificar campos obrigatórios
    if (!nome || !conteudo) {
        res.status(400).json({ erro: 'Nome e conteúdo são obrigatórios.' });
        return;
    }

    // Valores padrão
    if (!prioridade) {
        prioridade = 'normal';
    }
    if (!tipo) {
        tipo = 'geral';
    }

    // Ler templates existentes
    let templates = baseDeDados.lerTemplates();

    // Criar o novo template
    let novoTemplate = {
        id: baseDeDados.proximoId(templates),
        nome: nome,
        conteudo: conteudo,
        prioridade: prioridade,
        tipo: tipo,
        ativo: true
    };

    // Adicionar à lista e guardar
    templates.push(novoTemplate);
    baseDeDados.guardarTemplates(templates);

    // Devolver o template criado
    res.status(201).json(novoTemplate);

    console.log('📋 Novo template criado: ' + nome);
});

// ---- PATCH /templates/:id ----
// O que faz: Atualiza um template existente
// :id é o ID do template a atualizar
// Recebe: { nome, conteudo, prioridade, tipo } (todos opcionais)
// Precisa: Token válido + ser coordenador

app.patch('/templates/:id', verificarToken, function(req, res) {
    // Verificar se é coordenador
    if (req.utilizador.role !== 'coordenador') {
        res.status(403).json({ erro: 'Apenas coordenadores podem editar templates.' });
        return;
    }

    // Buscar o ID do template a partir da URL
    // req.params.id contém o valor de :id na URL
    let idProcurado = parseInt(req.params.id);

    // Ler todos os templates
    let templates = baseDeDados.lerTemplates();

    // Procurar o template com esse ID
    let templateEncontrado = null;
    let posicaoDoTemplate = -1;
    for (let i = 0; i < templates.length; i = i + 1) {
        if (templates[i].id === idProcurado) {
            templateEncontrado = templates[i];
            posicaoDoTemplate = i;
        }
    }

    // Se não encontrou o template
    if (templateEncontrado === null) {
        res.status(404).json({ erro: 'Template não encontrado.' });
        return;
    }

    // Atualizar os campos que foram enviados
    // Se um campo foi enviado no pedido, atualizar; se não, manter o valor atual
    if (req.body.nome) {
        templates[posicaoDoTemplate].nome = req.body.nome;
    }
    if (req.body.conteudo) {
        templates[posicaoDoTemplate].conteudo = req.body.conteudo;
    }
    if (req.body.prioridade) {
        templates[posicaoDoTemplate].prioridade = req.body.prioridade;
    }
    if (req.body.tipo) {
        templates[posicaoDoTemplate].tipo = req.body.tipo;
    }

    // Guardar a lista atualizada
    baseDeDados.guardarTemplates(templates);

    // Devolver o template atualizado
    res.json(templates[posicaoDoTemplate]);

    console.log('📋 Template atualizado: ' + templates[posicaoDoTemplate].nome);
});

// ---- DELETE /templates/:id ----
// O que faz: "Apaga" um template (na verdade, marca como inativo)
// Isto chama-se "soft delete" — não apagamos realmente, apenas desativamos
// Precisa: Token válido + ser coordenador

app.delete('/templates/:id', verificarToken, function(req, res) {
    // Verificar se é coordenador
    if (req.utilizador.role !== 'coordenador') {
        res.status(403).json({ erro: 'Apenas coordenadores podem apagar templates.' });
        return;
    }

    // Buscar o ID do template
    let idProcurado = parseInt(req.params.id);

    // Ler todos os templates
    let templates = baseDeDados.lerTemplates();

    // Procurar o template com esse ID
    let encontrado = false;
    for (let i = 0; i < templates.length; i = i + 1) {
        if (templates[i].id === idProcurado) {
            // Marcar como inativo (em vez de apagar)
            templates[i].ativo = false;
            encontrado = true;
        }
    }

    // Se não encontrou o template
    if (!encontrado) {
        res.status(404).json({ erro: 'Template não encontrado.' });
        return;
    }

    // Guardar a lista atualizada
    baseDeDados.guardarTemplates(templates);

    // Devolver confirmação
    res.json({ mensagem: 'Template desativado com sucesso.' });

    console.log('🗑️ Template desativado (ID: ' + idProcurado + ')');
});

// ============================================================
// PASSO 11: WEBSOCKET (Socket.io) — Comunicação em Tempo Real
// ============================================================
// O Socket.io permite que o servidor "empurre" mensagens para
// os clientes sem que eles precisem de pedir.
// É como um walkie-talkie: quando o coordenador fala, todos ouvem.
//
// Fluxo:
// 1. Cliente (backoffice/extensão) conecta-se ao Socket.io
// 2. Quando uma nova mensagem é criada (POST /messages),
//    o servidor emite o evento 'nova-mensagem'
// 3. Todos os clientes conectados recebem a mensagem instantaneamente

// Este evento é disparado quando um novo cliente se conecta
io.on('connection', function(socket) {
    // Mostrar no terminal que alguém se conectou
    console.log('🔌 Novo cliente conectado via WebSocket (ID: ' + socket.id + ')');

    // Quando o cliente se desconecta
    socket.on('disconnect', function() {
        console.log('🔌 Cliente desconectado (ID: ' + socket.id + ')');
    });
});

// ============================================================
// PASSO 12: Arrancar o servidor!
// ============================================================
// Finalmente, dizemos ao servidor para começar a "ouvir" pedidos
// na porta que definimos (3000).

servidor.listen(PORTA, function() {
    console.log('');
    console.log('============================================================');
    console.log('🚌 SISTEMA DE NOTIFICAÇÕES CARRIS');
    console.log('============================================================');
    console.log('✅ Servidor a correr em: http://localhost:' + PORTA);
    console.log('📋 Backoffice em: http://localhost:' + PORTA);
    console.log('🔌 WebSocket (Socket.io) ativo');
    console.log('============================================================');
    console.log('');
});
