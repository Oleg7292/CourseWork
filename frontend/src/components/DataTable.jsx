import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function DataTable({ columns, data, page, totalPages, onPage, loading, emptyText = 'Нет данных' }) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-navy-800">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-navy-800 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">{emptyText}</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id ?? i} className="table-row">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700">
          <span className="text-xs text-slate-500">Стр. {page} из {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="btn-ghost p-1.5 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="btn-ghost p-1.5 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
