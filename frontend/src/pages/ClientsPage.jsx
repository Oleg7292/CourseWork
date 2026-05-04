import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/useAuth'
import { useToast } from '../components/Toast'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { Search, Plus, Eye, UserX, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const LIMIT = 15

const EMPTY_FORM = {
  last_name: '', first_name: '', middle_name: '',
  birth_date: '', passport_series: '', passport_number: '',
  phone: '', email: '', address: '', inn: '',
}

export default function ClientsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [clients, setClients] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)

  // Debounce 400ms — не передаём пустой search в URL
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }

  const load = useCallback(() => {
    setLoading(true)
    const params = { page, limit: LIMIT }
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
    api.getClients(params)
      .then(d => {
        setClients(d.clients ?? [])
        setTotal(d.total ?? 0)
        const p = d.pages ?? Math.ceil((d.total ?? 0) / LIMIT)
        setPages(p > 0 ? p : 1)
      })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch])

  useEffect(() => { load() }, [load])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createClient(form)
      toast('Клиент успешно добавлен', 'success')
      setAddOpen(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Деактивировать клиента «${name}»?`)) return
    try {
      await api.deleteClient(id)
      toast('Клиент деактивирован', 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const canModify = user?.role === 'admin' || user?.role === 'operator'
  const fmt = (v) => v ? new Date(v).toLocaleDateString('ru-RU') : '—'
  const getFullName = (r) => [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(' ')

  const columns = [
    {
      key: 'last_name',
      label: 'ФИО',
      render: (_, r) => <span className="font-medium text-slate-100">{getFullName(r)}</span>,
    },
    { key: 'phone', label: 'Телефон' },
    { key: 'email', label: 'Email' },
    {
      key: 'passport_series',
      label: 'Паспорт',
      render: (_, r) =>
        r.passport_series && r.passport_number
          ? <span className="font-mono text-xs">{r.passport_series} {r.passport_number}</span>
          : '—',
    },
    {
      key: 'birth_date',
      label: 'Дата рожд.',
      render: (v) => fmt(v),
    },
    {
      key: 'is_active',
      label: 'Статус',
      render: (v) => (
        <span className={`badge ${v
          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
          : 'bg-red-900/60 text-red-300 border border-red-700'}`}>
          {v ? 'Активен' : 'Неактивен'}
        </span>
      ),
    },
    {
      key: 'id',
      label: '',
      render: (_, r) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            className="btn-ghost"
            onClick={() => navigate(`/clients/${r.id}`)}
            title="Просмотр"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Просмотр</span>
          </button>
          {canModify && r.is_active && (
            <button
              className="btn-danger"
              onClick={() => handleDeactivate(r.id, getFullName(r))}
              title="Деактивировать"
            >
              <UserX className="w-4 h-4" />
              <span className="hidden sm:inline">Деактив.</span>
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Клиенты</h1>
          {!loading && <p className="text-sm text-slate-400 mt-0.5">Всего: {total}</p>}
        </div>
        {canModify && (
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Добавить клиента
          </button>
        )}
      </div>

      <div className="card">
        {/* Поиск */}
        <div className="p-4 border-b border-navy-700">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              className="input pl-9"
              placeholder="Поиск по ФИО, телефону, паспорту..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Таблица */}
        <DataTable
          columns={columns}
          data={clients}
          page={page}
          totalPages={pages}
          onPage={setPage}
          loading={loading}
          emptyText={debouncedSearch ? 'Ничего не найдено' : 'Клиенты не найдены'}
        />
      </div>

      {/* Пагинация */}
      {!loading && pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Страница {page} из {pages}</span>
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Назад
            </button>
            <button
              className="btn-secondary"
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
            >
              Вперёд
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Модалка: добавить клиента */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setForm(EMPTY_FORM) }} title="Новый клиент" size="lg">
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Фамилия *</label>
            <input className="input" required value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Имя *</label>
            <input className="input" required value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Отчество</label>
            <input className="input" value={form.middle_name}
              onChange={e => setForm(f => ({ ...f, middle_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Дата рождения *</label>
            <input className="input" type="date" required value={form.birth_date}
              onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Серия паспорта * (4 цифры)</label>
            <input className="input font-mono" required maxLength={4} placeholder="1234"
              value={form.passport_series}
              onChange={e => setForm(f => ({ ...f, passport_series: e.target.value.replace(/\D/g, '') }))} />
          </div>
          <div>
            <label className="label">Номер паспорта * (6 цифр)</label>
            <input className="input font-mono" required maxLength={6} placeholder="567890"
              value={form.passport_number}
              onChange={e => setForm(f => ({ ...f, passport_number: e.target.value.replace(/\D/g, '') }))} />
          </div>
          <div>
            <label className="label">Телефон *</label>
            <input className="input" type="tel" required placeholder="+7 (999) 000-00-00"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="example@mail.ru"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">ИНН</label>
            <input className="input" maxLength={12} placeholder="12 цифр"
              value={form.inn}
              onChange={e => setForm(f => ({ ...f, inn: e.target.value.replace(/\D/g, '') }))} />
          </div>
          <div>
            <label className="label">Адрес</label>
            <input className="input" placeholder="г. Москва, ул. Примерная, д. 1"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="col-span-full flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary"
              onClick={() => { setAddOpen(false); setForm(EMPTY_FORM) }}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
