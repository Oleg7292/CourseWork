import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../context/useAuth'
import { useToast } from '../components/Toast'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import { Plus, CreditCard, RefreshCw, Loader2 } from 'lucide-react'

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmtMoney = (v) =>
  parseFloat(v || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })
const fmt = (v) => (v ? new Date(v).toLocaleDateString('ru-RU') : '—')

/* ─── constants ───────────────────────────────────────────────────────────── */
const LOAN_TYPES = ['consumer', 'mortgage', 'auto', 'business']
const LOAN_TYPE_LABELS = {
  consumer: 'Потребительский',
  mortgage: 'Ипотека',
  auto: 'Авто',
  business: 'Бизнес',
}
const STATUSES = ['pending', 'approved', 'active', 'paid', 'rejected', 'overdue']
const STATUS_LABELS = {
  '': 'Все',
  pending: 'На рассмотрении',
  approved: 'Одобрен',
  active: 'Активный',
  paid: 'Погашен',
  rejected: 'Отклонён',
  overdue: 'Просрочен',
}
const PAYABLE_STATUSES = ['active', 'overdue']

/* ─── аннуитетный расчёт ─────────────────────────────────────────────────── */
function calcMonthly(amount, rate, months) {
  const P = parseFloat(amount)
  const r = parseFloat(rate) / 100 / 12
  const n = parseInt(months, 10)
  if (!P || !n || n <= 0) return null
  if (r === 0) return P / n
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function LoansPage() {
  const { user } = useAuth()
  const toast = useToast()

  /* ── data ── */
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(false)  // ← новый флаг
  const [accounts, setAccounts] = useState([])

  /* ── UI ── */
  const [statusFilter, setStatusFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(null)
  const [statusOpen, setStatusOpen] = useState(null)

  /* ── forms ── */
  const [form, setForm] = useState({
    loan_type: 'consumer',
    interest_rate: '12',
    term_months: '12',
  })
  const [payForm, setPayForm] = useState({})
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)

  /* ── роли ── */
  const isAdminOrOperator = user?.role === 'admin' || user?.role === 'operator'
  const isAdmin = user?.role === 'admin'

  /* ── загрузка кредитов ── */
  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (statusFilter) params.status = statusFilter
    api
      .getLoans(params)
      .then((d) => setLoans(d.loans ?? []))
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    api
      .getAccounts()
      .then((d) => setAccounts((d.accounts ?? []).filter((a) => a.is_active)))
      .catch((e) => toast(`Счета: ${e.message}`, 'error'))
  }, [])

  const openAddModal = () => {
    setAddOpen(true)
    setForm({ loan_type: 'consumer', interest_rate: '12', term_months: '12' })

    setClientsLoading(true)
    api
      .getClients()
      .then((d) => {
        // api/index.js уже нормализует в { clients:[...] }
        setClients(d.clients ?? [])
      })
      .catch((e) => {
        console.error('[LoansPage] getClients error:', e)
        toast(`Не удалось загрузить клиентов: ${e.message}`, 'error')
      })
      .finally(() => setClientsLoading(false))
  }

  /* ── handlers ── */
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.client_id) { toast('Выберите клиента', 'error'); return }
    setSaving(true)
    try {
      await api.createLoan({
        ...form,
        amount: parseFloat(form.amount),
        interest_rate: parseFloat(form.interest_rate),
        term_months: parseInt(form.term_months, 10),
      })
      toast('Кредит оформлен', 'success')
      setAddOpen(false)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePayment = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.loanPayment(payOpen.id, {
        amount: parseFloat(payForm.amount),
        account_id: parseInt(payForm.account_id, 10),
      })
      toast('Платёж принят', 'success')
      setPayOpen(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (e) => {
    e.preventDefault()
    if (!newStatus || newStatus === statusOpen?.status) {
      toast('Выберите новый статус', 'error')
      return
    }
    setSaving(true)
    try {
      await api.updateLoanStatus(statusOpen.id, { status: newStatus })
      toast('Статус обновлён', 'success')
      setStatusOpen(null)
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const openPaymentModal = (loan) => {
    const clientAccounts = accounts.filter((a) => a.client_id === loan.client_id)
    setPayOpen({ ...loan, clientAccounts })
    setPayForm({ amount: loan.monthly_payment || '' })
  }

  /* ── колонки ── */
  const columns = [
    {
      key: 'client_name',
      label: 'Клиент',
      render: (_, r) => `${r.last_name || ''} ${r.first_name || ''}`.trim() || '—',
    },
    {
      key: 'loan_type',
      label: 'Тип',
      render: (v) => <Badge status={v} type="loan" />,
    },
    {
      key: 'amount',
      label: 'Сумма, ₽',
      render: (v) => <span className="tabular-nums">{fmtMoney(v)}</span>,
    },
    {
      key: 'remaining_amount',
      label: 'Остаток, ₽',
      render: (v) => <span className="tabular-nums text-orange-400">{fmtMoney(v)}</span>,
    },
    {
      key: 'interest_rate',
      label: 'Ставка',
      render: (v) => `${parseFloat(v || 0).toFixed(1)}%`,
    },
    {
      key: 'monthly_payment',
      label: 'Платёж/мес',
      render: (v) => <span className="tabular-nums">{fmtMoney(v)}</span>,
    },
    {
      key: 'status',
      label: 'Статус',
      render: (v) => <Badge status={v} type="loan" />,
    },
    { key: 'start_date', label: 'С', render: (v) => fmt(v) },
    { key: 'end_date',   label: 'По', render: (v) => fmt(v) },
    {
      key: 'id',
      label: '',
      render: (_, r) => (
        <div className="flex gap-1.5 justify-end">
          {isAdminOrOperator && PAYABLE_STATUSES.includes(r.status) && (
            <button
              onClick={() => openPaymentModal(r)}
              className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Платёж
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => { setStatusOpen(r); setNewStatus(r.status) }}
              className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Статус
            </button>
          )}
        </div>
      ),
    },
  ]

  /* ── render ── */
  return (
    <div className="p-6 space-y-4">

      {/* заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Кредиты</h1>
        {isAdminOrOperator && (
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Оформить кредит
          </button>
        )}
      </div>

      {/* таблица */}
      <div className="card">
        <div className="p-4 border-b border-navy-700 flex gap-2 flex-wrap">
          {['', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`btn text-xs py-1 px-3 ${
                statusFilter === s ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
        <DataTable
          columns={columns}
          data={loans}
          loading={loading}
          emptyText="Кредиты не найдены"
        />
      </div>

      {/* ════════════════════════════════════════════════
          Модал: Оформить кредит
      ════════════════════════════════════════════════ */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Оформить кредит"
        size="lg"
      >
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">

          {/* клиент — с индикатором загрузки и сообщением об ошибке */}
          <div className="col-span-2">
            <label className="label">Клиент</label>
            <select
              className="input"
              required
              disabled={clientsLoading}
              value={form.client_id || ''}
              onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
            >
              {clientsLoading ? (
                <option value="">Загрузка…</option>
              ) : clients.length === 0 ? (
                <option value="">Нет доступных клиентов</option>
              ) : (
                <>
                  <option value="">— выберите —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.last_name} {c.first_name}
                      {c.middle_name ? ` ${c.middle_name}` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
            {/* индикатор под полем */}
            {clientsLoading && (
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Загрузка списка клиентов…
              </p>
            )}
          </div>

          {/* тип */}
          <div>
            <label className="label">Тип кредита</label>
            <select
              className="input"
              value={form.loan_type}
              onChange={(e) => setForm((f) => ({ ...f, loan_type: e.target.value }))}
            >
              {LOAN_TYPES.map((t) => (
                <option key={t} value={t}>{LOAN_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* сумма */}
          <div>
            <label className="label">Сумма (₽)</label>
            <input
              className="input"
              type="number"
              min="1000"
              step="100"
              required
              placeholder="100 000"
              value={form.amount || ''}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>

          {/* ставка */}
          <div>
            <label className="label">Ставка (% годовых)</label>
            <input
              className="input"
              type="number"
              min="1"
              max="100"
              step="0.1"
              required
              value={form.interest_rate}
              onChange={(e) => setForm((f) => ({ ...f, interest_rate: e.target.value }))}
            />
          </div>

          {/* срок */}
          <div>
            <label className="label">Срок (месяцев)</label>
            <input
              className="input"
              type="number"
              min="1"
              max="360"
              required
              value={form.term_months}
              onChange={(e) => setForm((f) => ({ ...f, term_months: e.target.value }))}
            />
          </div>

          {/* цель */}
          <div className="col-span-2">
            <label className="label">Цель кредита</label>
            <input
              className="input"
              type="text"
              placeholder="Например: покупка автомобиля"
              value={form.purpose || ''}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
            />
          </div>

          {/* предварительный расчёт */}
          {form.amount && form.interest_rate && form.term_months && (() => {
            const m = calcMonthly(form.amount, form.interest_rate, form.term_months)
            if (!m) return null
            return (
              <div className="col-span-2 rounded-lg bg-navy-800 px-4 py-2.5 text-sm text-slate-400">
                Примерный ежемесячный платёж:{' '}
                <span className="font-semibold text-slate-200 tabular-nums">
                  {fmtMoney(m.toFixed(2))} ₽
                </span>
              </div>
            )
          })()}

          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary">
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || clientsLoading}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Оформить'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════
          Модал: Внести платёж
      ════════════════════════════════════════════════ */}
      <Modal
        open={!!payOpen}
        onClose={() => setPayOpen(null)}
        title={`Платёж по кредиту #${payOpen?.id}`}
      >
        <form onSubmit={handlePayment} className="space-y-4">
          <div className="rounded-lg bg-navy-800 px-4 py-3 text-sm space-y-1">
            <p className="text-slate-400">
              Клиент:{' '}
              <span className="text-slate-200 font-medium">
                {`${payOpen?.last_name || ''} ${payOpen?.first_name || ''}`.trim() || '—'}
              </span>
            </p>
            <p className="text-slate-400">
              Остаток долга:{' '}
              <span className="text-orange-400 font-semibold tabular-nums">
                {fmtMoney(payOpen?.remaining_amount)} ₽
              </span>
            </p>
            <p className="text-slate-400">
              Ежемесячный платёж:{' '}
              <span className="text-slate-200 font-semibold tabular-nums">
                {fmtMoney(payOpen?.monthly_payment)} ₽
              </span>
            </p>
          </div>

          <div>
            <label className="label">Счёт списания</label>
            <select
              className="input"
              required
              value={payForm.account_id || ''}
              onChange={(e) => setPayForm((f) => ({ ...f, account_id: e.target.value }))}
            >
              <option value="">— выберите —</option>
              {(payOpen?.clientAccounts?.length ? payOpen.clientAccounts : accounts).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_number}
                  {a.balance != null ? ` — ${fmtMoney(a.balance)} ₽` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Сумма платежа (₽)</label>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder={fmtMoney(payOpen?.monthly_payment)}
              value={payForm.amount || ''}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setPayOpen(null)} className="btn-secondary">
              Отмена
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Внести платёж'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ════════════════════════════════════════════════
          Модал: Смена статуса (только admin)
      ════════════════════════════════════════════════ */}
      <Modal
        open={!!statusOpen}
        onClose={() => setStatusOpen(null)}
        title={`Изменить статус кредита #${statusOpen?.id}`}
      >
        <form onSubmit={handleStatusChange} className="space-y-4">
          <div className="rounded-lg bg-navy-800 px-4 py-3 text-sm space-y-1">
            <p className="text-slate-400">
              Клиент:{' '}
              <span className="text-slate-200 font-medium">
                {`${statusOpen?.last_name || ''} ${statusOpen?.first_name || ''}`.trim() || '—'}
              </span>
            </p>
            <p className="text-slate-400">
              Сумма:{' '}
              <span className="text-slate-200 tabular-nums">
                {fmtMoney(statusOpen?.amount)} ₽
              </span>
            </p>
            <p className="text-slate-400">
              Текущий статус:{' '}
              <span className="text-slate-200 font-medium">
                {STATUS_LABELS[statusOpen?.status] ?? statusOpen?.status}
              </span>
            </p>
          </div>

          <div>
            <label className="label">Новый статус</label>
            <select
              className="input"
              required
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setStatusOpen(null)} className="btn-secondary">
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || newStatus === statusOpen?.status}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
