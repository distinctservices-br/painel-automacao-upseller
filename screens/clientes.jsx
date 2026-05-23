/* global React, Badge, Icon, Modal, PageHeader */
const { useState: useStateClientes } = React;

// Mock data – mirrors the brief
const initialClientes = [
  {
    id: 'cli_8c12e9a4b1d2f4',
    nome: 'Rafael Teste',
    email: 'rafael@teste.com.br',
    lojas: [
      { nome: 'SS Personalizados', marketplace: 'Shopee', shop_id: '321627', status: 'ativo' },
      { nome: 'Eluni Personalizados', marketplace: 'Shopee', shop_id: '617489', status: 'ativo' },
    ],
  },
  {
    id: 'cli_f73a09b2e4c5a1',
    nome: 'Surface Personalizados',
    email: 'contato@surface.com.br',
    lojas: [
      { nome: 'Surface', marketplace: 'Shopee', shop_id: '395750', status: 'expirando' },
    ],
  },
];

function lojaBadge(status) {
  if (status === 'ativo') return <Badge kind="success">ativo</Badge>;
  if (status === 'expirando') return <Badge kind="warn">cookie expirando</Badge>;
  return <Badge kind="error">inativo</Badge>;
}

function buildBat(cliente, loja) {
  const stamp = new Date().toLocaleString('pt-BR');
  return `@echo off
REM ============================================================
REM  Upseller Automação — worker .bat
REM  Cliente:  ${cliente.nome}
REM  Loja:     ${loja ? loja.nome + ' (' + loja.shop_id + ')' : '— todas —'}
REM  Gerado:   ${stamp}
REM ============================================================

set CLIENTE_ID=${cliente.id}
set CLIENTE_NOME=${cliente.nome}
set LOJA_SHOP_ID=${loja ? loja.shop_id : 'all'}
set SCHEDULE=*/30 06:30-13:30 * * 1-5
set SUPABASE_URL=https://proj.supabase.co
set RUN_INTERVAL_MIN=30

echo [%date% %time%] iniciando worker upseller...
cd /d "%~dp0"

:loop
  python -m upseller.runner --cliente "%CLIENTE_ID%" --shop "%LOJA_SHOP_ID%"
  if errorlevel 1 echo [%date% %time%] falha — reintentando em 60s
  timeout /t 1800 /nobreak >nul
goto loop
`;
}

function ClienteCard({ cliente, onGenerateBat, onShowExecucoes }) {
  return (
    <div className="card cliente-card">
      <div className="cliente-head">
        <div>
          <div className="cliente-name">{cliente.nome}</div>
          <div className="cliente-id">{cliente.id}</div>
        </div>
        <Badge kind="success">{cliente.lojas.length} {cliente.lojas.length === 1 ? 'loja' : 'lojas'}</Badge>
      </div>

      <div className="cliente-lojas">
        {cliente.lojas.map((l) => (
          <div className="loja-row" key={l.shop_id}>
            <div className="loja-meta">
              <div className="loja-name">{l.nome} <span style={{ color: 'var(--color-muted-text-light)' }}>· {l.marketplace}</span></div>
              <div className="loja-shop">shop {l.shop_id}</div>
            </div>
            {lojaBadge(l.status)}
          </div>
        ))}
      </div>

      <div className="cliente-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onGenerateBat(cliente)}>
          <Icon name="file-code" />
          Gerar .bat
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => onShowExecucoes(cliente)}>
          <Icon name="history" />
          Execuções
        </button>
      </div>
    </div>
  );
}

function NovoClienteModal({ onClose, onCreate }) {
  const [form, setForm] = useStateClientes({
    nome: '', email: '', lojaNome: '', shopId: '', ordem: '1', emailUpseller: '', senhaUpseller: '',
  });
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const canSubmit = form.nome && form.email && form.lojaNome && form.shopId && form.emailUpseller && form.senhaUpseller;

  return (
    <Modal
      title="Novo cliente"
      sub="Cadastre o cliente, registre a loja inicial e baixe o .bat do worker."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
            onClick={() => onCreate(form)}
          >
            <Icon name="file-code" />
            Criar e gerar .bat
          </button>
        </>
      }
    >
      <div className="form-row">
        <label className="form-label">Nome do cliente</label>
        <input className="input" placeholder="ex. Rafael Teste" value={form.nome} onChange={update('nome')} />
      </div>
      <div className="form-row">
        <label className="form-label">Email de contato</label>
        <input className="input" type="email" placeholder="rafael@empresa.com.br" value={form.email} onChange={update('email')} />
      </div>

      <div style={{ height: 1, background: 'var(--color-divider)', margin: '4px 0' }}></div>

      <div className="form-row cols-2">
        <div className="form-row">
          <label className="form-label">Nome da loja</label>
          <input className="input" placeholder="ex. SS Personalizados" value={form.lojaNome} onChange={update('lojaNome')} />
        </div>
        <div className="form-row">
          <label className="form-label">Shop ID</label>
          <input className="input" placeholder="321627" value={form.shopId} onChange={update('shopId')} />
        </div>
      </div>

      <div className="form-row cols-2">
        <div className="form-row">
          <label className="form-label">Ordem</label>
          <input className="input" type="number" min="1" value={form.ordem} onChange={update('ordem')} />
          <span className="help">Ordem de execução quando houver múltiplas lojas.</span>
        </div>
        <div className="form-row">
          <label className="form-label">Email Upseller</label>
          <input className="input" type="email" placeholder="login@upseller" value={form.emailUpseller} onChange={update('emailUpseller')} />
        </div>
      </div>

      <div className="form-row">
        <label className="form-label">Senha Upseller</label>
        <input className="input" type="password" placeholder="••••••••" value={form.senhaUpseller} onChange={update('senhaUpseller')} />
        <span className="help">Armazenada criptografada no Supabase, usada apenas pelo worker local.</span>
      </div>
    </Modal>
  );
}

