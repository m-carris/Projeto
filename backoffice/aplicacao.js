// ============================================================
// APLICACAO.JS — Lógica do Backoffice (Coordenador)
// ============================================================
// Este ficheiro controla TODA a lógica do backoffice:
// - Login e logout
// - Envio de mensagens
// - Templates (mensagens rápidas)
// - Histórico de mensagens
// - Gestão de utilizadores
// - Conexão WebSocket (Socket.io) para tempo real
//
// REGRAS:
// - Apenas funções clássicas (function nome() { })
// - Apenas let e const para variáveis
// - Sem arrow functions, sem .map, sem .filter, sem destructuring
// ============================================================

// ============================================================
// PASSO 1: Variáveis Globais
// ============================================================
// Estas variáveis são como "caixas" que guardam informação
// importante durante toda a utilização do backoffice.

// O endereço do nosso servidor backend
// É para cá que enviamos todos os pedidos (requests)
const ENDERECO_SERVIDOR = 'http://localhost:3000';

// O token JWT do utilizador (recebido após o login)
// É como um "bilhete" que prova que o utilizador está autenticado
// Começa como null (vazio) porque ninguém fez login ainda
let tokenDoUtilizador = null;

// Os dados do utilizador logado (id, username, role, nome)
// Também começa vazio
let utilizadorLogado = null;

// A conexão Socket.io (para receber mensagens em tempo real)
// Começa como null porque só conectamos após o login
let socketConexao = null;

// A prioridade selecionada no formulário de envio
// Começa como 'normal' (valor padrão)
let prioridadeSelecionada = 'normal';

// ============================================================
// PASSO 2: Verificar se já existe uma sessão guardada
// ============================================================
// Quando a página carrega, verificamos se o utilizador já
// tinha feito login anteriormente. Se sim, recuperamos a sessão.
// O localStorage é como uma "gaveta" do browser que guarda dados
// mesmo depois de fechar e reabrir o browser.

function verificarSessaoExistente() {
    // Tentar buscar o token e os dados do utilizador do localStorage
    let tokenGuardado = localStorage.getItem('token');
    let utilizadorGuardado = localStorage.getItem('utilizador');

    // Se existem ambos, recuperar a sessão
    if (tokenGuardado && utilizadorGuardado) {
        // Guardar nas variáveis globais
        tokenDoUtilizador = tokenGuardado;
        // JSON.parse converte o texto guardado num objeto JavaScript
        utilizadorLogado = JSON.parse(utilizadorGuardado);

        // Mostrar o painel principal e esconder o login
        mostrarPainelPrincipal();
    }
}

// Chamar a verificação quando a página carrega
verificarSessaoExistente();

// ============================================================
// PASSO 3: Função de LOGIN
// ============================================================
// Esta função é chamada quando o utilizador clica "Entrar".
// Envia o username e password para o servidor, e se estiverem
// corretos, recebe um token JWT.

function fazerLogin() {
    // Buscar os valores que o utilizador escreveu nos campos
    let campoUsername = document.getElementById('login-username');
    let campoPassword = document.getElementById('login-password');
    let divErro = document.getElementById('login-erro');

    // Ler os valores dos campos
    let username = campoUsername.value;
    let password = campoPassword.value;

    // Verificar se os campos foram preenchidos
    if (!username || !password) {
        divErro.textContent = 'Por favor, preenche o username e a password.';
        divErro.style.display = 'block';
        return;
    }

    // Esconder a mensagem de erro (caso estivesse visível)
    divErro.style.display = 'none';

    // Desativar o botão enquanto esperamos pela resposta
    let botaoLogin = document.getElementById('login-botao');
    botaoLogin.textContent = 'A entrar...';
    botaoLogin.disabled = true;

    // Criar o "pacote" de dados para enviar ao servidor
    // JSON.stringify converte o objeto JavaScript em texto JSON
    let dadosParaEnviar = JSON.stringify({
        username: username,
        password: password
    });

    // Enviar o pedido de login ao servidor
    // fetch é a forma de fazer pedidos HTTP em JavaScript
    fetch(ENDERECO_SERVIDOR + '/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: dadosParaEnviar
    })
    .then(function(resposta) {
        // .then é chamado quando recebemos a resposta do servidor
        // Converter a resposta para um objeto JavaScript
        return resposta.json();
    })
    .then(function(dados) {
        // Restaurar o botão
        botaoLogin.textContent = 'Entrar';
        botaoLogin.disabled = false;

        // Verificar se o login foi bem-sucedido
        // Se a resposta tem um campo "erro", o login falhou
        if (dados.erro) {
            divErro.textContent = dados.erro;
            divErro.style.display = 'block';
            return;
        }

        // Login com sucesso! Guardar o token e os dados do utilizador
        tokenDoUtilizador = dados.token;
        utilizadorLogado = dados.utilizador;

        // Guardar no localStorage para a sessão persistir
        localStorage.setItem('token', dados.token);
        localStorage.setItem('utilizador', JSON.stringify(dados.utilizador));

        // Limpar os campos do formulário
        campoUsername.value = '';
        campoPassword.value = '';

        // Mostrar o painel principal
        mostrarPainelPrincipal();
    })
    .then(undefined, function(erro) {
        // Se houve um erro de rede (servidor não está a correr, etc.)
        botaoLogin.textContent = 'Entrar';
        botaoLogin.disabled = false;
        divErro.textContent = 'Erro de ligação. Verifica se o servidor está a correr.';
        divErro.style.display = 'block';
    });
}

