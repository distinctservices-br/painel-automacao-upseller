/* global React, Badge, Icon, PageHeader */
const { useState: useStateExec } = React;

const execClientes = ['Todos', 'Rafael Teste', 'Surface Personalizados'];

const execRows = [
  { time: '13:00:14', cliente: 'Rafael Teste',           loja: 'SS Personalizados',     shop: '321627', pedidos: 12, dur: '1m 42s', status: 'sucesso' },
  { time: '13:00:33', cliente: 'Rafael Teste',           loja: 'Eluni Personalizados',  shop: '617489', pedidos: 8,  dur: '1m 12s', status: 'sucesso' },
  { time: '12:30:09', cliente: 'Surface Personalizados', loja: 'Surface',               shop: '395750', pedidos: 0,  dur: '24s',    status: 'sem-pedidos' },
  { time: '12:00:11', cliente: 'Rafael Teste',           loja: 'SS Personalizados',     shop: '321627', pedidos: 3,  dur: '48s',    status: 'sucesso' },
  { time: '11:30:42', cliente: 'Surface Personalizados', loja: 'Surface',               shop: '395750', pedidos: 0,  dur: '12s',    status: 'falha'  },
];

const statusBadge = (s) => {
  if (s === 'sucesso')     return <Badge kind="success">sucesso</Badge>;
  if (s === 'sem-pedidos') return <Badge kind="neutral">sem pedidos</Badge>;
  return <Badge kind="error">falha</Badge>;
};

// Mock volume by store (7 days)
const volumeData = [
  { loja: 'SS Personalizados',    bars: [14, 22, 18, 24, 19, 27, 31] },
  { loja: 'Eluni Personalizados', bars: [9,  12, 14, 11, 16, 18, 22] },
  { loja: 'Surface',              bars: [4,  6,  3,  5,  0,  2,  1]  },
];

function Bars({ values }) {
  const max = Math.max(...values, 1);
  return (
    <div className="bar-bars">
      {values.map((v, i) => (
        <div
          key={i}
          className={`b ${v === 0 ? 'dim' : ''}`}
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          title={`${v} pedidos`}
        ></div>
      ))}
    </div>
  );
}

function ExecucoesScreen() {
  const [cliente, setCliente] = useStateExec('Todos');
  const [periodo, setPeriodo] = useStateExec('hoje');

  const filtered = execRows.filter(r => cliente === 'Todos' || r.cliente === cliente);

  const metrics = [
    { label: 'Pedidos hoje',   value: '23', trend: '+18% vs ontem',   tone: 'up',   accent: true },
    { label: 'Esta semana',    value: '186', trend: '7 dias úteis',   tone: 'flat' },
    { label: 'Taxa de sucesso', value: '94%', trend: '+2pp 7d',        tone: 'up' },
    { label: 'Falhas',         value: '3',  trend: '1 cookie expirado', tone: 'down' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Execuções"
        sub="Histórico do worker em tempo real — atualiza a cada 30 min, 06:30–13:30, dias úteis."
        actions={
          <>
            <button className="btn btn-secondary btn-sm"><Icon name="download" /> Exportar CSV</button>
            <button className="btn btn-primary btn-sm"><Icon name="refresh" /> Atualizar</button>
          </>
        }
      />

      <div className="filters">
        <span className="filter-label">Cliente</span>
        <select className="select" value={cliente} onChange={(e) => setCliente(e.target.value)}>
          {execClientes.map(c => <option key={c}>{c}</option>)}
        </select>
        <span className="filter-label" style={{ marginLeft: 12 }}>Período</span>
        <div className="seg">
          {[
            { id: 'hoje',  label: 'Hoje' },
            { id: '7d',    label: 'Últimos 7 dias' },
            { id: 'mes',   label: 'Este mês' },
          ].map(o => (
            <button
              key={o.id}
              className={`seg-item ${periodo === o.id ? 'active' : ''}`}
              onClick={() => setPeriodo(o.id)}
            >{o.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-muted-text-light)', fontFamily: 'var(--font-mono)' }}>
          última corrida · 13:00:33
        </div>
      </div>

      <div className="grid-metrics">
        {metrics.map((m, i) => (
          <div key={i} className={`metric ${m.accent ? 'accent' : ''}`}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            <div className={`metric-trend ${m.tone}`}>
              {m.tone === 'up'   && <Icon name="trending-up" />}
              {m.tone === 'down' && <Icon name="trending-down" />}
              {m.tone === 'flat' && <Icon name="minus" />}
              {m.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <div className="table-head">
          <div className="table-head-title">Corridas — {periodo === 'hoje' ? 'hoje' : periodo === '7d' ? 'últimos 7 dias' : 'este mês'}</div>
          <div className="table-head-meta">{filtered.length} registros</div>
        </div>
        <table className="t">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Horário</th>
              <th>Cliente</th>
              <th>Loja</th>
              <th style={{ width: 90 }}>Pedidos</th>
              <th style={{ width: 90 }}>Duração</th>
              <th style={{ width: 140 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td className="mono">{r.time}</td>
                <td>{r.cliente}</td>
                <td>
                  <span className="tag">{r.loja} · {r.shop}</span>
                </td>
                <td className="mono" style={{ color: 'var(--color-white-1)' }}>{r.pedidos}</td>
                <td className="mono">{r.dur}</td>
                <td>{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bars-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="table-head-title">Volume por loja</div>
          <div className="table-head-meta">últimos 7 dias</div>
        </div>
        <div className="bars-grid">
          {volumeData.map((v) => (
            <div key={v.loja} className="bar-row">
              <div>
                <div className="bar-row-name">
                  <span>{v.loja}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted-text-light)', fontSize: 11 }}>
                    seg · ter · qua · qui · sex · sáb · dom
                  </span>
                </div>
                <Bars values={v.bars} />
              </div>
              <div className="bar-total">{v.bars.reduce((a, b) => a + b, 0)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

window.ExecucoesScreen = ExecucoesScreen;
