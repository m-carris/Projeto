// ============================================================
// SERVICE-WORKER.JS — Background Script da Extensão
// ============================================================
// O Service Worker corre em "segundo plano", MESMO quando o popup
// está fechado. É ele que:
// - Verifica periodicamente se há novas mensagens no servidor
// - Mostra notificações push quando chegam mensagens novas
// - Guarda as mensagens no chrome.storage
//
// COMO FUNCIONA:
// 1. Quando o operador faz login, o popup avisa o service worker
// 2. O service worker cria um "alarme" que dispara a cada 1 minuto
// 3. A cada minuto, o service worker faz um pedido ao servidor
//    para buscar as mensagens mais recentes
// 4. Se encontra mensagens novas (que não viu antes),
//    mostra uma notificação push no browser
// 5. As mensagens são guardadas no chrome.storage para o popup ler
// ============================================================

// ============================================================
// PASSO 1: Constantes
// ============================================================

// Endereço do servidor backend
const ENDERECO_SERVIDOR = 'http://localhost:3000';

// Nome do alarme que vamos criar
// O alarme é como um "despertador" que toca a cada minuto
const NOME_ALARME = 'verificar-mensagens';

// ============================================================
// PASSO 2: Ouvir mensagens do popup
// ============================================================
// O popup envia mensagens ao service worker usando
// chrome.runtime.sendMessage(). Aqui, escutamos essas mensagens.

chrome.runtime.onMessage.addListener(function(mensagem, remetente, enviarResposta) {

    // ---- LOGIN: O utilizador acabou de fazer login ----
    if (mensagem.tipo === 'LOGIN') {
        // O popup enviou-nos o token de autenticação
        // Guardar o token no chrome.storage
        chrome.storage.local.set({ token: mensagem.token });

        // Criar um alarme para verificar mensagens periodicamente
        // O alarme dispara a cada 1 minuto (periodInMinutes: 1)
        chrome.alarms.create(NOME_ALARME, {
            periodInMinutes: 1,
            delayInMinutes: 0.1
        });

        // Fazer uma verificação imediata
        verificarNovasMensagens();

        // Responder ao popup que está tudo OK
        enviarResposta({ sucesso: true });
    }

    // ---- LOGOUT: O utilizador fez logout ----
    if (mensagem.tipo === 'LOGOUT') {
        // Parar o alarme
        chrome.alarms.clear(NOME_ALARME);

        // Limpar o token
        chrome.storage.local.remove(['token']);

        enviarResposta({ sucesso: true });
    }

    // ---- ESTADO: O popup quer saber se estamos ativos ----
    if (mensagem.tipo === 'ESTADO') {
        // Verificar se o alarme existe
        chrome.alarms.get(NOME_ALARME, function(alarme) {
            if (alarme) {
                enviarResposta({ ativo: true });
            } else {
                enviarResposta({ ativo: false });
            }
        });
    }

    // Manter o canal de comunicação aberto para respostas assíncronas
    return true;
});

// ============================================================
// PASSO 3: Ouvir o alarme
// ============================================================
// Quando o "despertador" (alarme) toca, verificamos se há
// novas mensagens no servidor.

chrome.alarms.onAlarm.addListener(function(alarme) {
    // Verificar se é o nosso alarme
    if (alarme.name === NOME_ALARME) {
        verificarNovasMensagens();
    }
});

// ============================================================
// PASSO 4: Verificar novas mensagens
// ============================================================
// Esta é a função principal do service worker.
// Faz um pedido ao servidor e compara com as mensagens anteriores.