// ============================================================
// PASSO 4: Mostrar o Painel Principal (após login)
// ============================================================
// Esta função esconde o ecrã de login e mostra o painel
// principal com todas as funcionalidades.

function mostrarPainelPrincipal() {
    // Esconder a secção de login
    document.getElementById('secao-login').style.display = 'none';

    // Mostrar a secção principal
    document.getElementById('secao-principal').style.display = 'block';

    // Mostrar o nome do utilizador na barra de navegação
    document.getElementById('nav-nome-utilizador').textContent = utilizadorLogado.nome;

    // Conectar ao Socket.io (para receber mensagens em tempo real)
    conectarSocketIo();

    // Carregar os dados iniciais
    carregarTemplates();
    carregarUltimasMensagens();
    carregarHistorico();
    carregarUtilizadores();
}

// ============================================================
// PASSO 5: Função de LOGOUT
// ============================================================
// Quando o utilizador clica "Sair":
// 1. Limpar todos os dados guardados
// 2. Desconectar o Socket.io
// 3. Mostrar o ecrã de login

function fazerLogout() {
    // Limpar as variáveis globais
    tokenDoUtilizador = null;
    utilizadorLogado = null;

    // Limpar o localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('utilizador');

    // Desconectar o Socket.io
    if (socketConexao) {
        socketConexao.disconnect();
        socketConexao = null;
    }

    // Esconder o painel principal e mostrar o login
    document.getElementById('secao-principal').style.display = 'none';
    document.getElementById('secao-login').style.display = 'flex';
}

// ============================================================
// PASSO 6: Conexão Socket.io (Tempo Real)
// ============================================================
// O Socket.io permite que o servidor "empurre" mensagens para
// nós sem precisarmos de pedir. É como um walkie-talkie.
// Quando o coordenador envia uma mensagem, ela aparece
// automaticamente na lista de últimas mensagens.

function conectarSocketIo() {
    // Conectar ao servidor Socket.io
    // A variável 'io' é fornecida pelo script socket.io.js
    // que carregámos no HTML
    socketConexao = io(ENDERECO_SERVIDOR);

    // Evento: quando a conexão é estabelecida com sucesso
    socketConexao.on('connect', function() {
        // Atualizar o indicador de conexão para "Conectado" (verde)
        let indicador = document.getElementById('indicador-conexao');
        indicador.textContent = '🟢 Conectado';
        indicador.className = 'indicador-conectado';
    });

    // Evento: quando a conexão é perdida
    socketConexao.on('disconnect', function() {
        // Atualizar o indicador para "Desconectado" (vermelho)
        let indicador = document.getElementById('indicador-conexao');
        indicador.textContent = '🔴 Desconectado';
        indicador.className = 'indicador-desconectado';
    });

    // Evento: quando recebemos uma nova mensagem
    // Este é o evento mais importante! Quando o coordenador (ou outro)
    // envia uma mensagem, o servidor emite 'nova-mensagem' e nós
    // recebemos aqui instantaneamente.
    socketConexao.on('nova-mensagem', function(mensagem) {
        // Adicionar a mensagem à lista de últimas mensagens
        adicionarMensagemAoTopo(mensagem);
    });
}