function BatModal({ cliente, loja, onClose }) {
  const content = buildBat(cliente, loja);
  const filename = `upseller_${cliente.nome.toLowerCase().replace(/\s+/g, '_')}.bat`;

  const download = () => {
    const blob = new Blob([content], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const copy = () => navigator.clipboard?.writeText(content);

  // Colorize the .bat preview
  const lines = content.split('\n').map((line, i) => {
    let cls = '';
    if (line.startsWith('REM') || line.startsWith('@echo')) cls = 'cm';
    else if (line.startsWith('set ')) cls = 'var';
    else if (line.startsWith('echo')) cls = 'str';
    return <span key={i} className={cls}>{line + '\n'}</span>;
  });

  return (
    <Modal
      title={`.bat gerado — ${cliente.nome}`}
      sub="Salve em uma pasta dedicada no Windows do cliente. O worker abrirá uma janela e rodará em loop."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={copy}><Icon name="copy" /> Copiar</button>
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
          <button className="btn btn-primary" onClick={download}>
            <Icon name="download" />
            Baixar .bat
          </button>
        </>
      }
    >
      <div className="terminal">
        <div className="terminal-bar">
          <span className="tl tl-r"></span>
          <span className="tl tl-y"></span>
          <span className="tl tl-g"></span>
          <span className="terminal-name">{filename}</span>
        </div>
        <pre className="terminal-body" style={{ margin: 0 }}>{lines}</pre>
      </div>
    </Modal>
  );
}

function ClientesScreen({ pushToast, goto }) {
  const [clientes, setClientes] = useStateClientes(initialClientes);
  const [newOpen, setNewOpen] = useStateClientes(false);
  const [batFor, setBatFor] = useStateClientes(null); // { cliente, loja }

  const onCreate = (form) => {
    const cli = {
      id: 'cli_' + Math.random().toString(36).slice(2, 16),
      nome: form.nome,
      email: form.email,
      lojas: [{ nome: form.lojaNome, marketplace: 'Shopee', shop_id: form.shopId, status: 'ativo' }],
    };
    setClientes([...clientes, cli]);
    setNewOpen(false);
    setBatFor({ cliente: cli, loja: cli.lojas[0] });
    pushToast('Cliente criado · .bat pronto pra download');
  };

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Clientes"
        sub={`${clientes.length} cliente${clientes.length === 1 ? '' : 's'} · ${clientes.reduce((s, c) => s + c.lojas.length, 0)} lojas conectadas`}
        actions={
          <>
            <button className="btn btn-secondary btn-sm">
              <Icon name="search" />
              Buscar
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setNewOpen(true)}>
              <Icon name="plus" />
              Novo cliente
            </button>
          </>
        }
      />

      <div className="grid-clientes">
        {clientes.map((c) => (
          <ClienteCard
            key={c.id}
            cliente={c}
            onGenerateBat={() => setBatFor({ cliente: c, loja: c.lojas[0] })}
            onShowExecucoes={() => goto('execucoes')}
          />
        ))}
        <button className="card-dashed" onClick={() => setNewOpen(true)}>
          <Icon name="plus" />
          <div style={{ fontWeight: 500, fontSize: 13 }}>Novo cliente</div>
          <div style={{ fontSize: 11, color: 'var(--color-muted-text-light)' }}>cadastrar + gerar .bat</div>
        </button>
      </div>

      {newOpen && <NovoClienteModal onClose={() => setNewOpen(false)} onCreate={onCreate} />}
      {batFor && <BatModal cliente={batFor.cliente} loja={batFor.loja} onClose={() => setBatFor(null)} />}
    </>
  );
}

window.ClientesScreen = ClientesScreen;
