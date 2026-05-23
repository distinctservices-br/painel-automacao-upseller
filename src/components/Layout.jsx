import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen relative z-[1]">
      <Sidebar />
      <main className="flex-1 min-w-0 px-10 py-8 pb-20 max-w-[1280px]">
        <Outlet />
      </main>
    </div>
  )
}