// ============================================================
// PASSO 7: Navegação entre Páginas
// ============================================================
// O backoffice tem 3 "páginas" (secções):
// - enviar: Formulário de envio de mensagens
// - historico: Histórico com pesquisa
// - utilizadores: Gestão de utilizadores
// Quando o utilizador clica num botão de navegação, mostramos
// a página correspondente e escondemos as outras.

function mudarPagina(nomeDaPagina) {
    // Lista de todas as páginas possíveis
    let paginas = ['enviar', 'historico', 'utilizadores'];

    // Percorrer todas as páginas
    for (let i = 0; i < paginas.length; i = i + 1) {
        // Buscar o elemento da página
        let elementoPagina = document.getElementById('pagina-' + paginas[i]);
        // Buscar o botão de navegação correspondente
        let elementoBotao = document.getElementById('nav-btn-' + paginas[i]);

        // Se esta é a página que queremos mostrar
        if (paginas[i] === nomeDaPagina) {
            // Mostrar a página
            elementoPagina.style.display = 'block';
            // Marcar o botão como ativo
            elementoBotao.className = 'nav-botao nav-botao-ativo';
        } else {
            // Esconder a página
            elementoPagina.style.display = 'none';
            // Remover a marcação do botão
            elementoBotao.className = 'nav-botao';
        }
    }

    // Se mudámos para o histórico, recarregar os dados
    if (nomeDaPagina === 'historico') {
        carregarHistorico();
    }
    // Se mudámos para utilizadores, recarregar a lista
    if (nomeDaPagina === 'utilizadores') {
        carregarUtilizadores();
    }
}

// ============================================================
// PASSO 8: Carregar Templates (Mensagens Rápidas)
// ============================================================
// Buscar os templates do servidor e criar botões para cada um.
// Quando o coordenador clica num botão de template, o formulário
// é preenchido automaticamente com o texto do template.

function carregarTemplates() {
    // Fazer um pedido GET ao servidor para buscar os templates
    fetch(ENDERECO_SERVIDOR + '/templates', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + tokenDoUtilizador
        }
    })
    .then(function(resposta) {
        return resposta.json();
    })
    .then(function(templates) {
        // Buscar o container onde vamos colocar os botões
        let container = document.getElementById('templates-botoes');

        // Limpar o conteúdo anterior
        container.innerHTML = '';

        // Se não há templates, mostrar mensagem
        if (templates.length === 0) {
            container.innerHTML = '<p class="texto-ajuda">Nenhum template disponível.</p>';
            return;
        }

        // Criar um botão para cada template
        for (let i = 0; i < templates.length; i = i + 1) {
            let template = templates[i];

            // Criar o botão
            let botao = document.createElement('button');

            // Escolher o ícone conforme o tipo
            let icone = '📄';
            if (template.tipo === 'acidente') {
                icone = '🚨';
            }
            if (template.tipo === 'transito') {
                icone = '🚗';
            }
            if (template.tipo === 'avaria') {
                icone = '🔧';
            }
            if (template.tipo === 'desvio') {
                icone = '↪️';
            }

            // Definir o texto do botão
            botao.textContent = icone + ' ' + template.nome;

            // Definir as classes CSS (estilo do botão)
            if (template.prioridade === 'alta') {
                botao.className = 'template-botao template-botao-alta';
            } else {
                botao.className = 'template-botao template-botao-normal';
            }

            // Quando o botão é clicado, preencher o formulário
            // Usamos uma função imediata para "capturar" o template atual
            // (isto é necessário porque o ciclo for reutiliza as variáveis)
            botao.onclick = criarFuncaoTemplate(template);

            // Adicionar o botão ao container
            container.appendChild(botao);
        }
    })
    .then(undefined, function(erro) {
        // Se houve erro, mostrar mensagem
        let container = document.getElementById('templates-botoes');
        container.innerHTML = '<p class="texto-ajuda">Erro ao carregar templates.</p>';
    });
}

// Função auxiliar para criar a função de clique do template
// Cada template precisa da sua própria função para "lembrar"
// qual é o template correto quando o botão é clicado
function criarFuncaoTemplate(template) {
    return function() {
        usarTemplate(template);
    };
}

// Função que preenche o formulário com os dados de um template
function usarTemplate(template) {
    // Preencher o campo de conteúdo com o texto do template
    document.getElementById('mensagem-conteudo').value = template.conteudo;

    // Selecionar a prioridade do template
    selecionarPrioridade(template.prioridade);

    // Selecionar o tipo do template
    document.getElementById('mensagem-tipo').value = template.tipo;
}

