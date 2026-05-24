import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'

const Logo = () => (
  <svg viewBox="0 0 720 720" xmlns="http://www.w3.org/2000/svg" className="w-[20px] h-[20px]" aria-hidden="true">
    <path fill="#73F3A4" d="M440.7 237.2c-13.8.5-26.7 4-38.5 10.6-11.8 6.5-22.8 14.7-33 24.4-10.2 9.8-19.5 20-28 30.8-8.5 10.8-16.4 20.7-23.6 29.6-7.2 8.9-13.9 15.6-20 20.1-6.2 4.5-11.9 5.4-17.1 2.7-3.5-1.8-6-4.6-7.6-8.6-1.6-3.9-1.8-9.3-.6-15.9 1.2-6.7 4.4-15 9.5-24.8 5.6-10.8 12.5-21.2 20.9-31.2-12.1 1.3-24.8-.8-36.4-6.9-19.1-9.9-31.2-28.1-34.1-47.9-10.5 14-19.8 28.9-28 44.6-16.1 31.2-25 59.7-26.6 85.4-1.6 25.7 2.6 47.9 12.6 66.4 10 18.6 24.4 32.7 43.2 42.4 16.2 8.4 31.2 12.4 45.2 11.9 14-.5 26.9-4 38.7-10.5 11.8-6.5 22.8-14.7 33.1-24.6 10.3-9.9 19.7-20.1 28.3-30.7 8.6-10.6 16.6-20.3 23.9-29.2 7.3-8.8 14.2-15.5 20.5-19.9 6.3-4.4 12.2-5.2 17.7-2.4 3.5 1.8 5.8 4.7 6.9 8.5 1.1 3.9.8 9-.8 15.3-1.6 6.3-5 14.4-10.1 24.2-8.7 16.7-20.1 32.7-34.4 47.9-14.3 15.1-29.3 27.8-45.2 37.9l57.5 71.5c17.2-10.5 34.8-26.1 52.8-46.9 18.1-20.7 33.7-43.8 46.8-69.2 16.3-31.5 25.2-60.1 26.6-85.7 1.4-25.7-2.9-47.8-12.9-66.4-10-18.5-24.2-32.6-42.7-42.2-15.9-8.2-30.8-12.1-44.6-11.5z"/>
    <path fill="#73F3A4" d="M320.6 163.5c26.2 13.6 36.4 45.8 22.9 72-8.4 16.2-23.9 26.3-40.8 28.4-10.4 1.3-21.2-.4-31.2-5.6-19.5-10.1-30.2-30.5-28.8-51.1.5-7.1 2.4-14.2 5.9-20.9 13.6-26.2 45.8-36.5 72-22.8z"/>
  </svg>
)

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen relative z-[1]">

      {/* ── Top bar mobile ── */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 z-30 bg-[rgba(13,13,13,0.92)] backdrop-blur-xl border-b border-divider flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-[8px] text-muted hover:text-white-1 hover:bg-muted-surface transition-colors"
          aria-label="Abrir menu"
        >
          <i className="ti ti-menu-2 text-[20px]" />
        </button>

        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-bold text-[13px] tracking-tight">Upseller</span>
        </div>

        <button
          onClick={signOut}
          className="w-9 h-9 flex items-center justify-center rounded-[8px] text-muted hover:text-error-text transition-colors"
          aria-label="Sair"
        >
          <i className="ti ti-logout text-[18px]" />
        </button>
      </header>

      {/* ── Sidebar ── */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Conteúdo principal ── */}
      <main className="
        flex-1 min-w-0 pb-20
        px-4 pt-[72px]
        sm:px-6
        md:px-10 md:py-8 md:pt-8
        max-w-full
      ">
        <Outlet />
      </main>
    </div>
  )
}
