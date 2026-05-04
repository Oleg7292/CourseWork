// frontend/src/pages/AuditLogPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { Shield, Search, RefreshCw, X, Copy, Check } from 'lucide-react'

// ─── Цвета бейджей ────────────────────────────────────────────────────────────
const ACTION_COLORS = {
  CREATE:       'bg-green-500/20 text-green-400 ring-1 ring-green-500/30',
  UPDATE:       'bg-blue-500/20  text-blue-400  ring-1 ring-blue-500/30',
  DELETE:       'bg-red-500/20   text-red-400   ring-1 ring-red-500/30',
  LOGIN:        'bg-gray-500/20  text-gray-300  ring-1 ring-gray-500/30',
  LOGIN_FAILED: 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30',
  LOGOUT:       'bg-gray-500/20  text-gray-300  ring-1 ring-gray-500/30',
}
const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT']

// ─── JSON Viewer (с подсветкой синтаксиса) ───────────────────────────────────
function JsonBlock({ label, data }) {
  if (!data) return null

  const lines = JSON.stringify(data, null, 2).split('\n')

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <pre className="bg-black/30 rounded-lg p-3 text-xs font-mono overflow-auto max-h-60
                      leading-relaxed whitespace-pre-wrap break-all">
        {lines.map((line, i) => {
          const keyMatch = line.match(/^(\s*)("[\w _-]+")\s*:/)
          if (keyMatch) {
            const indent = keyMatch[1]
            const key    = keyMatch[2]
            const rest   = line.slice(indent.length + key.length + 1).trimStart()
            const valueClass =
              /^null/.test(rest)        ? 'text-gray-500'
              : /^true/.test(rest)      ? 'text-green-400'
              : /^false/.test(rest)     ? 'text-red-400'
              : /^-?\d/.test(rest)      ? 'text-yellow-300'
              : /^"/.test(rest)         ? 'text-emerald-300'
              : 'text-gray-300'
            return (
              <span key={i} className="block">
                <span className="text-gray-600">{indent}</span>
                <span className="text-blue-300">{key}</span>
                <span className="text-gray-500">: </span>
                <span className={valueClass}>{rest}</span>
              </span>
            )
          }
          return <span key={i} className="block text-gray-500">{line}</span>
        })}
      </pre>
    </div>
  )
}

// ─── Модальное окно деталей ───────────────────────────────────────────────────
function DetailsModal({ row, onClose }) {
  const [copied, setCopied] = useState(false)

  // Закрытие по Escape
  useEffect(() => {
    if (!row) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [row, onClose])

  if (!row) return null

  const fullText = [
    row.old_values && 'ДО:\n'    + JSON.stringify(row.old_values, null, 2),
    row.new_values && 'ПОСЛЕ:\n' + JSON.stringify(row.new_values, null, 2),
  ].filter(Boolean).join('\n\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl bg-navy-900 border border-white/10
                      rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
           style={{ background: 'rgb(10 17 35)' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/10 gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-white font-semibold">Детали изменения</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 font-mono">
              <span>{new Date(row.created_at).toLocaleString('ru-RU')}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-300">{row.username ?? 'system'}</span>
              <span className="text-gray-600">·</span>
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${ACTION_COLORS[row.action] ?? 'bg-gray-500/20 text-gray-400'}`}>
                {row.action}
              </span>
              {row.table_name && (
                <>
                  <span className="text-gray-600">·</span>
                  <span className="text-gray-300">{row.table_name}</span>
                </>
              )}
              {row.record_id && <span className="text-gray-500">#{row.record_id}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="btn btn-ghost text-xs py-1 px-2 flex items-center gap-1.5"
              onClick={handleCopy}
              title="Скопировать JSON"
            >
              {copied
                ? <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Скопировано</span></>
                : <><Copy className="w-3.5 h-3.5" />Копировать</>
              }
            </button>
            <button className="btn btn-ghost p-1.5 rounded-lg" onClick={onClose} aria-label="Закрыть">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4">
          {!row.old_values && !row.new_values ? (
            <p className="text-center text-gray-500 py-8 text-sm">
              Нет данных для отображения
            </p>
          ) : (
            <>
              <JsonBlock label="До изменения"    data={row.old_values} />
              <JsonBlock label="После изменения" data={row.new_values} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Основная страница ────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const [rows, setRows]           = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [action, setAction]       = useState('')
  const [search, setSearch]       = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [detailRow, setDetailRow] = useState(null)

  const LIMIT = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page, limit: LIMIT,
        ...(action   && { action }),
        ...(search   && { username: search }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to: dateTo }),
      }
      const data = await api.getAuditLog(params)
      setRows(data.rows ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      console.error('Audit load error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, action, search, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const handleFilter = (setter) => (e) => { setter(e.target.value); setPage(1) }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <>
      <DetailsModal row={detailRow} onClose={() => setDetailRow(null)} />

      <div className="p-6 space-y-6">
        {/* Заголовок */}
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-semibold text-white">Журнал аудита</h1>
          <span className="text-gray-400 text-sm ml-auto">
            Всего записей: <span className="text-white font-medium">{total}</span>
          </span>
        </div>

        {/* Фильтры */}
        <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 w-full"
              placeholder="Пользователь..."
              value={search}
              onChange={handleFilter(setSearch)}
            />
          </div>
          <select className="input" value={action} onChange={handleFilter(setAction)}>
            {ACTIONS.map(a => (
              <option key={a} value={a}>{a || 'Все действия'}</option>
            ))}
          </select>
          <input
            type="date" className="input"
            value={dateFrom} onChange={handleFilter(setDateFrom)}
            title="Дата от"
          />
          <div className="flex gap-2">
            <input
              type="date" className="input flex-1"
              value={dateTo} onChange={handleFilter(setDateTo)}
              title="Дата до"
            />
            <button className="btn btn-ghost px-3" onClick={load} title="Обновить">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Таблица */}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/10">
                <th className="px-4 py-3 font-medium">Время</th>
                <th className="px-4 py-3 font-medium">Пользователь</th>
                <th className="px-4 py-3 font-medium">Действие</th>
                <th className="px-4 py-3 font-medium">Таблица</th>
                <th className="px-4 py-3 font-medium">ID записи</th>
                <th className="px-4 py-3 font-medium">IP-адрес</th>
                <th className="px-4 py-3 font-medium">Детали</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/10 rounded animate-pulse"
                          style={{ width: `${55 + (j * 17) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Записей в журнале нет</p>
                  </td>
                </tr>
              ) : rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap font-mono text-xs">
                    {new Date(row.created_at).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    {row.username ?? <span className="text-gray-500">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium
                      ${ACTION_COLORS[row.action] ?? 'bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/30'}`}>
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {row.table_name ?? <span className="text-gray-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {row.record_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {row.ip_address ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {(row.old_values || row.new_values) ? (
                      <button
                        className="btn btn-ghost text-xs py-1 px-2"
                        onClick={() => setDetailRow(row)}
                      >
                        Показать
                      </button>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <span className="text-gray-400 text-sm">
                Страница {page} из {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary text-sm"
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                >
                  ← Назад
                </button>
                <button
                  className="btn btn-secondary text-sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                >
                  Вперёд →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