// ============================================================
// PASSO 9: Selecionar Prioridade
// ============================================================
// Quando o coordenador clica num botão de prioridade (Normal/Alta),
// esta função atualiza a seleção visual e guarda a escolha.

function selecionarPrioridade(prioridade) {
    // Guardar a prioridade selecionada na variável global
    prioridadeSelecionada = prioridade;

    // Buscar os dois botões de prioridade
    let botaoNormal = document.getElementById('prioridade-normal');
    let botaoAlta = document.getElementById('prioridade-alta');

    // Remover a classe "selecionada" de ambos os botões
    botaoNormal.className = 'prioridade-botao';
    botaoAlta.className = 'prioridade-botao';

    // Adicionar a classe "selecionada" ao botão correto
    if (prioridade === 'normal') {
        botaoNormal.className = 'prioridade-botao prioridade-selecionada';
    } else {
        botaoAlta.className = 'prioridade-botao prioridade-selecionada';
    }
}

// ============================================================
// PASSO 10: Enviar Mensagem
// ============================================================
// Quando o coordenador clica "Enviar Mensagem", esta função:
// 1. Recolhe os dados do formulário
// 2. Envia para o servidor via POST /messages
// 3. Mostra feedback de sucesso ou erro

function enviarMensagem() {
    // Buscar os valores do formulário
    let conteudo = document.getElementById('mensagem-conteudo').value;
    let tipo = document.getElementById('mensagem-tipo').value;
    let destinatario = document.getElementById('mensagem-destinatario').value;

    // Verificar se o conteúdo foi preenchido
    if (!conteudo) {
        mostrarFeedbackEnvio('Por favor, escreve uma mensagem.', false);
        return;
    }

    // Desativar o botão enquanto enviamos
    let botaoEnviar = document.getElementById('botao-enviar');
    botaoEnviar.textContent = '📤 A enviar...';
    botaoEnviar.disabled = true;

    // Criar o pacote de dados para enviar
    let dadosMensagem = JSON.stringify({
        conteudo: conteudo,
        prioridade: prioridadeSelecionada,
        tipo: tipo,
        destinatario: destinatario
    });

    // Enviar o pedido POST ao servidor
    fetch(ENDERECO_SERVIDOR + '/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tokenDoUtilizador
        },
        body: dadosMensagem
    })
    .then(function(resposta) {
        return resposta.json();
    })
    .then(function(dados) {
        // Restaurar o botão
        botaoEnviar.textContent = '📤 Enviar Mensagem';
        botaoEnviar.disabled = false;

        // Verificar se houve erro
        if (dados.erro) {
            mostrarFeedbackEnvio(dados.erro, false);
            return;
        }

        // Sucesso! Mostrar feedback positivo
        mostrarFeedbackEnvio('✅ Mensagem enviada com sucesso!', true);

        // Limpar o formulário
        document.getElementById('mensagem-conteudo').value = '';
        selecionarPrioridade('normal');
        document.getElementById('mensagem-tipo').value = 'geral';
    })
    .then(undefined, function(erro) {
        // Erro de rede
        botaoEnviar.textContent = '📤 Enviar Mensagem';
        botaoEnviar.disabled = false;
        mostrarFeedbackEnvio('Erro de ligação ao servidor.', false);
    });
}

// Função auxiliar para mostrar mensagens de feedback no formulário
function mostrarFeedbackEnvio(texto, sucesso) {
    let divFeedback = document.getElementById('enviar-feedback');
    divFeedback.textContent = texto;
    divFeedback.style.display = 'block';

    // Definir a classe CSS conforme sucesso ou erro
    if (sucesso) {
        divFeedback.className = 'feedback-sucesso';
    } else {
        divFeedback.className = 'feedback-erro';
    }

    // Esconder o feedback após 4 segundos
    setTimeout(function() {
        divFeedback.style.display = 'none';
    }, 4000);
}

// ============================================================
// PASSO 11: Carregar Últimas Mensagens (coluna direita)
// ============================================================
// Buscar as últimas mensagens do servidor e mostrá-las
// na coluna direita da página de envio.

