import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { to: '/',            label: 'Clientes',     icon: 'users'    },
  { to: '/execucoes',   label: 'Execuções',    icon: 'history'  },
  { to: '/cookies',     label: 'Cookies',      icon: 'cookie'   },
  { to: '/configuracao',label: 'Configuração', icon: 'settings' },
]

export default function Sidebar() {
  const { signOut, user } = useAuth()

  return (
    <aside
      className="
        sticky top-0 h-screen w-[220px] flex-shrink-0 z-10
        border-r border-divider
        bg-[rgba(15,15,15,0.7)] backdrop-blur-md
        flex flex-col gap-1 p-4
      "
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 pb-5 mb-2 border-b border-divider">
        <div
          className="
            w-8 h-8 rounded-[8px] border border-glass-border
            bg-black-2 flex items-center justify-center flex-shrink-0
          "
        >
          <svg viewBox="0 0 720 720" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]" aria-hidden="true">
            <path fill="#73F3A4" d="M440.7 237.2c-13.8.5-26.7 4-38.5 10.6-11.8 6.5-22.8 14.7-33 24.4-10.2 9.8-19.5 20-28 30.8-8.5 10.8-16.4 20.7-23.6 29.6-7.2 8.9-13.9 15.6-20 20.1-6.2 4.5-11.9 5.4-17.1 2.7-3.5-1.8-6-4.6-7.6-8.6-1.6-3.9-1.8-9.3-.6-15.9 1.2-6.7 4.4-15 9.5-24.8 5.6-10.8 12.5-21.2 20.9-31.2-12.1 1.3-24.8-.8-36.4-6.9-19.1-9.9-31.2-28.1-34.1-47.9-10.5 14-19.8 28.9-28 44.6-16.1 31.2-25 59.7-26.6 85.4-1.6 25.7 2.6 47.9 12.6 66.4 10 18.6 24.4 32.7 43.2 42.4 16.2 8.4 31.2 12.4 45.2 11.9 14-.5 26.9-4 38.7-10.5 11.8-6.5 22.8-14.7 33.1-24.6 10.3-9.9 19.7-20.1 28.3-30.7 8.6-10.6 16.6-20.3 23.9-29.2 7.3-8.8 14.2-15.5 20.5-19.9 6.3-4.4 12.2-5.2 17.7-2.4 3.5 1.8 5.8 4.7 6.9 8.5 1.1 3.9.8 9-.8 15.3-1.6 6.3-5 14.4-10.1 24.2-8.7 16.7-20.1 32.7-34.4 47.9-14.3 15.1-29.3 27.8-45.2 37.9l57.5 71.5c17.2-10.5 34.8-26.1 52.8-46.9 18.1-20.7 33.7-43.8 46.8-69.2 16.3-31.5 25.2-60.1 26.6-85.7 1.4-25.7-2.9-47.8-12.9-66.4-10-18.5-24.2-32.6-42.7-42.2-15.9-8.2-30.8-12.1-44.6-11.5z"/>
            <path fill="#73F3A4" d="M320.6 163.5c26.2 13.6 36.4 45.8 22.9 72-8.4 16.2-23.9 26.3-40.8 28.4-10.4 1.3-21.2-.4-31.2-5.6-19.5-10.1-30.2-30.5-28.8-51.1.5-7.1 2.4-14.2 5.9-20.9 13.6-26.2 45.8-36.5 72-22.8z"/>
          </svg>
        </div>
        <div className="leading-[1.1]">
          <p className="font-display font-bold text-[14px] tracking-tight text-white-1">Upseller</p>
          <p className="text-[11px] text-muted mt-0.5">painel de controle</p>
        </div>
      </div>

      {/* Nav */}
      <p className="text-[10px] font-body tracking-[0.12em] uppercase text-muted-light px-2.5 pt-3 pb-1.5">
        Operação
      </p>

      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium border transition-all duration-150 cursor-pointer select-none
            ${isActive
              ? 'bg-[rgba(115,243,164,0.08)] border-glass-border text-white-1 [&>i]:text-primary'
              : 'border-transparent text-muted hover:bg-muted-surface hover:text-white-1'
            }`
          }
        >
          <i className={`ti ti-${n.icon} text-[18px] flex-shrink-0`} />
          <span>{n.label}</span>
        </NavLink>
      ))}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-divider">
        {user?.email && (
          <p className="px-2.5 text-[11px] text-muted-light font-mono truncate mb-2">
            {user.email}
          </p>
        )}
        <div className="flex items-center justify-between px-2.5 pb-1">
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <span className="status-dot" />
            <span>Worker online</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1 text-[11px] text-muted hover:text-error-text transition-colors"
            title="Sair"
          >
            <i className="ti ti-logout text-[16px]" />
          </button>
        </div>
      </div>
    </aside>
  )
}
