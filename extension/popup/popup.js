// ============================================================
// POPUP.JS — Lógica do Popup da Extensão (Operadores)
// ============================================================
// Este ficheiro controla tudo o que acontece no popup:
// - Login do operador
// - Mostrar mensagens recentes
// - Comunicar com o service-worker (background)
//
// NOTA: O popup fecha quando o utilizador clica fora dele.
// Por isso, guardamos os dados no chrome.storage para
// não perder informação entre aberturas.
// ============================================================

// ============================================================
// PASSO 1: Constantes e Variáveis
// ============================================================

// Endereço do servidor backend
const ENDERECO_SERVIDOR = 'http://localhost:3000';

// ============================================================
// PASSO 2: Quando o popup abre, verificar se está logado
// ============================================================
// Cada vez que o popup é aberto, precisamos de verificar
// se o operador já fez login anteriormente.
// Os dados estão guardados no chrome.storage.

function inicializarPopup() {
    // Usar chrome.storage.local para buscar dados guardados
    // chrome.storage é como o localStorage mas específico para extensões
    chrome.storage.local.get(['token', 'utilizador'], function(resultado) {
        // Se existe um token e dados do utilizador, está logado
        if (resultado.token && resultado.utilizador) {
            // Mostrar a secção principal (mensagens)
            mostrarSecaoPrincipal(resultado.utilizador);
            // Carregar as mensagens
            carregarMensagens();
            // Pedir o estado da conexão ao service worker
            pedirEstadoConexao();
        }
        // Se não existe token, mostrar o login (já está visível por padrão)
    });
}

// Chamar a inicialização quando o popup abre
inicializarPopup();

// ============================================================
// PASSO 3: Função de LOGIN
// ============================================================
// Quando o operador clica "Entrar", enviamos as credenciais
// para o servidor e guardamos o token no chrome.storage.

function fazerLogin() {
    // Buscar os valores dos campos
    let username = document.getElementById('campo-username').value;
    let password = document.getElementById('campo-password').value;
    let divErro = document.getElementById('login-erro');

    // Verificar se os campos foram preenchidos
    if (!username || !password) {
        divErro.textContent = 'Preenche o username e a password.';
        return;
    }

    // Limpar erro anterior
    divErro.textContent = '';

    // Desativar o botão enquanto esperamos
    let botao = document.getElementById('botao-login');
    botao.textContent = 'A entrar...';
    botao.disabled = true;

    // Criar os dados para enviar ao servidor
    let dadosLogin = JSON.stringify({
        username: username,
        password: password
    });

    // Enviar o pedido de login ao servidor
    fetch(ENDERECO_SERVIDOR + '/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: dadosLogin
    })
    .then(function(resposta) {
        return resposta.json();
    })
    .then(function(dados) {
        // Restaurar o botão
        botao.textContent = 'Entrar';
        botao.disabled = false;

        // Verificar se houve erro
        if (dados.erro) {
            divErro.textContent = dados.erro;
            return;
        }

        // Login com sucesso!
        // Guardar o token e os dados do utilizador no chrome.storage
        chrome.storage.local.set({
            token: dados.token,
            utilizador: dados.utilizador
        });

        // Avisar o service worker que o utilizador fez login
        // O service worker vai começar a verificar novas mensagens
        chrome.runtime.sendMessage({
            tipo: 'LOGIN',
            token: dados.token
        });

        // Mostrar a secção principal
        mostrarSecaoPrincipal(dados.utilizador);

        // Carregar as mensagens
        carregarMensagens();
    })
    .catch(function(erro) {
        // Erro de rede
        botao.textContent = 'Entrar';
        botao.disabled = false;
        divErro.textContent = 'Erro de ligação. O servidor está a correr?';
    });
}

// ============================================================
// PASSO 4: Mostrar a secção principal (após login)
// ============================================================

function mostrarSecaoPrincipal(utilizador) {
    // Esconder o login
    document.getElementById('secao-login').style.display = 'none';

    // Mostrar a secção principal
    document.getElementById('secao-principal').style.display = 'block';

    // Mostrar o nome do utilizador
    document.getElementById('nome-utilizador').textContent = 'Olá, ' + utilizador.nome;
}

// ============================================================
// PASSO 5: Função de LOGOUT
// ============================================================

function fazerLogout() {
    // Limpar os dados do chrome.storage
    chrome.storage.local.remove(['token', 'utilizador', 'mensagens']);

    // Avisar o service worker para parar de verificar mensagens
    chrome.runtime.sendMessage({ tipo: 'LOGOUT' });

    // Esconder a secção principal e mostrar o login
    document.getElementById('secao-principal').style.display = 'none';
    document.getElementById('secao-login').style.display = 'block';

    // Limpar o erro de login
    document.getElementById('login-erro').textContent = '';
}

// ============================================================
// PASSO 6: Carregar mensagens recentes do servidor
// ============================================================
// Buscar as últimas mensagens do servidor e mostrar no popup.

