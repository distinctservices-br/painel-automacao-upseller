/* global React, Icon, PageHeader */
const { useState: useStateConfig } = React;

function ConfigScreen({ pushToast }) {
  const [form, setForm] = useStateConfig({
    supabaseUrl: 'https://upseller-painel.supabase.co',
    anonKey: '',
    alertEmail: '',
  });
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = () => {
    pushToast('Configuração salva');
  };

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Configuração"
        sub="Conexão com o backend e canal de alertas. Mudanças entram em vigor na próxima corrida do worker."
      />

      <div className="config-card">
        <div className="form-row" style={{ marginBottom: 18 }}>
          <label className="form-label">URL do Supabase</label>
          <input className="input" value={form.supabaseUrl} onChange={update('supabaseUrl')} placeholder="https://proj.supabase.co" />
          <span className="help">Endpoint do projeto onde clientes, lojas e execuções são persistidos.</span>
        </div>

        <div className="form-row" style={{ marginBottom: 18 }}>
          <label className="form-label">Anon key</label>
          <input className="input" type="password" value={form.anonKey} onChange={update('anonKey')} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
          <span className="help">Chave pública anon — service_role nunca deve ser usada no painel.</span>
        </div>

        <div className="form-row" style={{ marginBottom: 24 }}>
          <label className="form-label">Email para alertas</label>
          <input className="input" type="email" value={form.alertEmail} onChange={update('alertEmail')} placeholder="alertas@upseller.com.br" />
          <span className="help">Notificado em falhas consecutivas e cookies expirando.</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16, borderTop: '1px solid var(--color-divider)' }}>
          <button className="btn btn-ghost">Cancelar</button>
          <button className="btn btn-primary" onClick={save}>
            <Icon name="device-floppy" />
            Salvar configuração
          </button>
        </div>
      </div>

      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 640 }}>
        <div className="metric">
          <div className="metric-label">Schedule</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 4 }}>*/30 06:30-13:30</div>
          <div className="metric-trend">dias úteis</div>
        </div>
        <div className="metric">
          <div className="metric-label">Retry policy</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 4 }}>3× · 60s</div>
          <div className="metric-trend">backoff fixo</div>
        </div>
        <div className="metric">
          <div className="metric-label">Workers</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 4 }}>2 online</div>
          <div className="metric-trend up">healthy</div>
        </div>
      </div>
    </>
  );
}

window.ConfigScreen = ConfigScreen;