function carregarUltimasMensagens() {
    // Fazer pedido GET para buscar as últimas 10 mensagens
    fetch(ENDERECO_SERVIDOR + '/messages/recentes?limite=10', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + tokenDoUtilizador
        }
    })
    .then(function(resposta) {
        return resposta.json();
    })
    .then(function(mensagens) {
        // Mostrar as mensagens na lista
        mostrarListaDeMensagens(mensagens, 'ultimas-mensagens-lista');
    })
    .then(undefined, function(erro) {
        let container = document.getElementById('ultimas-mensagens-lista');
        container.innerHTML = '<p class="texto-ajuda">Erro ao carregar mensagens.</p>';
    });
}

// ============================================================
// PASSO 12: Adicionar Mensagem ao Topo (tempo real)
// ============================================================
// Quando recebemos uma nova mensagem via Socket.io,
// adicionamos ao topo da lista de últimas mensagens.

function adicionarMensagemAoTopo(mensagem) {
    let container = document.getElementById('ultimas-mensagens-lista');

    // Se o container só tem o texto "Nenhuma mensagem", limpar
    let textoAjuda = container.querySelector('.texto-ajuda');
    if (textoAjuda) {
        container.innerHTML = '';
    }

    // Criar o card da mensagem
    let card = criarCardDeMensagem(mensagem);

    // Adicionar no topo (antes do primeiro filho)
    if (container.firstChild) {
        container.insertBefore(card, container.firstChild);
    } else {
        container.appendChild(card);
    }

    // Limitar a 10 mensagens na lista
    while (container.children.length > 10) {
        container.removeChild(container.lastChild);
    }
}

// ============================================================
// PASSO 13: Criar Card de Mensagem (HTML)
// ============================================================
// Esta função cria um "cartão" visual para uma mensagem.
// É usada em várias partes do backoffice (últimas mensagens,
// histórico, etc.)

function criarCardDeMensagem(mensagem) {
    // Criar o div principal do card
    let card = document.createElement('div');
    card.className = 'mensagem-card';

    // Se é prioridade alta, adicionar classe especial
    if (mensagem.prioridade === 'alta') {
        card.className = 'mensagem-card mensagem-card-alta';
    }

    // Formatar a data para ser legível
    // A data vem no formato "2024-01-15T10:30:00.000Z"
    // Queremos mostrar "15/01/2024 10:30"
    let dataFormatada = formatarData(mensagem.criadaEm);

    // Escolher o ícone do tipo
    let iconeTipo = '📄';
    if (mensagem.tipo === 'acidente') {
        iconeTipo = '🚨';
    }
    if (mensagem.tipo === 'transito') {
        iconeTipo = '🚗';
    }
    if (mensagem.tipo === 'avaria') {
        iconeTipo = '🔧';
    }
    if (mensagem.tipo === 'desvio') {
        iconeTipo = '↪️';
    }

    // Construir o HTML do card
    // Usamos innerHTML porque é mais simples e direto
    let htmlDoCard = '';

    // Cabeçalho: data + badge de prioridade
    htmlDoCard = htmlDoCard + '<div class="mensagem-card-cabecalho">';
    htmlDoCard = htmlDoCard + '<span class="mensagem-data">' + dataFormatada + '</span>';

    if (mensagem.prioridade === 'alta') {
        htmlDoCard = htmlDoCard + '<span class="badge-prioridade badge-alta">🔴 ALTA</span>';
    } else {
        htmlDoCard = htmlDoCard + '<span class="badge-prioridade badge-normal">🟢 Normal</span>';
    }

    htmlDoCard = htmlDoCard + '</div>';

    // Conteúdo da mensagem
    htmlDoCard = htmlDoCard + '<div class="mensagem-conteudo">' + escapeHtml(mensagem.conteudo) + '</div>';

    // Rodapé: tipo + remetente
    htmlDoCard = htmlDoCard + '<div class="mensagem-card-rodape">';
    htmlDoCard = htmlDoCard + '<span class="badge-tipo">' + iconeTipo + ' ' + mensagem.tipo + '</span>';
    htmlDoCard = htmlDoCard + '<span>Enviada por: ' + escapeHtml(mensagem.remetenteNome) + '</span>';
    htmlDoCard = htmlDoCard + '</div>';

    // Colocar o HTML dentro do card
    card.innerHTML = htmlDoCard;

    return card;
}

// ============================================================
// PASSO 14: Funções Auxiliares
// ============================================================

