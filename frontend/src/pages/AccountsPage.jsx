import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../context/useAuth'
import { useToast } from '../components/Toast'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { Plus, X, Loader2 } from 'lucide-react'

// ─── Утилиты ─────────────────────────────────────────────────────────────────

const fmtMoney = (value, currency = 'RUB') => {
  const num = parseFloat(value || 0)
  if (currency === 'RUB')
    return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽'
  if (currency === 'USD')
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (currency === 'EUR')
    return '€' + num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// PostgreSQL может вернуть is_active как булево, строку "true"/"false" или 1/0
const isActiveVal = (v) => v === true || v === 1 || v === 'true'

// ─── Справочники ──────────────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Расчётный' },
  { value: 'savings',  label: 'Сберегательный' },
  { value: 'deposit',  label: 'Депозитный' },
  { value: 'credit',   label: 'Кредитный' },
]

const CURRENCIES = ['RUB', 'USD', 'EUR']

// ─── Компонент ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { user } = useAuth()
  const toast = useToast()

  const [accounts, setAccounts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [typeFilter, setTypeFilter] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm]       = useState({
    client_id:       '',
    account_type:    'checking',
    currency:        'RUB',
    initial_balance: '0',
    interest_rate:   '0',
  })
  const [saving, setSaving]   = useState(false)
  const [clients, setClients] = useState([])

  const canModify = user?.role === 'admin' || user?.role === 'operator'

  // ── Загрузка счетов ──────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (typeFilter) params.type = typeFilter
    api.getAccounts(params)
      .then(d => setAccounts(d.accounts ?? d))
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [typeFilter])

  useEffect(() => { load() }, [load])

  // ── Загрузка клиентов для модалки ────────────────────────────────────────
  useEffect(() => {
    api.getClients({ limit: 100 })
      .then(d => setClients(d.clients ?? d))
      .catch(() => {})
  }, [])

  // ── Открыть счёт ─────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createAccount({
        client_id:       parseInt(form.client_id, 10),
        account_type:    form.account_type,
        currency:        form.currency,
        initial_balance: parseFloat(form.initial_balance) || 0,
        interest_rate:   parseFloat(form.interest_rate)   || 0,
      })
      toast('Счёт открыт', 'success')
      setAddOpen(false)
      setForm({ client_id: '', account_type: 'checking', currency: 'RUB', initial_balance: '0', interest_rate: '0' })
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Закрыть счёт ─────────────────────────────────────────────────────────
  const handleClose = async (account) => {
    if (parseFloat(account.balance || 0) !== 0) {
      toast('Закрыть счёт можно только при нулевом балансе', 'error')
      return
    }
    if (!confirm(`Закрыть счёт ${account.account_number}?`)) return
    try {
      await api.closeAccount(account.id)
      toast('Счёт закрыт', 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  // ── Колонки таблицы ──────────────────────────────────────────────────────
  const columns = [
    {
      key: 'account_number',
      label: 'Номер счёта',
      render: v => <span className="font-mono text-sm">{v}</span>,
    },
    {
      key: 'client_name',
      label: 'Клиент',
      render: (_, r) =>
        `${r.last_name || ''} ${r.first_name || ''}`.trim() || '—',
    },
    {
      key: 'account_type',
      label: 'Тип',
      render: v => <Badge status={v} type="account" />,
    },
    {
      key: 'currency',
      label: 'Валюта',
      render: v => <span className="font-medium">{v}</span>,
    },
    {
      key: 'balance',
      label: 'Баланс',
      render: (v, r) => (
        <span className="tabular-nums font-mono">
          {fmtMoney(v, r.currency)}
        </span>
      ),
    },
    {
      key: 'interest_rate',
      label: 'Ставка, %',
      render: v => v != null ? `${parseFloat(v).toFixed(2)} %` : '—',
    },
    {
      key: 'is_active',
      label: 'Статус',
      render: v => <Badge status={isActiveVal(v) ? 'active' : 'paid'} type="loan" />,
    },
    {
      key: 'actions',
      label: '',
      render: (_, r) => {
        const active = isActiveVal(r.is_active)
        const zeroBalance = parseFloat(r.balance || 0) === 0
        if (!active || !canModify) return null
        return (
          <button
            className={`btn-danger text-xs py-1 px-2.5 flex items-center gap-1${!zeroBalance ? ' opacity-50 cursor-not-allowed' : ''}`}
            disabled={!zeroBalance}
            title={!zeroBalance ? 'Баланс должен быть равен 0' : 'Закрыть счёт'}
            onClick={() => handleClose(r)}
          >
            <X className="w-3.5 h-3.5" />
            Закрыть
          </button>
        )
      },
    },
  ]

  // ── Рендер ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4">

      {/* Заголовок + кнопка */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Счета</h1>
        {canModify && (
          <button
            className="btn-primary flex items-center gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Открыть счёт
          </button>
        )}
      </div>

      {/* Фильтр + таблица */}
      <div className="card">
        <div className="p-4 border-b border-navy-700 flex gap-2 flex-wrap">
          <button
            className={`btn text-xs py-1 px-3 ${typeFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTypeFilter('')}
          >
            Все типы
          </button>
          {ACCOUNT_TYPES.map(t => (
            <button
              key={t.value}
              className={`btn text-xs py-1 px-3 ${typeFilter === t.value ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTypeFilter(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={accounts}
          loading={loading}
          emptyText="Счета не найдены"
        />
      </div>

      {/* Модалка: открыть счёт */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Открыть счёт"
      >
        <form onSubmit={handleAdd} className="space-y-4">

          <div>
            <label className="label">Клиент</label>
            <select
              className="input"
              required
              value={form.client_id}
              onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            >
              <option value="">— выберите клиента —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {`${c.last_name ?? ''} ${c.first_name ?? ''} ${c.middle_name ?? ''}`.trim()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Тип счёта</label>
            <select
              className="input"
              value={form.account_type}
              onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Валюта</label>
            <select
              className="input"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Начальный баланс</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.initial_balance}
              onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Процентная ставка, %</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.interest_rate}
              onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAddOpen(false)}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Открыть'}
            </button>
          </div>

        </form>
      </Modal>
    </div>
  )
}