function carregarMensagens() {
    // Buscar o token do chrome.storage
    chrome.storage.local.get(['token'], function(resultado) {
        let token = resultado.token;

        // Se não há token, não podemos fazer o pedido
        if (!token) {
            return;
        }

        // Fazer o pedido ao servidor
        fetch(ENDERECO_SERVIDOR + '/messages/recentes?limite=15', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(function(resposta) {
            return resposta.json();
        })
        .then(function(mensagens) {
            // Guardar as mensagens no chrome.storage
            // para o service worker poder comparar depois
            chrome.storage.local.set({ mensagens: mensagens });

            // Mostrar as mensagens no popup
            mostrarMensagens(mensagens);
        })
        .catch(function(erro) {
            let container = document.getElementById('lista-mensagens');
            container.innerHTML = '<p class="texto-vazio">Erro ao carregar mensagens.</p>';
        });
    });
}

// ============================================================
// PASSO 7: Mostrar mensagens no popup
// ============================================================

function mostrarMensagens(mensagens) {
    let container = document.getElementById('lista-mensagens');

    // Limpar o conteúdo anterior
    container.innerHTML = '';

    // Se não há mensagens
    if (mensagens.length === 0) {
        container.innerHTML = '<p class="texto-vazio">Nenhuma mensagem recebida.</p>';
        return;
    }

    // Criar um card para cada mensagem
    for (let i = 0; i < mensagens.length; i = i + 1) {
        let mensagem = mensagens[i];
        let card = criarCardMensagem(mensagem);
        container.appendChild(card);
    }
}

// ============================================================
// PASSO 8: Criar card visual de uma mensagem
// ============================================================

function criarCardMensagem(mensagem) {
    // Criar o div principal do card
    let card = document.createElement('div');
    card.className = 'msg-card';

    // Se é prioridade alta, adicionar classe de destaque
    if (mensagem.prioridade === 'alta') {
        card.className = 'msg-card msg-card-alta';
    }

    // Formatar a data
    let dataFormatada = formatarData(mensagem.criadaEm);

    // Escolher ícone do tipo
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
    let html = '';

    // Cabeçalho: data + badge de prioridade
    html = html + '<div class="msg-cabecalho">';
    html = html + '<span class="msg-data">' + dataFormatada + '</span>';

    if (mensagem.prioridade === 'alta') {
        html = html + '<span class="msg-badge msg-badge-alta">🔴 ALTA</span>';
    } else {
        html = html + '<span class="msg-badge msg-badge-normal">🟢 Normal</span>';
    }

    html = html + '</div>';

    // Conteúdo
    html = html + '<div class="msg-conteudo">' + escapeHtml(mensagem.conteudo) + '</div>';

    // Rodapé
    html = html + '<div class="msg-rodape">';
    html = html + '<span class="msg-tipo">' + iconeTipo + ' ' + mensagem.tipo + '</span>';
    html = html + '<span>De: ' + escapeHtml(mensagem.remetenteNome) + '</span>';
    html = html + '</div>';

    card.innerHTML = html;
    return card;
}

// ============================================================
// PASSO 9: Funções Auxiliares
// ============================================================

// Formatar data ISO para DD/MM/AAAA HH:MM
function formatarData(dataISO) {
    if (!dataISO) {
        return '';
    }

    let data = new Date(dataISO);
    let dia = data.getDate();
    let mes = data.getMonth() + 1;
    let ano = data.getFullYear();
    let horas = data.getHours();
    let minutos = data.getMinutes();

    // Adicionar zero à esquerda se necessário
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

    return dia + '/' + mes + '/' + ano + ' ' + horas + ':' + minutos;
}

// Escapar HTML para segurança
function escapeHtml(texto) {
    if (!texto) {
        return '';
    }
    let resultado = '';
    for (let i = 0; i < texto.length; i = i + 1) {
        let c = texto[i];
        if (c === '<') {
            resultado = resultado + '&lt;';
        } else if (c === '>') {
            resultado = resultado + '&gt;';
        } else if (c === '&') {
            resultado = resultado + '&amp;';
        } else if (c === '"') {
            resultado = resultado + '&quot;';
        } else {
            resultado = resultado + c;
        }
    }
    return resultado;
}

// ============================================================
// PASSO 10: Pedir estado da conexão ao service worker
// ============================================================

function pedirEstadoConexao() {
    chrome.runtime.sendMessage({ tipo: 'ESTADO' }, function(resposta) {
        let indicador = document.getElementById('estado-conexao');
        if (resposta && resposta.ativo) {
            indicador.textContent = '● Conectado';
            indicador.className = 'estado-conectado';
        } else {
            indicador.textContent = '● A verificar...';
            indicador.className = 'estado-desconectado';
        }
    });
}

// ============================================================
// PASSO 11: Receber mensagens do service worker
// ============================================================
// Quando o service worker encontra novas mensagens,
// avisa o popup para atualizar a lista.

chrome.runtime.onMessage.addListener(function(mensagem, remetente, enviarResposta) {
    if (mensagem.tipo === 'NOVA_MENSAGEM') {
        // Recarregar a lista de mensagens
        carregarMensagens();
    }
    if (mensagem.tipo === 'ESTADO_ATUALIZADO') {
        // Atualizar o indicador de conexão
        let indicador = document.getElementById('estado-conexao');
        if (mensagem.ativo) {
            indicador.textContent = '● Conectado';
            indicador.className = 'estado-conectado';
        } else {
            indicador.textContent = '● Desconectado';
            indicador.className = 'estado-desconectado';
        }
    }
});

// ============================================================
// PASSO 12: Event listeners dos botões e tecla Enter
// ============================================================

// Botão de login
document.getElementById('botao-login').addEventListener('click', fazerLogin);

// Botão de logout (sair)
document.getElementById('botao-sair').addEventListener('click', fazerLogout);

// Botão de atualizar mensagens
document.getElementById('botao-atualizar').addEventListener('click', carregarMensagens);

// Login com tecla Enter
document.addEventListener('keypress', function(evento) {
    if (evento.key === 'Enter') {
        let campoUsername = document.getElementById('campo-username');
        let campoPassword = document.getElementById('campo-password');

        if (document.activeElement === campoUsername || document.activeElement === campoPassword) {
            fazerLogin();
        }
    }
});