// Formatar uma data ISO para formato legível
// Ex: "2024-01-15T10:30:00.000Z" → "15/01/2024 10:30"
function formatarData(dataISO) {
    // Se a data não existe, devolver texto padrão
    if (!dataISO) {
        return 'Data desconhecida';
    }

    // Criar um objeto Date a partir da string ISO
    let data = new Date(dataISO);

    // Buscar cada parte da data
    let dia = data.getDate();
    let mes = data.getMonth() + 1; // getMonth() começa em 0, por isso +1
    let ano = data.getFullYear();
    let horas = data.getHours();
    let minutos = data.getMinutes();

    // Adicionar zero à esquerda se necessário (ex: 5 → "05")
    if (dia < 10) {
        dia = '0' + dia;
    }
    if (mes < 10) {
        mes = '0' + mes;
    }
    if (horas < 10) {
        horas = '0' + horas;
    }
    if (minutos < 10) {
        minutos = '0' + minutos;
    }

    // Juntar tudo no formato DD/MM/AAAA HH:MM
    return dia + '/' + mes + '/' + ano + ' ' + horas + ':' + minutos;
}

// Escapar HTML para prevenir injeção de código malicioso
// Substitui caracteres especiais por entidades HTML seguras
function escapeHtml(texto) {
    if (!texto) {
        return '';
    }
    let resultado = '';
    for (let i = 0; i < texto.length; i = i + 1) {
        let caracter = texto[i];
        if (caracter === '<') {
            resultado = resultado + '&lt;';
        } else if (caracter === '>') {
            resultado = resultado + '&gt;';
        } else if (caracter === '&') {
            resultado = resultado + '&amp;';
        } else if (caracter === '"') {
            resultado = resultado + '&quot;';
        } else {
            resultado = resultado + caracter;
        }
    }
    return resultado;
}

// ============================================================
// PASSO 15: Mostrar Lista de Mensagens num Container
// ============================================================
// Função genérica que recebe uma lista de mensagens e um
// ID de container, e cria os cards para cada mensagem.

function mostrarListaDeMensagens(mensagens, containerId) {
    let container = document.getElementById(containerId);

    // Limpar o conteúdo anterior
    container.innerHTML = '';

    // Se não há mensagens, mostrar texto de ajuda
    if (mensagens.length === 0) {
        container.innerHTML = '<p class="texto-ajuda">Nenhuma mensagem encontrada.</p>';
        return;
    }

    // Criar um card para cada mensagem
    for (let i = 0; i < mensagens.length; i = i + 1) {
        let card = criarCardDeMensagem(mensagens[i]);
        container.appendChild(card);
    }
}

// ============================================================
// PASSO 16: Histórico de Mensagens (com filtros)
// ============================================================

// Carregar o histórico de mensagens (sem filtros inicialmente)
function carregarHistorico() {
    // Construir a URL com os filtros (se existirem)
    let url = ENDERECO_SERVIDOR + '/messages';
    let filtros = [];

    let pesquisa = document.getElementById('filtro-pesquisa').value;
    let prioridade = document.getElementById('filtro-prioridade').value;
    let data = document.getElementById('filtro-data').value;

    // Adicionar filtros à URL
    if (pesquisa) {
        filtros.push('search=' + encodeURIComponent(pesquisa));
    }
    if (prioridade) {
        filtros.push('prioridade=' + prioridade);
    }
    if (data) {
        filtros.push('data=' + data);
    }

    // Se há filtros, adicioná-los à URL com '?'
    if (filtros.length > 0) {
        url = url + '?';
        for (let i = 0; i < filtros.length; i = i + 1) {
            if (i > 0) {
                url = url + '&';
            }
            url = url + filtros[i];
        }
    }

    // Fazer o pedido ao servidor
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + tokenDoUtilizador
        }
    })
    .then(function(resposta) {
        return resposta.json();
    })
    .then(function(mensagens) {
        mostrarListaDeMensagens(mensagens, 'historico-lista');
    })
    .then(undefined, function(erro) {
        let container = document.getElementById('historico-lista');
        container.innerHTML = '<p class="texto-ajuda">Erro ao carregar histórico.</p>';
    });
}

// Função chamada quando o utilizador clica "Pesquisar"
function pesquisarHistorico() {
    carregarHistorico();
}

// Função para limpar todos os filtros
function limparFiltros() {
    document.getElementById('filtro-pesquisa').value = '';
    document.getElementById('filtro-prioridade').value = '';
    document.getElementById('filtro-data').value = '';
    carregarHistorico();
}

