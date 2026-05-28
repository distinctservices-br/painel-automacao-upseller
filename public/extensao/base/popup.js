(async function () {
  const iconeEl = document.getElementById('icone');
  const textoEl = document.getElementById('status-texto');
  const envioEl = document.getElementById('ultimo-envio');
  const clienteEl = document.getElementById('cliente');

  clienteEl.textContent = `Cliente: ${CONFIG.CLIENTE_NOME || CONFIG.CLIENTE_ID || '—'}`;

  const dados = await chrome.storage.local.get(['ultimo_envio', 'status', 'mensagem', 'loja_nome']);

  if (!dados.ultimo_envio) {
    iconeEl.className = 'icone aguard';
    iconeEl.textContent = '⏱';
    textoEl.textContent = 'Aguardando primeiro envio';
    envioEl.textContent = 'Último envio: —';
    return;
  }

  if (dados.status === 'ok') {
    iconeEl.className = 'icone ok';
    iconeEl.textContent = '✓';
    textoEl.textContent = 'Sincronizado';
  } else if (dados.status === 'aguardando') {
    iconeEl.className = 'icone aguard';
    iconeEl.textContent = '⏱';
    textoEl.textContent = dados.mensagem || 'Aguardando sessão';
  } else {
    iconeEl.className = 'icone erro';
    iconeEl.textContent = '✕';
    textoEl.textContent = `Erro: ${dados.mensagem || 'sincronização falhou'}`;
  }

  envioEl.textContent = `Último envio: ${formatarTempo(dados.ultimo_envio)}`;
  if (dados.loja_nome) {
    clienteEl.textContent = `Cliente: ${CONFIG.CLIENTE_NOME || ''} — ${dados.loja_nome}`;
  }
})();

function formatarTempo(ts) {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora mesmo';
  if (min === 1) return 'há 1 minuto';
  if (min < 60) return `há ${min} minutos`;
  const horas = Math.floor(min / 60);
  if (horas === 1) return 'há 1 hora';
  if (horas < 24) return `há ${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}
