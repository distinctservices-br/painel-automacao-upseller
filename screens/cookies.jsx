/* global React, Badge, Icon, PageHeader */
const { useState: useStateCookies } = React;

const cookieCards = [
  { loja: 'SS Personalizados',     marketplace: 'Shopee', shop: '321627', cliente: 'Rafael Teste',           status: 'valido',     renovado: '23/05 · 06:31', expira: 'em 12 dias' },
  { loja: 'Eluni Personalizados',  marketplace: 'Shopee', shop: '617489', cliente: 'Rafael Teste',           status: 'valido',     renovado: '23/05 · 06:31', expira: 'em 12 dias' },
  { loja: 'Surface',               marketplace: 'Shopee', shop: '395750', cliente: 'Surface Personalizados', status: 'expirando',  renovado: '18/05 · 06:31', expira: 'em 8h 12min' },
];

const cookieBadge = (s) => {
  if (s === 'valido')    return <Badge kind="success">válido</Badge>;
  if (s === 'expirando') return <Badge kind="warn">expirando</Badge>;
  return <Badge kind="error">expirado</Badge>;
};

function CookieCard({ data, onForceRenew }) {
  const isExpiring = data.status === 'expirando';
  return (
    <div className="card cookie-card">
      <div className="cookie-head">
        <div>
          <div className="cookie-loja">{data.loja}</div>
          <div className="cookie-cliente">{data.cliente} · {data.marketplace} · {data.shop}</div>
        </div>
        {cookieBadge(data.status)}
      </div>

      <div className="cookie-meta">
        <div className="cookie-meta-row">
          <span>Última renovação</span>
          <span>{data.renovado}</span>
        </div>
        <div className="cookie-meta-row">
          <span>Estimativa de expiração</span>
          <span style={{ color: isExpiring ? '#F3C173' : undefined }}>{data.expira}</span>
        </div>
      </div>

      <button
        className={`btn ${isExpiring ? 'btn-primary' : 'btn-secondary'} btn-sm`}
        style={{ alignSelf: 'flex-start' }}
        onClick={() => onForceRenew(data)}
      >
        <Icon name="refresh" />
        Forçar renovação
      </button>
    </div>
  );
}

function CookiesScreen({ pushToast }) {
  const [renewing, setRenewing] = useStateCookies(null);

  const force = (data) => {
    setRenewing(data.shop);
    setTimeout(() => {
      setRenewing(null);
      pushToast(`Cookie de ${data.loja} renovado`);
    }, 1400);
  };

  return (
    <>
      <PageHeader
        eyebrow="Sessões"
        title="Cookies"
        sub="Cada loja mantém uma sessão autenticada renovada pelo worker. O Upseller bloqueia logins simultâneos — só uma renovação por shop por vez."
        actions={
          <button className="btn btn-secondary btn-sm"><Icon name="refresh" /> Renovar todos</button>
        }
      />

      <div className="grid-cookies">
        {cookieCards.map((c) => (
          <div key={c.shop} style={{ opacity: renewing === c.shop ? 0.6 : 1, transition: 'opacity 200ms' }}>
            <CookieCard data={c} onForceRenew={force} />
          </div>
        ))}
      </div>
    </>
  );
}

window.CookiesScreen = CookiesScreen;
