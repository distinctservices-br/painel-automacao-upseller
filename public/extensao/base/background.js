importScripts('config.js');

const DEBOUNCE_MS = 2000;
const MAX_TENTATIVAS = 3;
const INTERVALO_MIN_MS = 12 * 60 * 60 * 1000; // 12 horas entre envios (2x ao dia)
const UPSELLER_URLS = ['https://*.upseller.com/*', 'https://upseller.com/*'];

let debounceTimer = null;

// Intercepta os headers HTTP reais das requisições ao Upseller
chrome.webRequest.onBeforeSendHeaders.addListener(
  async (details) => {
    const headerCookie = details.requestHeaders?.find(
      (h) => h.name.toLowerCase() === 'cookie'
    );
    if (!headerCookie?.value) return;

    const cookie = headerCookie.value;
    const usUAtual = extrairValorCookie(cookie, 'us_u');
    if (!usUAtual) return; // sessão não iniciada

    // Lê estado persistido — mais confiável que variável em memória
    // pois o service worker é reiniciado a cada navegação no MV3
    const dados = await chrome.storage.local.get(['ultimo_envio', 'us_u_salvo']);

    const mesmaSession = dados.us_u_salvo === usUAtual;
    const dentroDoIntervalo = dados.ultimo_envio &&
      (Date.now() - dados.ultimo_envio) < INTERVALO_MIN_MS;

    if (mesmaSession && dentroDoIntervalo) {
      console.log('[DistinctServices] Ignorando — mesma sessão, dentro de 12h');
      return;
    }

    // Guarda us_u imediatamente para bloquear requisições paralelas desta navegação
    await chrome.storage.local.set({ us_u_salvo: usUAtual });

    agendarEnvio(cookie);
  },
  { urls: UPSELLER_URLS },
  ['requestHeaders', 'extraHeaders']
);

// Heartbeat a cada 12h para manter cookie fresco no Supabase
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'heartbeat') return;
  chrome.storage.local.get(['cookie_salvo'], ({ cookie_salvo }) => {
    if (!cookie_salvo) return;
    console.log('[DistinctServices] Heartbeat — reenviando cookie salvo');
    enviarCookie(cookie_salvo, true).catch((e) =>
      console.error('[DistinctServices] heartbeat erro:', e.message)
    );
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('heartbeat', { periodInMinutes: 720 }); // a cada 12h
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['cookie_salvo'], ({ cookie_salvo }) => {
    if (cookie_salvo?.includes('us_u=')) {
      enviarCookie(cookie_salvo, true).catch(() => {});
    }
  });
});

function agendarEnvio(cookie) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    enviarCookie(cookie).catch((e) =>
      console.error('[DistinctServices] envio erro:', e.message)
    );
  }, DEBOUNCE_MS);
}

async function enviarCookie(cookieCompleto, forcarEnvio = false) {
  if (!forcarEnvio) {
    // Verificação final antes do envio — previne race conditions no debounce
    const usUAtual = extrairValorCookie(cookieCompleto, 'us_u');
    const dados = await chrome.storage.local.get(['ultimo_envio', 'us_u_enviado']);
    const mesmaSession = dados.us_u_enviado === usUAtual;
    const dentroDoIntervalo = dados.ultimo_envio &&
      (Date.now() - dados.ultimo_envio) < INTERVALO_MIN_MS;
    if (mesmaSession && dentroDoIntervalo) {
      console.log('[DistinctServices] Envio bloqueado — já enviado recentemente');
      return;
    }
  }

  const shopIds = extrairShopIds(cookieCompleto);
  console.log('[DistinctServices] Enviando — shop_ids:', shopIds);

  // Marca como enviado ANTES do fetch para bloquear concorrentes
  const usUAtual = extrairValorCookie(cookieCompleto, 'us_u');
  await chrome.storage.local.set({
    cookie_salvo: cookieCompleto,
    us_u_enviado: usUAtual,
    ultimo_envio: Date.now()
  });

  await enviarComRetry({
    cliente_id: CONFIG.CLIENTE_ID,
    cookie_completo: cookieCompleto,
    shop_ids_sessao: shopIds
  });
}

function extrairValorCookie(cookieStr, nome) {
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${nome}=([^;]*)`));
  return match ? match[1] : null;
}

function extrairShopIds(cookieStr) {
  const ids = new Set();
  const pares = cookieStr.split(';').map((p) => p.trim());
  for (const par of pares) {
    const idx = par.indexOf('=');
    if (idx === -1) continue;
    const nome = par.substring(0, idx).trim();
    const valor = par.substring(idx + 1).trim();
    if (!nome.startsWith('MYJ_') || nome.includes('MKTG')) continue;
    try {
      const obj = JSON.parse(decodeURIComponent(atob(valor)));
      if (obj?.userId) ids.add(String(obj.userId));
    } catch (_) {}
  }
  return Array.from(ids);
}

async function enviarComRetry(payload) {
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const resp = await fetch(CONFIG.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Token': CONFIG.EXTENSION_TOKEN
        },
        body: JSON.stringify(payload)
      });

      const data = await resp.json().catch(() => ({}));
      console.log(`[DistinctServices] Resposta HTTP ${resp.status}:`, JSON.stringify(data));

      if (!resp.ok || data.sucesso === false) {
        const motivo = data.motivo || data.erro || `HTTP ${resp.status}`;
        await salvarStatus('erro', motivo);
        return;
      }

      const lojaNome = data.lojas?.[0]?.nome_loja || CONFIG.CLIENTE_NOME || '';
      await salvarStatus('ok', 'Sincronizado', lojaNome);
      console.log('[DistinctServices] OK — lojas atualizadas:', data.lojas_atualizadas);
      return;
    } catch (err) {
      ultimoErro = err;
      console.warn(`[DistinctServices] Tentativa ${tentativa} falhou:`, err.message);
      if (tentativa < MAX_TENTATIVAS) await sleep(1000 * Math.pow(2, tentativa - 1));
    }
  }
  await salvarStatus('erro', ultimoErro?.message || 'Falha de rede');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function salvarStatus(status, mensagem, lojaNome) {
  const dados = { status, mensagem: mensagem || '' };
  if (lojaNome) dados.loja_nome = lojaNome;
  await chrome.storage.local.set(dados);
}
