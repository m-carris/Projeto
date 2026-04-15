// ============================================================
// BASEDEDADOS.JS — A nossa "Base de Dados" em ficheiros JSON
// ============================================================
// Este ficheiro trata de GUARDAR e LER dados.
// Em vez de usar uma base de dados complicada (como PostgreSQL),
// usamos ficheiros JSON simples. Pensa neles como "cadernos"
// onde escrevemos e lemos informação.
//
// Temos 3 "cadernos" (ficheiros):
//   - utilizadores.json → Guarda os utilizadores (coordenadores e operadores)
//   - mensagens.json    → Guarda todas as mensagens enviadas
//   - templates.json    → Guarda os modelos de mensagens rápidas
//
// Cada ficheiro contém um array (lista) de objetos.
// ============================================================

// ------------------------------------------------------------
// Importar a ferramenta 'fs' (File System) do Node.js
// 'fs' permite ler e escrever ficheiros no computador
// É como ter uma "mão" que abre, lê, e escreve em cadernos
// ------------------------------------------------------------
const fs = require('fs');

// ------------------------------------------------------------
// Importar 'path' para construir caminhos de ficheiros
// Ajuda a encontrar os ficheiros certos independentemente
// do sistema operativo (Windows, Mac, Linux)
// ------------------------------------------------------------
const path = require('path');

// ------------------------------------------------------------
// Importar 'bcryptjs' para encriptar passwords
// Nunca guardamos passwords em texto normal!
// bcryptjs transforma "1234" em algo como "$2a$10$xK8f..."
// que é impossível de reverter
// ------------------------------------------------------------
const bcryptjs = require('bcryptjs');

// ============================================================
// PASSO 1: Definir onde estão os nossos "cadernos" (ficheiros)
// ============================================================
// __dirname é uma variável especial que diz "a pasta onde este ficheiro está"
// path.join junta pedaços de caminho. Ex: "/backend" + "/dados" + "/utilizadores.json"

// Caminho para o ficheiro dos utilizadores
const CAMINHO_UTILIZADORES = path.join(__dirname, 'dados', 'utilizadores.json');

// Caminho para o ficheiro das mensagens
const CAMINHO_MENSAGENS = path.join(__dirname, 'dados', 'mensagens.json');

// Caminho para o ficheiro dos templates
const CAMINHO_TEMPLATES = path.join(__dirname, 'dados', 'templates.json');

// ============================================================
// PASSO 2: Funções para LER dados dos ficheiros
// ============================================================
// Estas funções abrem o "caderno" e leem o que lá está escrito.
// Se o caderno não existir, devolvem uma lista vazia [].

// ------------------------------------------------------------
// Função: lerFicheiro
// O que faz: Lê um ficheiro JSON e devolve o seu conteúdo
// Parâmetro: caminhoDoFicheiro — o caminho completo do ficheiro
// Devolve: Um array (lista) com os dados do ficheiro
// ------------------------------------------------------------
function lerFicheiro(caminhoDoFicheiro) {
    // Tentar ler o ficheiro
    // Se o ficheiro não existir, vai dar erro e devolvemos []
    try {
        // fs.readFileSync lê o ficheiro TODO de uma vez
        // 'utf8' diz que o ficheiro é texto normal (não binário)
        let conteudoDoFicheiro = fs.readFileSync(caminhoDoFicheiro, 'utf8');

        // JSON.parse transforma o texto do ficheiro num objeto JavaScript
        // Ex: '["a","b"]' (texto) → ["a","b"] (array real)
        let dados = JSON.parse(conteudoDoFicheiro);

        // Devolver os dados lidos
        return dados;
    } catch (erro) {
        // Se houve algum erro (ficheiro não existe, JSON inválido, etc.)
        // Devolvemos uma lista vazia — é como um caderno em branco
        return [];
    }
}

// ------------------------------------------------------------
// Função: escreverFicheiro
// O que faz: Escreve dados num ficheiro JSON
// Parâmetros:
//   - caminhoDoFicheiro — onde guardar
//   - dados — o que guardar (um array de objetos)
// ------------------------------------------------------------
function escreverFicheiro(caminhoDoFicheiro, dados) {
    // JSON.stringify transforma o objeto JavaScript em texto JSON
    // O 'null' e '2' fazem o JSON ficar "bonito" (com indentação)
    // para ser fácil de ler se abrirmos o ficheiro manualmente
    let textoJSON = JSON.stringify(dados, null, 2);

    // fs.writeFileSync escreve o texto no ficheiro
    // Se o ficheiro já existir, é substituído completamente
    // Se não existir, é criado automaticamente
    fs.writeFileSync(caminhoDoFicheiro, textoJSON, 'utf8');
}

// ============================================================
// PASSO 3: Funções específicas para cada "caderno"
// ============================================================

// ---- UTILIZADORES ----

// Ler todos os utilizadores do ficheiro
function lerUtilizadores() {
    return lerFicheiro(CAMINHO_UTILIZADORES);
}

// Guardar a lista completa de utilizadores no ficheiro
function guardarUtilizadores(listaDeUtilizadores) {
    escreverFicheiro(CAMINHO_UTILIZADORES, listaDeUtilizadores);
}

// ---- MENSAGENS ----

// Ler todas as mensagens do ficheiro
function lerMensagens() {
    return lerFicheiro(CAMINHO_MENSAGENS);
}

// Guardar a lista completa de mensagens no ficheiro
function guardarMensagens(listaDeMensagens) {
    escreverFicheiro(CAMINHO_MENSAGENS, listaDeMensagens);
}

// ---- TEMPLATES ----

// Ler todos os templates do ficheiro
function lerTemplates() {
    return lerFicheiro(CAMINHO_TEMPLATES);
}

