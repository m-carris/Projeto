# 📚 GUIÃO DE APRENDIZAGEM — Sistema de Notificações Carris

> **Objetivo:** Este guião vai guiar-te a recriar este projeto do zero, passo a passo.
> No final, vais ter um sistema completo de notificações em tempo real com backend, backoffice e extensão de browser.

---

## 1. Introdução

### O que faz este projeto?

Este é um **Sistema de Notificações em Tempo Real para a Carris**. Permite que um **coordenador** envie mensagens/avisos para os **operadores de tráfego** instantaneamente. Pensa nele como um sistema de avisos interno: quando há um acidente, trânsito intenso, avaria ou desvio, o coordenador escreve uma mensagem e todos os operadores recebem imediatamente.

O sistema tem **3 peças**:

1. **Backend (Servidor)** — O "cérebro" que recebe pedidos, guarda dados e envia notificações
2. **Backoffice (Página Web)** — A interface que o coordenador usa para enviar mensagens
3. **Extensão de Browser** — Instalada nos computadores dos operadores para receberem notificações

### Stack Tecnológica

| Componente     | Tecnologia                              |
|----------------|-----------------------------------------|
| Backend        | Node.js + Express + Socket.io           |
| Backoffice     | HTML + CSS + JavaScript (puro, sem frameworks) |
| Extensão       | Chrome Extension Manifest V3            |
| Base de dados  | Ficheiros JSON (sem base de dados externa) |
| Autenticação   | JWT (JSON Web Tokens)                   |
| Passwords      | bcryptjs (encriptação segura)           |

### Pré-requisitos

Antes de começar, precisas de ter instalado:

- **Node.js** (versão 18 ou superior) — [Descarregar aqui](https://nodejs.org/)
- **Google Chrome** ou **Microsoft Edge** (para testar a extensão)
- Um **editor de código** (recomendado: VS Code — [Descarregar aqui](https://code.visualstudio.com/))
- **Git** (opcional, para clonar o repositório) — [Descarregar aqui](https://git-scm.com/)

Para verificar se tens o Node.js instalado, abre o terminal e escreve:

```bash
node --version
```

Se aparecer algo como `v18.17.0` ou superior, está tudo bem.

---

## 2. Visão Geral da Arquitetura

### Diagrama de Comunicação

```
 ┌─────────────────────────┐
 │  COORDENADOR             │
 │  (Backoffice - Browser)  │
 │                          │
 │  1. Escreve mensagem     │
 │  2. Clica "Enviar"       │
 └──────────┬───────────────┘
            │
            │  POST /messages (HTTP)
            ▼
 ┌──────────────────────────┐
 │  SERVIDOR (Backend)       │
 │                           │
 │  3. Recebe a mensagem     │
 │  4. Guarda no ficheiro    │
 │  5. Envia notificação     │
 │     push via Web Push     │
 └──────────┬────────────────┘
            │
            │  Web Push (instantâneo)
            ▼
 ┌──────────────────────────┐
 │  OPERADORES               │
 │  (Extensão de Browser)    │
 │                           │
 │  6. Recebem a notificação │
 │     push instantaneamente │
 │  7. Veem notificação push │
 │  8. Consultam no popup    │
 └───────────────────────────┘
```

### Três canais de comunicação

- **HTTP (REST API):** Para enviar dados (login, criar mensagens, buscar histórico). É como enviar uma carta — pedimos e esperamos resposta.
- **Socket.io (WebSocket):** Para notificações em tempo real no backoffice. É como um walkie-talkie — quando o servidor tem algo novo, avisa imediatamente.
- **Web Push (Extensão):** Quando o servidor cria uma nova mensagem, envia instantaneamente uma notificação push para todos os operadores registados, usando a biblioteca `web-push` com chaves VAPID. O operador recebe a notificação de imediato, mesmo que o browser não esteja com a página aberta.

### Estrutura de Pastas e Ficheiros

```
Projeto/
├── backend/                    ← O servidor (Node.js)
│   ├── package.json            ← Dependências do projeto (o que instalar)
│   ├── servidor.js             ← Ficheiro principal do servidor (rotas, lógica)
│   ├── basededados.js          ← Funções para ler/escrever ficheiros JSON
│   └── dados/                  ← "Base de dados" (ficheiros JSON)
│       ├── utilizadores.json   ← Lista de utilizadores
│       ├── mensagens.json      ← Lista de mensagens enviadas
│       └── templates.json      ← Lista de mensagens rápidas
│
├── backoffice/                 ← Interface web do coordenador
│   ├── index.html              ← Página HTML principal (estrutura)
│   ├── estilo.css              ← Estilos visuais (cores, layouts)
│   └── aplicacao.js            ← Toda a lógica JavaScript do backoffice
│
├── extension/                  ← Extensão Chrome/Edge dos operadores
│   ├── manifest.json           ← "Bilhete de identidade" da extensão
│   ├── popup/                  ← Janela que abre ao clicar no ícone
│   │   ├── popup.html          ← Estrutura HTML do popup
│   │   ├── popup.css           ← Estilos do popup
│   │   └── popup.js            ← Lógica do popup
│   ├── background/             ← Script que corre em segundo plano
│   │   └── service-worker.js   ← Verificação periódica + notificações push
│   └── assets/icons/           ← Ícones da extensão
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── .gitignore                  ← Ficheiros a ignorar pelo Git
├── README.md                   ← Documentação geral do projeto
└── estagio.md                  ← Briefing original do estágio
```

### Função de cada ficheiro principal

| Ficheiro | O que faz |
|----------|-----------|
| `backend/package.json` | Lista as dependências (Express, Socket.io, JWT, bcryptjs, web-push) e o script de arranque |
| `backend/servidor.js` | O ficheiro principal — cria o servidor, define rotas da API, liga o Socket.io, configura Web Push e envia notificações instantâneas |
| `backend/basededados.js` | Funções para ler/escrever nos ficheiros JSON (a nossa "base de dados") |
| `backoffice/index.html` | A estrutura HTML da página do coordenador (login, formulário, histórico) |
| `backoffice/estilo.css` | Todos os estilos visuais com a paleta de cores Carris |
| `backoffice/aplicacao.js` | Toda a lógica: login, envio de mensagens, templates, histórico, Socket.io |
| `extension/manifest.json` | Configuração da extensão: permissões, ícones, scripts |
| `extension/popup/popup.js` | Lógica do popup: login do operador, mostrar mensagens |
| `extension/background/service-worker.js` | Recebe notificações push instantaneamente via Web Push + mostra notificações |

---

## 3. Passos de Construção (Step by Step)

---

### Passo 1 — Criar a estrutura de pastas do projeto

Antes de escrever código, precisamos de criar a estrutura de pastas. Abre o terminal e executa:

```bash
mkdir Projeto
cd Projeto
mkdir backend
mkdir -p backend/dados
mkdir backoffice
mkdir -p extension/popup
mkdir -p extension/background
mkdir -p extension/assets/icons
```

Isto cria todas as pastas vazias que vamos preencher nos passos seguintes.

✅ **O que conseguiste neste passo:** Criaste a estrutura de pastas base do projeto, pronta para receber os ficheiros.

---

### Passo 2 — Criar o ficheiro de dependências do backend (`backend/package.json`)

Este ficheiro diz ao Node.js quais as bibliotecas (pacotes) que o nosso servidor precisa.

Cria o ficheiro `backend/package.json` com o seguinte conteúdo:

```json
{
  "name": "notificacoes-backend",
  "version": "1.0.0",
  "description": "Backend do Sistema de Notificações do Coordenador — Servidor Express + Socket.io",
  "main": "servidor.js",
  "scripts": {
    "start": "node servidor.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "socket.io": "^4.7.4",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "web-push": "^3.6.7"
  }
}
```

**Explicação linha a linha:**

- `"name"` — O nome do projeto. Pode ser qualquer nome, sem espaços.
- `"version"` — A versão do projeto. Usamos o formato `MAJOR.MINOR.PATCH`.
- `"description"` — Uma descrição breve do que o projeto faz.
- `"main"` — O ficheiro principal que o Node.js vai executar.
- `"scripts"` → `"start"` — Define que `npm start` vai correr `node servidor.js`.
- `"dependencies"` — As bibliotecas externas que precisamos:
  - **express** — Framework para criar o servidor web (receber pedidos HTTP).
  - **cors** — Permite que o backoffice e a extensão falem com o servidor (Cross-Origin Resource Sharing).
  - **socket.io** — Comunicação em tempo real via WebSocket.
  - **jsonwebtoken** — Criar e verificar tokens JWT para autenticação.
  - **bcryptjs** — Encriptar passwords de forma segura.
  - **web-push** — Enviar notificações push instantaneamente para os browsers dos operadores, usando o protocolo Web Push com chaves VAPID.

Agora instala as dependências. No terminal, dentro da pasta `backend`:

```bash
cd backend
npm install
```

Isto cria a pasta `node_modules/` com todas as bibliotecas.

✅ **O que conseguiste neste passo:** Configuraste as dependências do backend e instalaste todas as bibliotecas necessárias.

---

### Passo 3 — Criar o ficheiro `.gitignore`

Este ficheiro diz ao Git quais ficheiros/pastas **não** devem ser incluídos no repositório (porque são gerados automaticamente ou contêm informação sensível).

Cria o ficheiro `.gitignore` na raiz do projeto:

```
# Ficheiros e pastas a ignorar pelo Git
node_modules/
dist/
.env
*.log
.DS_Store
Thumbs.db
```

**Explicação:**

- `node_modules/` — Pasta com as bibliotecas instaladas. É enorme e é gerada pelo `npm install`.
- `dist/` — Pasta de ficheiros compilados (se existir).
- `.env` — Ficheiro de variáveis de ambiente (pode conter segredos).
- `*.log` — Ficheiros de log gerados pelo Node.js.
- `.DS_Store` e `Thumbs.db` — Ficheiros de sistema do macOS e Windows.

✅ **O que conseguiste neste passo:** Configuraste o Git para ignorar ficheiros desnecessários.

---

### Passo 4 — Criar a "Base de Dados" em ficheiros JSON (`backend/basededados.js`)

Este ficheiro trata de guardar e ler dados. Em vez de usar uma base de dados complicada como PostgreSQL, usamos ficheiros JSON simples. Pensa neles como "cadernos" onde escrevemos e lemos informação.

Cria o ficheiro `backend/basededados.js`:

```js
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
```

**Explicação dos conceitos-chave:**

- **`require()`** — Importa módulos/bibliotecas. É como ir buscar uma ferramenta à caixa.
- **`fs` (File System)** — Módulo do Node.js para ler e escrever ficheiros no disco.
- **`path`** — Módulo para construir caminhos de ficheiros de forma compatível com todos os sistemas operativos.
- **`__dirname`** — Variável especial do Node.js que diz "a pasta onde este ficheiro está".
- **`try/catch`** — Bloco que tenta executar código. Se der erro, o `catch` apanha o erro e podemos reagir.
- **`JSON.parse()`** — Converte texto JSON num objeto JavaScript.
- **`JSON.stringify()`** — Converte um objeto JavaScript em texto JSON.
- **`bcryptjs.hashSync()`** — Encripta uma password de forma irreversível. Nunca guardamos passwords em texto.
- **`module.exports`** — "Publica" funções para outros ficheiros usarem com `require()`.

✅ **O que conseguiste neste passo:** Criaste o módulo de base de dados que sabe ler, escrever e inicializar os dados do sistema.

---

### Passo 5 — Criar o servidor principal (`backend/servidor.js`)

Este é o ficheiro mais importante — o "coração" do backend. Cria o servidor web, define as rotas da API e liga o Socket.io.

Cria o ficheiro `backend/servidor.js`:

```js
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

// web-push permite enviar notificações push para os browsers
// dos operadores de forma instantânea, usando chaves VAPID
const webpush = require('web-push');

// fs (File System) é um módulo do Node.js para ler e escrever ficheiros
// Usamos para guardar as subscrições push dos operadores num ficheiro
const fs = require('fs');

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
// PASSO 5.1: Configuração Web Push (VAPID) + Subscrições
// ============================================================
// Web Push permite enviar notificações instantâneas para os
// browsers dos operadores, sem precisar de polling.
//
// VAPID (Voluntary Application Server Identification) autentica
// o nosso servidor junto dos serviços de push dos browsers.
//
// Para gerar as tuas próprias chaves VAPID, corre no terminal:
//   npx web-push generate-vapid-keys

const publicVapidKey = 'BHyQ6qiwF5mpl_353Mx2Hlt56MjNihxrOj3c8uxqj7kUYUQ58vwC7vqCBOswVi4nHlPmoiS8Ikvnn5yZxNSZgF4';
const privateVapidKey = '8wDckGrV1qCHnb5yEyGm-WGKfOzbv7XUsANNn3R8DNQ';

webpush.setVapidDetails('mailto:goncalo.alberto@carris.pt', publicVapidKey, privateVapidKey);

// Ficheiro onde guardamos as subscrições push dos operadores
const subscriptionsFile = path.join(__dirname, 'subscriptions.json');

// Carregar subscrições existentes ao arrancar o servidor
function loadSubscriptions() {
    if (fs.existsSync(subscriptionsFile)) {
        try {
            let data = fs.readFileSync(subscriptionsFile, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error('Erro ao ler subscrições:', err);
            return [];
        }
    }
    return [];
}

// Guardar subscrições no ficheiro
function saveSubscriptions(subs) {
    try {
        fs.writeFileSync(subscriptionsFile, JSON.stringify(subs, null, 2));
    } catch (err) {
        console.error('Erro ao guardar subscrições:', err);
    }
}

let subscriptions = loadSubscriptions();

// ---- POST /subscribe ----
// O que faz: Regista a subscrição push de um operador
// Quando um operador ativa as notificações na extensão,
// o browser gera uma subscrição push e envia-a para este endpoint.
// O servidor guarda-a para poder enviar notificações depois.
app.post('/subscribe', function(req, res) {
    let subscription = req.body;
    subscriptions.push(subscription);
    saveSubscriptions(subscriptions);
    console.log('🔔 Nova subscrição push registada');
    res.status(201).json({});
});

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

    // Verificar se o cabeçalho tem pelo menos 2 partes (Bearer + token)
    // Se não tem, o formato é inválido
    if (partes.length < 2) {
        res.status(401).json({ erro: 'Formato do token inválido.' });
        return;
    }

    // A segunda parte (índice 1) é o token propriamente dito
    let token = partes[1];

    // Se o token está vazio, o formato é inválido
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

    // *** NOTIFICAÇÕES PUSH INSTANTÂNEAS ***
    // Além do Socket.io, enviamos também uma notificação push
    // para todos os operadores registados via Web Push.
    // Isto garante que os operadores recebem a notificação
    // instantaneamente, mesmo que não estejam com a página aberta.
    let pushPayload = JSON.stringify({
        title: 'Nova mensagem: ' + tipo,
        body: conteudo
    });

    subscriptions.forEach(function(sub) {
        webpush.sendNotification(sub, pushPayload)
            .catch(function(err) { console.error('Erro no push:', err); });
    });

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
```

**Conceitos-chave aprendidos neste passo:**

- **Express** — Framework que cria um servidor web capaz de receber pedidos HTTP (GET, POST, PATCH, DELETE).
- **Rota** — Uma URL no servidor que responde a um tipo de pedido. Ex: `POST /auth/login` é a rota de login.
- **Middleware** — Função que corre ANTES da rota principal. Ex: `verificarToken` verifica se o utilizador está autenticado.
- **JWT (JSON Web Token)** — Token que o utilizador recebe ao fazer login. Em cada pedido seguinte, envia esse token para provar quem é.
- **Socket.io** — Biblioteca que permite comunicação bidirecional em tempo real. O servidor pode "empurrar" dados para os clientes sem eles pedirem.
- **`io.emit('nova-mensagem', dados)`** — Envia uma mensagem para TODOS os clientes conectados via Socket.io.
- **Web Push + VAPID** — Protocolo que permite ao servidor enviar notificações instantâneas para os browsers dos operadores, mesmo que a página não esteja aberta. As chaves VAPID autenticam o servidor.
- **`webpush.sendNotification()`** — Envia uma notificação push para um browser específico usando a sua subscrição.
- **Soft Delete** — Em vez de apagar dados de verdade, marcamos como `ativo: false`. Isto permite recuperar dados se necessário.

✅ **O que conseguiste neste passo:** Criaste o servidor completo com todas as rotas da API, autenticação JWT, comunicação em tempo real via Socket.io, e notificações push instantâneas via Web Push.

---

### Passo 6 — Criar a página HTML do Backoffice (`backoffice/index.html`)

Esta é a interface web que o coordenador usa. É uma página única (Single Page) onde mostramos e escondemos secções conforme o estado.

Cria o ficheiro `backoffice/index.html`:

```html
<!-- ==========================================================
  INDEX.HTML — Página Principal do Backoffice (Coordenador)
  ==========================================================
  Esta é a interface web que o coordenador usa para:
  - Fazer login
  - Enviar mensagens para os operadores
  - Usar templates de mensagens rápidas
  - Consultar o histórico de mensagens enviadas
  
  É uma página única (Single Page) — mostramos e escondemos
  secções conforme o estado (logado ou não logado).
  ========================================================== -->

<!DOCTYPE html>
<html lang="pt">
<head>
    <!-- Definir a codificação de caracteres (para acentos funcionarem) -->
    <meta charset="UTF-8">

    <!-- Tornar a página responsiva (adaptar-se ao ecrã) -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Título que aparece no separador do browser -->
    <title>Carris — Backoffice de Notificações</title>

    <!-- Ligar o nosso ficheiro de estilos CSS -->
    <link rel="stylesheet" href="estilo.css">
</head>
<body>

    <!-- ============================================================ -->
    <!-- SECÇÃO 1: ECRÃ DE LOGIN                                      -->
    <!-- Esta secção aparece quando o utilizador NÃO está logado       -->
    <!-- ============================================================ -->
    <div id="secao-login">
        <!-- Caixa central do login -->
        <div id="login-caixa">
            <!-- Logo / Título -->
            <div id="login-cabecalho">
                <div id="login-logo">🚌</div>
                <h1>Carris</h1>
                <p>Sistema de Notificações</p>
                <p id="login-subtitulo">Backoffice do Coordenador</p>
            </div>

            <!-- Formulário de Login -->
            <div id="login-formulario">
                <!-- Campo do Username -->
                <div class="campo-formulario">
                    <label for="login-username">Utilizador</label>
                    <input type="text" id="login-username" placeholder="Ex: coordenador">
                </div>

                <!-- Campo da Password -->
                <div class="campo-formulario">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" placeholder="Ex: 1234">
                </div>

                <!-- Mensagem de erro (escondida por padrão) -->
                <div id="login-erro" class="mensagem-erro"></div>

                <!-- Botão de Entrar -->
                <button id="login-botao" onclick="fazerLogin()">Entrar</button>
            </div>

            <!-- Dica para utilizadores de teste -->
            <div id="login-dica">
                <p><strong>Contas de teste:</strong></p>
                <p>Coordenador: <code>coordenador</code> / <code>1234</code></p>
                <p>Operador: <code>operador</code> / <code>1234</code></p>
            </div>
        </div>
    </div>

    <!-- ============================================================ -->
    <!-- SECÇÃO 2: PAINEL PRINCIPAL (após login)                       -->
    <!-- Esta secção só aparece DEPOIS do login bem-sucedido           -->
    <!-- Inicialmente está escondida (display: none no CSS)            -->
    <!-- ============================================================ -->
    <div id="secao-principal" style="display: none;">

        <!-- ---- BARRA DE NAVEGAÇÃO (topo) ---- -->
        <div id="barra-navegacao">
            <div id="nav-esquerda">
                <span id="nav-logo">🚌</span>
                <span id="nav-titulo">Carris — Notificações</span>
            </div>
            <div id="nav-centro">
                <!-- Botões de navegação entre páginas -->
                <button class="nav-botao nav-botao-ativo" id="nav-btn-enviar" onclick="mudarPagina('enviar')">
                    📢 Enviar Mensagem
                </button>
                <button class="nav-botao" id="nav-btn-historico" onclick="mudarPagina('historico')">
                    📜 Histórico
                </button>
                <button class="nav-botao" id="nav-btn-utilizadores" onclick="mudarPagina('utilizadores')">
                    👥 Utilizadores
                </button>
            </div>
            <div id="nav-direita">
                <!-- Indicador de conexão WebSocket -->
                <span id="indicador-conexao" class="indicador-desconectado">
                    🔴 Desconectado
                </span>
                <!-- Nome do utilizador e botão de sair -->
                <span id="nav-nome-utilizador"></span>
                <button id="nav-botao-sair" onclick="fazerLogout()">Sair</button>
            </div>
        </div>

        <!-- ---- CONTEÚDO PRINCIPAL ---- -->
        <div id="conteudo-principal">

            <!-- PÁGINA: ENVIAR MENSAGEM -->
            <div id="pagina-enviar" class="pagina">
                <div id="enviar-layout">
                    <!-- Coluna Esquerda: Formulário de Envio -->
                    <div id="enviar-formulario-area">
                        <h2>📢 Enviar Nova Mensagem</h2>

                        <!-- Templates / Mensagens Rápidas -->
                        <div id="templates-area">
                            <h3>⚡ Mensagens Rápidas</h3>
                            <p class="texto-ajuda">Clica num botão para preencher automaticamente:</p>
                            <div id="templates-botoes">
                                <p id="templates-loading">A carregar templates...</p>
                            </div>
                        </div>

                        <!-- Formulário da Mensagem -->
                        <div id="formulario-mensagem">
                            <div class="campo-formulario">
                                <label for="mensagem-conteudo">Mensagem</label>
                                <textarea id="mensagem-conteudo" rows="4" placeholder="Escreve a mensagem aqui..."></textarea>
                            </div>

                            <div class="campo-formulario">
                                <label>Prioridade</label>
                                <div id="prioridade-opcoes">
                                    <button class="prioridade-botao prioridade-selecionada" id="prioridade-normal" onclick="selecionarPrioridade('normal')">
                                        🟢 Normal
                                    </button>
                                    <button class="prioridade-botao" id="prioridade-alta" onclick="selecionarPrioridade('alta')">
                                        🔴 Alta (Urgente)
                                    </button>
                                </div>
                            </div>

                            <div class="campo-formulario">
                                <label for="mensagem-tipo">Tipo</label>
                                <select id="mensagem-tipo">
                                    <option value="geral">Geral</option>
                                    <option value="acidente">Acidente</option>
                                    <option value="transito">Trânsito</option>
                                    <option value="avaria">Avaria</option>
                                    <option value="desvio">Desvio</option>
                                </select>
                            </div>

                            <div class="campo-formulario">
                                <label for="mensagem-destinatario">Destinatário</label>
                                <select id="mensagem-destinatario">
                                    <option value="todos">Todos os Operadores</option>
                                </select>
                            </div>

                            <div id="enviar-feedback"></div>

                            <button id="botao-enviar" onclick="enviarMensagem()">
                                📤 Enviar Mensagem
                            </button>
                        </div>
                    </div>

                    <!-- Coluna Direita: Últimas Mensagens Enviadas -->
                    <div id="ultimas-mensagens-area">
                        <h2>📨 Últimas Mensagens</h2>
                        <div id="ultimas-mensagens-lista">
                            <p class="texto-ajuda">Nenhuma mensagem enviada ainda.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PÁGINA: HISTÓRICO DE MENSAGENS -->
            <div id="pagina-historico" class="pagina" style="display: none;">
                <h2>📜 Histórico de Mensagens</h2>
                <div id="historico-filtros">
                    <div class="filtro-campo">
                        <label for="filtro-pesquisa">🔍 Pesquisar</label>
                        <input type="text" id="filtro-pesquisa" placeholder="Procurar no texto...">
                    </div>
                    <div class="filtro-campo">
                        <label for="filtro-prioridade">📊 Prioridade</label>
                        <select id="filtro-prioridade">
                            <option value="">Todas</option>
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>
                    <div class="filtro-campo">
                        <label for="filtro-data">📅 Data</label>
                        <input type="date" id="filtro-data">
                    </div>
                    <button id="botao-filtrar" onclick="pesquisarHistorico()">Pesquisar</button>
                    <button id="botao-limpar-filtros" onclick="limparFiltros()">Limpar</button>
                </div>
                <div id="historico-lista">
                    <p class="texto-ajuda">Usa os filtros acima para pesquisar mensagens.</p>
                </div>
            </div>

            <!-- PÁGINA: GESTÃO DE UTILIZADORES -->
            <div id="pagina-utilizadores" class="pagina" style="display: none;">
                <h2>👥 Gestão de Utilizadores</h2>
                <div id="criar-utilizador-area">
                    <h3>➕ Criar Novo Utilizador</h3>
                    <div id="criar-utilizador-formulario">
                        <div class="campo-formulario-inline">
                            <input type="text" id="novo-username" placeholder="Username">
                            <input type="password" id="novo-password" placeholder="Password">
                            <input type="text" id="novo-nome" placeholder="Nome completo">
                            <select id="novo-role">
                                <option value="operador">Operador</option>
                                <option value="coordenador">Coordenador</option>
                            </select>
                            <button onclick="criarUtilizador()">Criar</button>
                        </div>
                        <div id="criar-utilizador-feedback"></div>
                    </div>
                </div>
                <div id="utilizadores-lista">
                    <p class="texto-ajuda">A carregar utilizadores...</p>
                </div>
            </div>

        </div><!-- fim conteudo-principal -->

    </div><!-- fim secao-principal -->

    <!-- ============================================================ -->
    <!-- SCRIPTS                                                       -->
    <!-- Carregar o Socket.io (para mensagens em tempo real)           -->
    <!-- O Socket.io é servido automaticamente pelo backend            -->
    <!-- ============================================================ -->
    <script src="/socket.io/socket.io.js"></script>

    <!-- Carregar o nosso JavaScript principal -->
    <script src="aplicacao.js"></script>

</body>
</html>
```

**Explicação dos conceitos-chave:**

- **`<!DOCTYPE html>`** — Diz ao browser que este é um documento HTML5.
- **`<meta charset="UTF-8">`** — Define a codificação para suportar acentos e caracteres especiais.
- **`<meta name="viewport">`** — Torna a página responsiva (adapta-se a ecrãs de diferentes tamanhos).
- **`<div id="secao-login">` e `<div id="secao-principal">`** — As duas "telas" da aplicação. Só uma é visível de cada vez.
- **`style="display: none;"`** — Esconde um elemento visualmente. Usamos JavaScript para mostrar/esconder.
- **`onclick="fazerLogin()"`** — Quando o utilizador clica no botão, chama a função `fazerLogin()` definida em `aplicacao.js`.
- **`<script src="/socket.io/socket.io.js">`** — Carrega a biblioteca Socket.io, que é servida automaticamente pelo backend.

✅ **O que conseguiste neste passo:** Criaste a estrutura HTML completa do backoffice com login, formulário de envio, histórico e gestão de utilizadores.

---

### Passo 7 — Criar os estilos CSS do Backoffice (`backoffice/estilo.css`)

Este ficheiro define toda a aparência visual do backoffice, usando a paleta de cores oficial da Carris.

Cria o ficheiro `backoffice/estilo.css` copiando o código original do repositório em `backoffice/estilo.css`.

O ficheiro é extenso mas está organizado em secções claras:

1. **Reset básico** — Remove margens e paddings padrão do browser.
2. **Secção de Login** — Fundo escuro, caixa branca centrada, botão amarelo Carris.
3. **Barra de Navegação** — Barra preta fixa no topo com logo amarelo e botões de navegação.
4. **Conteúdo Principal** — Layout de duas colunas para a página de envio.
5. **Templates** — Botões de mensagens rápidas com cores diferentes por prioridade.
6. **Cards de Mensagem** — Cartões visuais com borda esquerda colorida conforme a prioridade.
7. **Histórico** — Filtros em linha e lista de mensagens.
8. **Utilizadores** — Formulário inline e cards de utilizador.
9. **Responsividade** — Media query para ecrãs pequenos (tablets/telemóveis).

**Paleta de cores Carris:**

| Cor | Código | Uso |
|-----|--------|-----|
| Amarelo Carris | `#FFD200` | Cor principal, botões, destaques |
| Preto Carris | `#1D1D1B` | Navbar, textos principais |
| Branco | `#FFFFFF` | Fundos de cards e formulários |
| Cinzento Claro | `#F5F5F5` | Fundo da página |
| Vermelho Alta | `#DC3545` | Prioridade alta |
| Verde | `#28A745` | Indicador de conexão |

**Conceitos-chave:**

- **`box-sizing: border-box`** — Faz com que padding e border sejam incluídos no tamanho total do elemento.
- **`display: flex`** — Layout flexível que distribui elementos em linha ou coluna.
- **`position: fixed`** — O elemento fica fixo na página, mesmo quando fazemos scroll.
- **`transition`** — Animação suave quando uma propriedade CSS muda.
- **`@media (max-width: 768px)`** — Regras CSS que só se aplicam em ecrãs com menos de 768px de largura.

✅ **O que conseguiste neste passo:** Definiste toda a aparência visual do backoffice com a identidade da Carris.

---

### Passo 8 — Criar a lógica JavaScript do Backoffice (`backoffice/aplicacao.js`)

Este é o ficheiro mais extenso do backoffice. Controla toda a lógica: login, envio de mensagens, templates, histórico, gestão de utilizadores e conexão Socket.io.

Cria o ficheiro `backoffice/aplicacao.js` copiando o código original do repositório em `backoffice/aplicacao.js`.

O ficheiro está organizado em 17 passos (secções), cada um com uma responsabilidade clara:

| Passo | O que faz |
|-------|-----------|
| 1 | Define variáveis globais (endereço do servidor, token, utilizador logado) |
| 2 | Verifica se já existe uma sessão guardada no `localStorage` |
| 3 | Função de LOGIN — Envia credenciais ao servidor, recebe token JWT |
| 4 | Mostra o painel principal após login bem-sucedido |
| 5 | Função de LOGOUT — Limpa dados e desconecta Socket.io |
| 6 | Conexão Socket.io — Conecta ao servidor para receber mensagens em tempo real |
| 7 | Navegação entre páginas — Mostra/esconde secções (enviar, histórico, utilizadores) |
| 8 | Carregar templates — Busca templates do servidor e cria botões |
| 9 | Selecionar prioridade — Atualiza a seleção visual (Normal/Alta) |
| 10 | Enviar mensagem — Recolhe dados do formulário e envia via POST |
| 11 | Carregar últimas mensagens — Busca as 10 mensagens mais recentes |
| 12 | Adicionar mensagem ao topo — Quando chega via Socket.io |
| 13 | Criar card de mensagem — Gera o HTML de um cartão visual |
| 14 | Funções auxiliares — `formatarData()` e `escapeHtml()` |
| 15 | Mostrar lista de mensagens — Função genérica para preencher containers |
| 16 | Histórico com filtros — Pesquisa, prioridade e data |
| 17 | Gestão de utilizadores — Listar e criar utilizadores |

**Conceitos-chave:**

- **`fetch()`** — Função nativa do JavaScript para fazer pedidos HTTP. Usamos para comunicar com o servidor.
- **`.then()`** — Função que é chamada quando a resposta do `fetch` chega. É como dizer "quando receberes a resposta, faz isto".
- **`.catch()`** — Função chamada se algo correr mal (erro de rede, servidor em baixo).
- **`localStorage`** — Armazenamento do browser que persiste mesmo após fechar a janela. Guardamos o token JWT aqui.
- **`document.getElementById()`** — Busca um elemento HTML pelo seu `id`.
- **`document.createElement()`** — Cria um novo elemento HTML via JavaScript.
- **`element.innerHTML`** — Define o conteúdo HTML dentro de um elemento.
- **`escapeHtml()`** — Função de segurança que previne injeção de código malicioso (XSS).
- **`Socket.io (io())`** — Conecta ao servidor e escuta eventos como `'nova-mensagem'`.

✅ **O que conseguiste neste passo:** Criaste toda a lógica do backoffice — login, envio de mensagens, templates, histórico e comunicação em tempo real.

---

### Passo 9 — Criar o manifest da extensão (`extension/manifest.json`)

O `manifest.json` é o "bilhete de identidade" da extensão. Diz ao browser o nome, as permissões e os ficheiros que a extensão usa.

Cria o ficheiro `extension/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Notificações Carris",
  "version": "1.0.0",
  "description": "Extensão para operadores receberem notificações do coordenador em tempo real.",

  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },

  "background": {
    "service_worker": "background/service-worker.js"
  },

  "permissions": [
    "notifications",
    "storage",
    "alarms"
  ],

  "host_permissions": [
    "http://localhost:3000/*"
  ],

  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

**Explicação linha a linha:**

- **`"manifest_version": 3`** — Versão do formato do manifest. A versão 3 é a mais recente e obrigatória para novas extensões.
- **`"name"`** — Nome da extensão que aparece no browser.
- **`"version"`** — Versão da extensão (formato `MAJOR.MINOR.PATCH`).
- **`"description"`** — Descrição breve que aparece na loja de extensões.
- **`"action"` → `"default_popup"`** — Define qual ficheiro HTML é mostrado quando o utilizador clica no ícone da extensão.
- **`"action"` → `"default_icon"`** — Define os ícones da extensão para diferentes tamanhos.
- **`"background"` → `"service_worker"`** — O script que corre em segundo plano. É ele que verifica novas mensagens periodicamente.
- **`"permissions"`** — As permissões que a extensão precisa:
  - `"notifications"` — Para mostrar notificações push.
  - `"storage"` — Para guardar dados (token, mensagens) no `chrome.storage`.
  - `"alarms"` — Para criar "despertadores" que disparam periodicamente (a cada 1 minuto).
- **`"host_permissions"`** — URLs a que a extensão pode aceder. Neste caso, o nosso servidor local.

✅ **O que conseguiste neste passo:** Criaste a configuração da extensão de browser com todas as permissões necessárias.

---

### Passo 10 — Criar o popup da extensão (HTML, CSS e JS)

O popup é a janela que aparece quando o operador clica no ícone da extensão. Mostra o login ou a lista de mensagens.

#### 10a. Criar `extension/popup/popup.html`

Cria o ficheiro copiando o código original do repositório em `extension/popup/popup.html`. A estrutura é semelhante ao backoffice mas mais simples:

- **Cabeçalho** — Logo e título "Carris Notificações" (sempre visível).
- **Secção de Login** — Campos de username e password (visível quando não logado).
- **Secção Principal** — Barra do utilizador com botão "Sair" + lista de mensagens recentes (visível quando logado).

#### 10b. Criar `extension/popup/popup.css`

Cria o ficheiro copiando o código original do repositório em `extension/popup/popup.css`. Os estilos são semelhantes ao backoffice mas adaptados para o popup (largura fixa de 380px, sem navbar complexa).

#### 10c. Criar `extension/popup/popup.js`

Cria o ficheiro copiando o código original do repositório em `extension/popup/popup.js`. O ficheiro está organizado em 12 passos:

| Passo | O que faz |
|-------|-----------|
| 1 | Define constantes (endereço do servidor) |
| 2 | Inicializa o popup — verifica se está logado via `chrome.storage` |
| 3 | Função de LOGIN — Envia credenciais, guarda token, avisa o service worker |
| 4 | Mostra a secção principal |
| 5 | Função de LOGOUT — Limpa dados, avisa o service worker |
| 6 | Carregar mensagens — Busca as últimas 15 mensagens do servidor |
| 7 | Mostrar mensagens — Cria cards visuais para cada mensagem |
| 8 | Criar card de mensagem — Gera o HTML de cada cartão |
| 9 | Funções auxiliares — `formatarData()` e `escapeHtml()` |
| 10 | Pedir estado de conexão — Pergunta ao service worker se está ativo |
| 11 | Receber mensagens do service worker — Atualiza a lista quando chegam novas |
| 12 | Event listeners — Associa funções aos botões e tecla Enter |

**Conceito-chave: `chrome.storage` vs `localStorage`**

Em extensões de browser, usamos `chrome.storage.local` em vez de `localStorage` porque:
- O `chrome.storage` é partilhado entre o popup e o service worker.
- O popup é destruído cada vez que fecha, mas o `chrome.storage` persiste.
- É a forma oficial de guardar dados numa extensão Chrome.

**Conceito-chave: `chrome.runtime.sendMessage()`**

Permite que o popup envie mensagens ao service worker (e vice-versa). Funciona como um "walkie-talkie" interno da extensão. Usamos para:
- Avisar o service worker que o utilizador fez login/logout.
- O service worker avisa o popup quando chegam novas mensagens.

✅ **O que conseguiste neste passo:** Criaste a interface completa do popup da extensão com login, lista de mensagens e comunicação com o service worker.

---

### Passo 11 — Criar o Service Worker da extensão (`extension/background/service-worker.js`)

O Service Worker é o "motor" da extensão que corre em segundo plano. É ele que recebe as notificações push enviadas pelo servidor e as mostra ao operador instantaneamente.

Cria o ficheiro `extension/background/service-worker.js` copiando o código original do repositório em `extension/background/service-worker.js`.

O ficheiro está organizado em 7 passos:

| Passo | O que faz |
|-------|-----------|
| 1 | Define constantes (endereço do servidor, chave VAPID pública) |
| 2 | Ouve mensagens do popup (LOGIN, LOGOUT, ESTADO) |
| 3 | Regista a subscrição push no servidor — envia a subscrição para `POST /subscribe` |
| 4 | Ouve o evento `push` — quando o servidor envia uma notificação, recebe-a instantaneamente |
| 5 | Mostra notificação push — Cria uma notificação no browser |
| 6 | Quando a extensão é instalada — Regista a subscrição push se já havia sessão |
| 7 | Quando o service worker "acorda" — Garante que a subscrição push está ativa |

**Conceitos-chave:**

- **Service Worker** — Script que corre em segundo plano, mesmo quando o popup está fechado. No Manifest V3, pode ser terminado pelo browser a qualquer momento para poupar recursos.
- **Web Push** — Protocolo que permite ao servidor enviar notificações instantaneamente para o browser do operador, sem necessidade de polling. O servidor usa `webpush.sendNotification()` e o service worker recebe o evento `push`.
- **Subscrição Push** — Quando o operador ativa as notificações, o browser gera uma subscrição push (com endpoint e chaves). Esta subscrição é enviada ao servidor via `POST /subscribe` para que o servidor a possa usar para enviar notificações.
- **VAPID** — Par de chaves criptográficas que identifica o servidor junto dos serviços de push. A chave pública é usada no service worker para criar a subscrição; a chave privada fica no servidor.
- **`self.addEventListener('push', ...)`** — Evento que dispara quando o servidor envia uma notificação push. O service worker recebe o payload e mostra a notificação.
- **`self.registration.showNotification()`** — Mostra uma notificação push nativa do browser ao operador.
- **`chrome.runtime.onInstalled`** — Evento que dispara quando a extensão é instalada pela primeira vez ou atualizada.
- **`chrome.runtime.onStartup`** — Evento que dispara quando o browser abre (e o service worker "acorda").

✅ **O que conseguiste neste passo:** Criaste o service worker que recebe notificações push instantâneas do servidor e as mostra ao operador, sem qualquer atraso.

---

### Passo 12 — Criar os ícones da extensão

A extensão precisa de ícones em 3 tamanhos:

- `extension/assets/icons/icon16.png` — 16×16 pixels (barra de ferramentas)
- `extension/assets/icons/icon48.png` — 48×48 pixels (página de extensões)
- `extension/assets/icons/icon128.png` — 128×128 pixels (Chrome Web Store)

Podes criar os ícones usando:
- Uma ferramenta online como [favicon.io](https://favicon.io/) ou [icons8.com](https://icons8.com/)
- O emoji 🚌 como base
- Qualquer imagem simples em amarelo (#FFD200) e preto (#1D1D1B)

Os ícones devem ser ficheiros PNG com fundo transparente.

✅ **O que conseguiste neste passo:** Criaste os ícones visuais da extensão de browser.

---

## 4. Conceitos Aprendidos — Resumo

Ao longo deste guião, aprendeste estes conceitos fundamentais:

### Backend / Servidor
| Conceito | Explicação |
|----------|-----------|
| **Node.js** | Ambiente que permite correr JavaScript fora do browser, no servidor |
| **Express** | Framework para criar servidores web com rotas HTTP |
| **Rota (Route)** | URL no servidor que aceita um tipo de pedido (GET, POST, PATCH, DELETE) |
| **Middleware** | Função que corre ANTES da rota principal (ex: verificar autenticação) |
| **REST API** | Estilo de arquitetura onde cada URL representa um recurso (users, messages, templates) |
| **JWT (JSON Web Token)** | Token que prova a identidade do utilizador após o login |
| **bcryptjs** | Biblioteca para encriptar passwords de forma irreversível |
| **Socket.io** | Biblioteca para comunicação em tempo real via WebSocket |
| **web-push** | Biblioteca para enviar notificações push instantâneas usando o protocolo Web Push com chaves VAPID |
| **CORS** | Mecanismo que permite pedidos de origens diferentes (cross-origin) |
| **Soft Delete** | Em vez de apagar dados, marcamos como inativos (`ativo: false`) |

### Frontend / Backoffice
| Conceito | Explicação |
|----------|-----------|
| **Single Page Application** | Página única onde mostramos/escondemos secções sem recarregar |
| **fetch()** | Função nativa para fazer pedidos HTTP ao servidor |
| **localStorage** | Armazenamento do browser que persiste entre sessões |
| **DOM (Document Object Model)** | Representação da página HTML como objetos que o JavaScript pode manipular |
| **Event Listeners** | Funções que são chamadas quando algo acontece (clique, tecla, conexão) |
| **escapeHtml()** | Função de segurança para prevenir injeção de código malicioso (XSS) |
| **Responsive Design** | CSS que adapta o layout a diferentes tamanhos de ecrã |

### Extensão de Browser
| Conceito | Explicação |
|----------|-----------|
| **Manifest V3** | Formato atual de configuração de extensões Chrome |
| **Service Worker** | Script que corre em segundo plano, pode ser terminado pelo browser |
| **chrome.storage** | Armazenamento persistente específico para extensões |
| **Web Push** | Protocolo que permite ao servidor enviar notificações instantâneas, sem polling |
| **VAPID** | Par de chaves criptográficas que autenticam o servidor junto dos serviços de push |
| **Subscrição Push** | Objeto gerado pelo browser com endpoint e chaves para receber notificações |
| **`self.registration.showNotification()`** | Mostra uma notificação push nativa do browser |
| **chrome.runtime.sendMessage** | Comunicação entre popup e service worker |

---

## 5. Checklist Final

Verifica que criaste todos os ficheiros:

### Backend
- [ ] `backend/package.json`
- [ ] `backend/basededados.js`
- [ ] `backend/servidor.js`
- [ ] `backend/dados/` (pasta — criada automaticamente pelo servidor)
- [ ] `backend/subscriptions.json` (ficheiro — criado automaticamente quando o primeiro operador se regista)

### Backoffice
- [ ] `backoffice/index.html`
- [ ] `backoffice/estilo.css`
- [ ] `backoffice/aplicacao.js`

### Extensão
- [ ] `extension/manifest.json`
- [ ] `extension/popup/popup.html`
- [ ] `extension/popup/popup.css`
- [ ] `extension/popup/popup.js`
- [ ] `extension/background/service-worker.js`
- [ ] `extension/assets/icons/icon16.png`
- [ ] `extension/assets/icons/icon48.png`
- [ ] `extension/assets/icons/icon128.png`

### Raiz
- [ ] `.gitignore`

---

### 🚀 Instrução Final — Testar Tudo

1. **Instalar dependências e arrancar o servidor:**
   ```bash
   cd backend
   npm install
   node servidor.js
   ```
   Deves ver a mensagem "🚌 SISTEMA DE NOTIFICAÇÕES CARRIS" no terminal.

2. **Abrir o backoffice:**
   - Abre o browser em `http://localhost:3000`
   - Faz login com `coordenador` / `1234`
   - Envia uma mensagem de teste

3. **Instalar a extensão:**
   - Vai a `chrome://extensions/` (ou `edge://extensions/`)
   - Ativa o "Modo de programador"
   - Clica "Carregar sem compactação" e seleciona a pasta `extension`
   - Clica no ícone da extensão e faz login com `operador` / `1234`

4. **Testar o fluxo completo:**
   - No backoffice, envia uma mensagem
   - A mensagem deve aparecer na lista de "Últimas Mensagens" (backoffice)
   - A extensão deve mostrar uma notificação push instantaneamente
   - Abre o popup da extensão para ver a mensagem na lista

**Se tudo funcionar, parabéns! 🎉 Recriaste o sistema completo do zero!**
