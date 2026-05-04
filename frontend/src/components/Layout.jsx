import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import {
  LayoutDashboard, Users, CreditCard, ArrowLeftRight,
  Landmark, UserCog, LogOut, Building2, Shield
} from 'lucide-react'

const navItems = [
  { to: '/',             label: 'Главная страница',       icon: LayoutDashboard, roles: null },
  { to: '/clients',      label: 'Клиенты',       icon: Users,           roles: null },
  { to: '/accounts',     label: 'Счета',         icon: CreditCard,      roles: null },
  { to: '/transactions', label: 'Транзакции',    icon: ArrowLeftRight,  roles: null },
  { to: '/loans',        label: 'Кредиты',       icon: Landmark,        roles: null },
  { to: '/employees',    label: 'Сотрудники',    icon: UserCog,         roles: ['admin'] },
  { to: '/audit',        label: 'Журнал аудита', icon: Shield,          roles: ['admin'] },
]

const roleLabel = {
  admin: 'Администратор',
  operator: 'Оператор',
  analyst: 'Аналитик'
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleItems = navItems.filter(
    item => !item.roles || item.roles.includes(user?.role)
  )

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden">
      <aside className="w-64 flex flex-col bg-navy-900 border-r border-white/10 shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <Building2 className="w-7 h-7 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">БанкСистема</p>
            <p className="text-gray-400 text-xs truncate">Управление данными</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-white text-sm font-medium truncate">{user?.username}</p>
            <p className="text-gray-400 text-xs">{roleLabel[user?.role] ?? user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}