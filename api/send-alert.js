/**
 * Vercel Serverless Function — /api/send-alert
 * Envia alertas via Resend sem expor a API key no frontend.
 *
 * Env var obrigatória no Vercel Dashboard:
 *   RESEND_API_KEY = re_Z1QbgYBh_KH3kst3KZyLGwTadkxLNEVQh
 *
 * "from" padrão: onboarding@resend.dev (funciona sem domínio verificado).
 * Troque por um domínio seu verificado no Resend quando quiser.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, html } = req.body ?? {}

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Campos obrigatórios: to, subject, html' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY não configurada nas env vars do Vercel' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Upseller Alertas <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend error:', data)
      return res.status(response.status).json({ error: data })
    }

    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    console.error('send-alert fatal:', err)
    return res.status(500).json({ error: err.message })
  }
}
