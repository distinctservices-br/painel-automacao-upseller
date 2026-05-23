/**
 * Envia alerta por email via /api/send-alert (Vercel function → Resend).
 * Lê o email de destino do localStorage (configurado na tela de Configuração).
 */
export async function sendAlert({ subject, html }) {
  const to = localStorage.getItem('alert_email')?.trim()
  if (!to) return // email não configurado — silencia

  try {
    await fetch('/api/send-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
  } catch (err) {
    console.warn('sendAlert falhou:', err)
  }
}

/** Rate-limit: dispara no máximo uma vez a cada 24h por chave */
export function shouldAlert(key) {
  const last = localStorage.getItem(key)
  if (!last) return true
  return Date.now() - Number(last) > 86_400_000
}

export function markAlerted(key) {
  localStorage.setItem(key, String(Date.now()))
}
