import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/useAuth'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import {
  ArrowLeft, User, CreditCard, Landmark,
  Phone, Mail, MapPin, Calendar, FileText,
  Pencil, Loader2,
} from 'lucide-react'

const fmt = (v) => v ? new Date(v).toLocaleDateString('ru-RU') : '—'
const fmtMoney = (v) => parseFloat(v || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽'

const ACCOUNT_TYPE_LABEL = {
  checking: 'Расчётный',
  savings: 'Сберегательный',
  deposit: 'Депозит',
  credit: 'Кредитный',
}
const LOAN_STATUS_VARIANT = {
  pending: 'warning',
  approved: 'info',
  active: 'success',
  paid: 'default',
  rejected: 'danger',
  overdue: 'danger',
}
const LOAN_STATUS_LABEL = {
  pending: 'На рассмотрении',
  approved: 'Одобрен',
  active: 'Активный',
  paid: 'Погашен',
  rejected: 'Отклонён',
  overdue: 'Просрочен',
}
const LOAN_TYPE_LABEL = {
  consumer: 'Потребительский',
  mortgage: 'Ипотека',
  auto: 'Автокредит',
  business: 'Бизнес',
}

export default function ClientPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('accounts') // 'accounts' | 'loans'

  // Редактирование
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ phone: '', email: '', address: '' })
  const [saving, setSaving] = useState(false)

  const canModify = user?.role === 'admin' || user?.role === 'operator'

  const loadClient = () => {
    setLoading(true)
    api.getClient(id)
      .then(data => {
        setClient(data)
        setEditForm({
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
        })
      })
      .catch(e => {
        toast(e.message, 'error')
        navigate('/clients')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadClient() }, [id])

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateClient(id, editForm)
      toast('Данные клиента обновлены', 'success')
      setEditOpen(false)
      loadClient()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        Загрузка...
      </div>
    )
  }

  if (!client) return null

  const accounts = client.accounts ?? []
  const loans = client.loans ?? []
  const fullName = [client.last_name, client.first_name, client.middle_name].filter(Boolean).join(' ')

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Шапка */}
      <div className="flex items-center gap-4">
        <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => navigate('/clients')}>
          <ArrowLeft size={16} />
          Клиенты
        </button>
      </div>

      {/* Карточка клиента */}
      <div className="card space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`badge ${client.is_active ? 'badge-success' : 'badge-danger'}`}>
                  {client.is_active ? 'Активен' : 'Неактивен'}
                </span>
                <span className="text-xs text-slate-500">ID: {client.id}</span>
              </div>
            </div>
          </div>
          {canModify && (
            <button className="btn-secondary" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4" />
              Редактировать
            </button>
          )}
        </div>

        {/* Основные данные */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
          <InfoRow icon={<FileText size={14} />} label="Паспорт">
            {client.passport_series && client.passport_number
              ? <span className="font-mono">{client.passport_series} {client.passport_number}</span>
              : '—'}
          </InfoRow>
          <InfoRow icon={<Calendar size={14} />} label="Дата рождения">
            {fmt(client.birth_date)}
          </InfoRow>
          <InfoRow icon={<Phone size={14} />} label="Телефон">
            {client.phone || '—'}
          </InfoRow>
          <InfoRow icon={<Mail size={14} />} label="Email">
            {client.email || '—'}
          </InfoRow>
          <InfoRow icon={<MapPin size={14} />} label="Адрес" wide>
            {client.address || '—'}
          </InfoRow>
          {client.inn && (
            <InfoRow icon={<FileText size={14} />} label="ИНН">
              {client.inn}
            </InfoRow>
          )}
          <InfoRow icon={<Calendar size={14} />} label="Клиент с">
            {fmt(client.created_at)}
          </InfoRow>
        </div>
      </div>

      {/* Вкладки */}
      <div>
        <div className="flex gap-1 border-b border-slate-700/50 mb-4">
          <TabBtn active={tab === 'accounts'} onClick={() => setTab('accounts')}>
            <Landmark size={14} />
            Счета ({accounts.length})
          </TabBtn>
          <TabBtn active={tab === 'loans'} onClick={() => setTab('loans')}>
            <CreditCard size={14} />
            Кредиты ({loans.length})
          </TabBtn>
        </div>

        {/* Счета */}
        {tab === 'accounts' && (
          <div className="space-y-2">
            {accounts.length === 0 ? (
              <EmptyState icon={<Landmark size={28} />} text="У клиента нет счетов" />
            ) : accounts.map(a => (
              <div key={a.id} className="card flex items-center justify-between gap-4 py-3 px-4 flex-wrap">
                <div>
                  <p className="font-mono text-sm text-white">{a.account_number}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ACCOUNT_TYPE_LABEL[a.account_type] ?? a.account_type} · {a.currency}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white tabular-nums">{fmtMoney(a.balance)}</p>
                  <span className={`badge text-xs ${a.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {a.is_active ? 'Открыт' : 'Закрыт'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Кредиты */}
        {tab === 'loans' && (
          <div className="space-y-2">
            {loans.length === 0 ? (
              <EmptyState icon={<CreditCard size={28} />} text="У клиента нет кредитов" />
            ) : loans.map(l => (
              <div key={l.id} className="card space-y-2 py-3 px-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-white">
                      {LOAN_TYPE_LABEL[l.loan_type] ?? l.loan_type}
                      {l.purpose ? ` — ${l.purpose}` : ''}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fmt(l.start_date)} → {fmt(l.end_date)} · {l.term_months} мес.
                    </p>
                  </div>
                  <Badge variant={LOAN_STATUS_VARIANT[l.status] ?? 'default'}>
                    {LOAN_STATUS_LABEL[l.status] ?? l.status}
                  </Badge>
                </div>
                <div className="flex gap-6 text-sm flex-wrap">
                  <div>
                    <span className="text-slate-400">Сумма: </span>
                    <span className="text-white tabular-nums">{fmtMoney(l.amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Остаток: </span>
                    <span className="text-white tabular-nums">{fmtMoney(l.remaining_amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Ставка: </span>
                    <span className="text-white">{l.interest_rate}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Платёж/мес: </span>
                    <span className="text-white tabular-nums">{fmtMoney(l.monthly_payment)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно: редактирование */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Редактировать контакты"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="label">Телефон</label>
            <input
              className="input"
              placeholder="+7 (999) 000-00-00"
              value={editForm.phone}
              onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="example@mail.ru"
              value={editForm.email}
              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Адрес</label>
            <input
              className="input"
              placeholder="г. Москва, ул. Примерная, д. 1"
              value={editForm.address}
              onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(false)}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              Сохранить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ─── Вспомогательные компоненты ───────────────────────────────────────────────

function InfoRow({ icon, label, children, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm text-slate-200">{children}</div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors
        ${active
          ? 'border-blue-500 text-blue-400'
          : 'border-transparent text-slate-400 hover:text-slate-200'
        }`}
    >
      {children}
    </button>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  )
}