// Guardar a lista completa de templates no ficheiro
function guardarTemplates(listaDeTemplates) {
    escreverFicheiro(CAMINHO_TEMPLATES, listaDeTemplates);
}

// ============================================================
// PASSO 4: Função para encontrar o próximo ID
// ============================================================
// Cada utilizador, mensagem e template tem um "id" único
// (como um número de bilhete de identidade).
// Esta função encontra o maior ID na lista e devolve o próximo.
// Ex: Se o maior ID é 5, devolve 6.

function proximoId(lista) {
    // Se a lista está vazia, o primeiro ID é 1
    if (lista.length === 0) {
        return 1;
    }

    // Procurar o maior ID na lista usando um ciclo for
    let maiorId = 0;
    for (let i = 0; i < lista.length; i = i + 1) {
        // Se o ID deste item é maior que o maior encontrado até agora
        if (lista[i].id > maiorId) {
            // Atualizar o maior ID
            maiorId = lista[i].id;
        }
    }

    // Devolver o maior ID + 1 (o próximo número disponível)
    return maiorId + 1;
}

// ============================================================
// PASSO 5: Inicializar os dados (criar dados padrão)
// ============================================================
// Esta função é chamada quando o servidor arranca pela primeira vez.
// Se os ficheiros não existem ou estão vazios, cria dados iniciais:
// - 2 utilizadores padrão (coordenador e operador)
// - 4 templates padrão (Acidente, Trânsito, Avaria, Desvio)

function inicializarDados() {
    // Verificar se a pasta 'dados' existe; se não, criá-la
    let pastaDados = path.join(__dirname, 'dados');
    if (!fs.existsSync(pastaDados)) {
        fs.mkdirSync(pastaDados);
    }

    // ---- Inicializar UTILIZADORES ----
    let utilizadores = lerUtilizadores();

    // Se não há utilizadores, criar os utilizadores padrão
    if (utilizadores.length === 0) {
        // Encriptar as passwords antes de guardar
        // bcryptjs.hashSync transforma a password num "hash" seguro
        // O número 10 é o "custo" da encriptação (quanto maior, mais seguro mas mais lento)
        let passwordCoordenador = bcryptjs.hashSync('1234', 10);
        let passwordOperador = bcryptjs.hashSync('1234', 10);

        // Criar o utilizador coordenador
        let coordenador = {
            id: 1,
            username: 'coordenador',
            password: passwordCoordenador,
            role: 'coordenador',
            nome: 'João Silva (Coordenador)'
        };

        // Criar o utilizador operador
        let operador = {
            id: 2,
            username: 'operador',
            password: passwordOperador,
            role: 'operador',
            nome: 'Maria Santos (Operadora)'
        };

        // Guardar os dois utilizadores no ficheiro
        guardarUtilizadores([coordenador, operador]);

        // Mostrar no terminal que os utilizadores foram criados
        console.log('✅ Utilizadores padrão criados:');
        console.log('   Coordenador → username: coordenador | password: 1234');
        console.log('   Operador    → username: operador    | password: 1234');
    }

    // ---- Inicializar MENSAGENS ----
    let mensagens = lerMensagens();

    // Se não há mensagens, criar o ficheiro vazio
    if (mensagens.length === 0) {
        guardarMensagens([]);
        console.log('✅ Ficheiro de mensagens criado (vazio).');
    }

    // ---- Inicializar TEMPLATES ----
    let templates = lerTemplates();

    // Se não há templates, criar os templates padrão
    if (templates.length === 0) {
        // Template 1: Acidente
        let templateAcidente = {
            id: 1,
            nome: 'Acidente',
            conteudo: 'Atenção: acidente reportado na zona. Proceder com cuidado e seguir desvios indicados.',
            prioridade: 'alta',
            tipo: 'acidente',
            ativo: true
        };

        // Template 2: Trânsito Intenso
        let templateTransito = {
            id: 2,
            nome: 'Trânsito Intenso',
            conteudo: 'Aviso: trânsito intenso na zona. Possíveis atrasos nas carreiras.',
            prioridade: 'normal',
            tipo: 'transito',
            ativo: true
        };

        // Template 3: Avaria
        let templateAvaria = {
            id: 3,
            nome: 'Avaria',
            conteudo: 'Informação: viatura com avaria reportada. Aguardar instruções de substituição.',
            prioridade: 'alta',
            tipo: 'avaria',
            ativo: true
        };

        // Template 4: Desvio
        let templateDesvio = {
            id: 4,
            nome: 'Desvio',
            conteudo: 'Atenção: desvio em vigor na zona. Seguir percurso alternativo indicado.',
            prioridade: 'normal',
            tipo: 'desvio',
            ativo: true
        };

        // Guardar todos os templates no ficheiro
        guardarTemplates([templateAcidente, templateTransito, templateAvaria, templateDesvio]);

        console.log('✅ Templates padrão criados (Acidente, Trânsito, Avaria, Desvio).');
    }

    console.log('📂 Base de dados inicializada com sucesso!');
}

// ============================================================
// PASSO 6: Exportar as funções para outros ficheiros usarem
// ============================================================
// module.exports é como "publicar" as funções deste ficheiro
// para que o servidor.js as possa usar.
// É como pôr as ferramentas num expositor para outros as usarem.

module.exports = {
    lerUtilizadores: lerUtilizadores,
    guardarUtilizadores: guardarUtilizadores,
    lerMensagens: lerMensagens,
    guardarMensagens: guardarMensagens,
    lerTemplates: lerTemplates,
    guardarTemplates: guardarTemplates,
    proximoId: proximoId,
    inicializarDados: inicializarDados
};