function verificarNovasMensagens() {
    // Buscar o token do chrome.storage
    chrome.storage.local.get(['token', 'mensagens', 'ultimoIdVisto'], function(resultado) {
        let token = resultado.token;

        // Se não há token, não podemos fazer o pedido
        if (!token) {
            return;
        }

        // Buscar o último ID que vimos
        let ultimoIdVisto = resultado.ultimoIdVisto;
        if (!ultimoIdVisto) {
            ultimoIdVisto = 0;
        }

        // Fazer o pedido ao servidor
        fetch(ENDERECO_SERVIDOR + '/messages/recentes?limite=15', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(function(resposta) {
            // Se a resposta não é OK (ex: token expirado), parar
            if (!resposta.ok) {
                return null;
            }
            return resposta.json();
        })
        .then(function(mensagens) {
            // Se não recebemos mensagens, parar
            if (!mensagens) {
                return;
            }

            // Guardar as mensagens no chrome.storage
            chrome.storage.local.set({ mensagens: mensagens });

            // Verificar se há mensagens novas
            // Uma mensagem é "nova" se o seu ID é maior que o último que vimos
            let mensagensNovas = [];
            for (let i = 0; i < mensagens.length; i = i + 1) {
                if (mensagens[i].id > ultimoIdVisto) {
                    mensagensNovas.push(mensagens[i]);
                }
            }

            // Se há mensagens novas, mostrar notificações
            if (mensagensNovas.length > 0) {
                // Encontrar o maior ID para atualizar o ultimoIdVisto
                let novoMaiorId = ultimoIdVisto;
                for (let i = 0; i < mensagensNovas.length; i = i + 1) {
                    if (mensagensNovas[i].id > novoMaiorId) {
                        novoMaiorId = mensagensNovas[i].id;
                    }
                }

                // Atualizar o último ID visto
                chrome.storage.local.set({ ultimoIdVisto: novoMaiorId });

                // Mostrar notificação para cada mensagem nova
                for (let i = 0; i < mensagensNovas.length; i = i + 1) {
                    mostrarNotificacao(mensagensNovas[i]);
                }

                // Avisar o popup (se estiver aberto) que há novas mensagens
                chrome.runtime.sendMessage({ tipo: 'NOVA_MENSAGEM' })
                .then(undefined, function() {
                    // Se o popup não está aberto, o sendMessage falha
                    // Isso é normal e esperado — ignoramos o erro
                });
            }

            // Atualizar o estado de conexão
            chrome.runtime.sendMessage({ tipo: 'ESTADO_ATUALIZADO', ativo: true })
            .then(undefined, function() {
                // Ignorar se o popup não está aberto
            });
        })
        .then(undefined, function(erro) {
            // Erro de rede — o servidor pode não estar a correr
            chrome.runtime.sendMessage({ tipo: 'ESTADO_ATUALIZADO', ativo: false })
            .then(undefined, function() {
                // Ignorar se o popup não está aberto
            });
        });
    });
}

// ============================================================
// PASSO 5: Mostrar notificação push
// ============================================================
// Quando chega uma mensagem nova, mostramos uma notificação
// no canto do ecrã do browser.

function mostrarNotificacao(mensagem) {
    // Definir o título conforme a prioridade
    let titulo = '📢 Nova Mensagem — Carris';
    if (mensagem.prioridade === 'alta') {
        titulo = '🚨 URGENTE — Carris';
    }

    // Definir a prioridade da notificação
    // 2 = alta, 0 = normal
    let prioridadeNotificacao = 0;
    if (mensagem.prioridade === 'alta') {
        prioridadeNotificacao = 2;
    }

    // Criar a notificação
    // O ID único garante que cada mensagem gera uma notificação separada
    chrome.notifications.create('msg-' + mensagem.id, {
        type: 'basic',
        iconUrl: '../assets/icons/icon128.png',
        title: titulo,
        message: mensagem.conteudo,
        priority: prioridadeNotificacao,
        requireInteraction: mensagem.prioridade === 'alta'
    });
}

// ============================================================
// PASSO 6: Quando a extensão é instalada/atualizada
// ============================================================
// Verificar se já existe um token guardado (sessão anterior)
// Se sim, reiniciar o alarme de verificação.

chrome.runtime.onInstalled.addListener(function() {
    // Verificar se há um token guardado
    chrome.storage.local.get(['token'], function(resultado) {
        if (resultado.token) {
            // Recriar o alarme
            chrome.alarms.create(NOME_ALARME, {
                periodInMinutes: 1,
                delayInMinutes: 0.1
            });

            // Verificar mensagens imediatamente
            verificarNovasMensagens();
        }
    });
});

// ============================================================
// PASSO 7: Quando o service worker "acorda"
// ============================================================
// Em Manifest V3, o service worker pode ser terminado pelo browser
// para poupar recursos. Quando volta a ser ativado, verificamos
// se o alarme ainda existe.

chrome.runtime.onStartup.addListener(function() {
    chrome.storage.local.get(['token'], function(resultado) {
        if (resultado.token) {
            // Garantir que o alarme está ativo
            chrome.alarms.get(NOME_ALARME, function(alarme) {
                if (!alarme) {
                    chrome.alarms.create(NOME_ALARME, {
                        periodInMinutes: 1,
                        delayInMinutes: 0.1
                    });
                }
            });
        }
    });
});