// ============================================================
// PASSO 17: Gestão de Utilizadores
// ============================================================

// Carregar a lista de utilizadores do servidor
function carregarUtilizadores() {
    fetch(ENDERECO_SERVIDOR + '/users', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + tokenDoUtilizador
        }
    })
    .then(function(resposta) {
        return resposta.json();
    })
    .then(function(utilizadores) {
        let container = document.getElementById('utilizadores-lista');
        container.innerHTML = '';

        // Se não há utilizadores
        if (utilizadores.length === 0) {
            container.innerHTML = '<p class="texto-ajuda">Nenhum utilizador encontrado.</p>';
            return;
        }

        // Criar um card para cada utilizador
        for (let i = 0; i < utilizadores.length; i = i + 1) {
            let utilizador = utilizadores[i];

            // Criar o card
            let card = document.createElement('div');
            card.className = 'utilizador-card';

            // Escolher a classe do badge conforme o role
            let badgeClasse = 'badge-role badge-operador';
            let badgeTexto = '👤 Operador';
            if (utilizador.role === 'coordenador') {
                badgeClasse = 'badge-role badge-coordenador';
                badgeTexto = '👑 Coordenador';
            }

            // Construir o HTML do card
            let htmlCard = '';
            htmlCard = htmlCard + '<div class="utilizador-info">';
            htmlCard = htmlCard + '<span class="utilizador-nome">' + escapeHtml(utilizador.nome) + '</span>';
            htmlCard = htmlCard + '<span class="utilizador-detalhes">Username: ' + escapeHtml(utilizador.username) + '</span>';
            htmlCard = htmlCard + '</div>';
            htmlCard = htmlCard + '<span class="' + badgeClasse + '">' + badgeTexto + '</span>';

            card.innerHTML = htmlCard;
            container.appendChild(card);
        }
    })
    .then(undefined, function(erro) {
        let container = document.getElementById('utilizadores-lista');
        container.innerHTML = '<p class="texto-ajuda">Erro ao carregar utilizadores.</p>';
    });
}

// Criar um novo utilizador
function criarUtilizador() {
    // Buscar os valores do formulário
    let username = document.getElementById('novo-username').value;
    let password = document.getElementById('novo-password').value;
    let nome = document.getElementById('novo-nome').value;
    let role = document.getElementById('novo-role').value;
    let divFeedback = document.getElementById('criar-utilizador-feedback');

    // Verificar se os campos foram preenchidos
    if (!username || !password || !nome) {
        divFeedback.textContent = '❌ Todos os campos são obrigatórios.';
        divFeedback.style.color = '#DC3545';
        return;
    }

    // Enviar o pedido ao servidor
    let dadosUtilizador = JSON.stringify({
        username: username,
        password: password,
        nome: nome,
        role: role
    });

    fetch(ENDERECO_SERVIDOR + '/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + tokenDoUtilizador
        },
        body: dadosUtilizador
    })
    .then(function(resposta) {
        return resposta.json();
    })
    .then(function(dados) {
        if (dados.erro) {
            divFeedback.textContent = '❌ ' + dados.erro;
            divFeedback.style.color = '#DC3545';
            return;
        }

        // Sucesso! Limpar o formulário e recarregar a lista
        divFeedback.textContent = '✅ Utilizador "' + dados.nome + '" criado com sucesso!';
        divFeedback.style.color = '#28A745';

        document.getElementById('novo-username').value = '';
        document.getElementById('novo-password').value = '';
        document.getElementById('novo-nome').value = '';

        // Recarregar a lista de utilizadores
        carregarUtilizadores();
    })
    .then(undefined, function(erro) {
        divFeedback.textContent = '❌ Erro de ligação ao servidor.';
        divFeedback.style.color = '#DC3545';
    });
}

// ============================================================
// PASSO 18: Permitir login com a tecla Enter
// ============================================================
// Quando o utilizador pressiona Enter no campo de password,
// faz login automaticamente (sem precisar de clicar no botão).

document.addEventListener('keypress', function(evento) {
    // Verificar se a tecla pressionada é Enter (código 13)
    if (evento.key === 'Enter') {
        // Se estamos no ecrã de login (campo de password em foco)
        let campoPassword = document.getElementById('login-password');
        let campoUsername = document.getElementById('login-username');

        if (document.activeElement === campoPassword || document.activeElement === campoUsername) {
            fazerLogin();
        }
    }
});
