export default function KPICard({ title, value, sub, icon: Icon, color = 'navy' }) {
  const colors = {
    navy:    'bg-navy-700/40 text-navy-300',
    emerald: 'bg-emerald-900/40 text-emerald-400',
    blue:    'bg-blue-900/40 text-blue-400',
    purple:  'bg-purple-900/40 text-purple-400',
    orange:  'bg-orange-900/40 text-orange-400',
  }
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-100 tabular-nums leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
