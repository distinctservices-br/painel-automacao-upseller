/* global React, ReactDOM, Sidebar, ClientesScreen, ExecucoesScreen, CookiesScreen, ConfigScreen, Toast */
const { useState: useStateApp } = React;

function App() {
  const [route, setRoute] = useStateApp('clientes');
  const [toast, setToast] = useStateApp(null);

  const pushToast = (msg) => setToast(msg);

  const screens = {
    clientes:  <ClientesScreen pushToast={pushToast} goto={setRoute} />,
    execucoes: <ExecucoesScreen />,
    cookies:   <CookiesScreen pushToast={pushToast} />,
    config:    <ConfigScreen pushToast={pushToast} />,
  };

  return (
    <div className="app">
      <Sidebar current={route} onNav={setRoute} />
      <main className="main" data-screen-label={route}>
        {screens[route]}
      </main>
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
