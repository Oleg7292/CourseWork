import { useEffect, useState } from 'react'
import { api } from '../api'
import KPICard from '../components/KPICard'
import { Users, CreditCard, ArrowLeftRight, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts'

const COLORS = ['#3d5ac8', '#10b981', '#f59e0b', '#f43f5e']

const LOAN_TYPE_LABELS = {
  consumer: 'Потребительский',
  mortgage: 'Ипотека',
  auto:     'Автокредит',
  business: 'Бизнес',
}

const fmtMoney = (v) =>
  parseFloat(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽'

export default function DashboardPage() {
  const [data, setData]       = useState(null)
  const [byMonth, setByMonth] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getClientsByMonth()])
      .then(([d, m]) => { setData(d); setByMonth(m) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 bg-navy-800 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 h-24 animate-pulse bg-navy-800" />
        ))}
      </div>
    </div>
  )

  const stats     = data?.stats      || {}
  const txByDay   = data?.txByDay    || []

  const loansByType = (data?.loansByType || []).map(r => ({
    ...r,
    count:     parseInt(r.count || 0),
    total:     parseFloat(r.total || 0),
    loan_type: LOAN_TYPE_LABELS[r.loan_type] ?? r.loan_type,
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Статистика</h1>
        <p className="text-sm text-slate-500 mt-0.5">Сводная статистика за последние 30 дней</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Клиентов"
          value={stats.totalClients ?? '—'}
          icon={Users}
          color="navy"
        />
        <KPICard
          title="Счетов"
          value={stats.totalAccounts ?? '—'}
          icon={CreditCard}
          color="blue"
        />
        <KPICard
          title="Транзакций"
          value={stats.txCount ?? '—'}
          sub="за 30 дней"
          icon={ArrowLeftRight}
          color="emerald"
        />
        <KPICard
          title="Объём операций"
          value={fmtMoney(stats.txVolume)}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Transactions by day */}
        <div className="card p-5 lg:col-span-2">
          <p className="text-sm font-semibold text-slate-300 mb-4">Транзакции по дням</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={txByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={v =>
                  new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                }
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0b1130', border: '1px solid #25368c', borderRadius: 8, fontSize: 12, color: '#fff' }}
                labelFormatter={v => new Date(v).toLocaleDateString('ru-RU')}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3d5ac8"
                strokeWidth={2}
                dot={false}
                name="Кол-во"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Loans by type */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-slate-300 mb-4">Кредиты по типам</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={loansByType}
                dataKey="count"
                nameKey="loan_type"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={45}
              >
                {loansByType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#0b1130', border: '1px solid #25368c', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clients by month */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-slate-300 mb-4">Прирост клиентов по месяцам</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={byMonth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={v => {
                const d = new Date(v)
                return d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })
              }}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#0b1130', border: '1px solid #25368c', borderRadius: 8, fontSize: 12, color: '#fff' }}
            />
            <Bar dataKey="new_clients" fill="#3d5ac8" radius={[4, 4, 0, 0]} name="Новых клиентов" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
