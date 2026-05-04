import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../context/useAuth'
import { useToast } from '../components/Toast'
import DataTable from '../components/DataTable'
import Badge from '../components/Badge'
import { Filter } from 'lucide-react'

const fmtMoney = (v) =>
  parseFloat(v || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })

const fmtDate = (v) =>
  v ? new Date(v).toLocaleString('ru-RU') : '—'

const TX_TYPES = [
  'deposit',
  'withdrawal',
  'transfer_in',
  'transfer_out',
  'loan_payment',
  'fee',
  'interest',
]

const TX_LABELS = {
  deposit:      'Пополнение',
  withdrawal:   'Снятие',
  transfer_in:  'Поступление',
  transfer_out: 'Перевод',
  loan_payment: 'Платёж',
  fee:          'Комиссия',
  interest:     'Проценты',
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const toast = useToast()

  const [txs, setTxs]               = useState([])
  const [loading, setLoading]       = useState(true)
  const [typeFilter, setTypeFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (typeFilter) params.type = typeFilter
    api
      .getTransactions(params)
      .then((d) => setTxs(d.transactions ?? d))
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }, [typeFilter])

  useEffect(() => { load() }, [load])

  const columns = [
    {
      key: 'created_at',
      label: 'Дата',
      render: (v) => fmtDate(v),
    },
    {
      key: 'account_number',
      label: 'Счёт',
      render: (_, row) => row.account_number || '—',
    },
    {
      key: 'transaction_type',
      label: 'Тип',
      render: (v) => <Badge status={v} type="tx" />,
    },
    {
      key: 'amount',
      label: 'Сумма',
      render: (v, row) => {
        const isOut =
          row.transaction_type === 'withdrawal'   ||
          row.transaction_type === 'transfer_out' ||
          row.transaction_type === 'loan_payment' ||
          row.transaction_type === 'fee'
        return (
          <span className={isOut ? 'text-red-400' : 'text-emerald-400'}>
            {isOut ? '−' : '+'}&nbsp;{fmtMoney(v)}&nbsp;₽
          </span>
        )
      },
    },
    {
      key: 'balance_after',
      label: 'Остаток',
      render: (v) => (
        <span className="tabular-nums text-slate-300">
          {fmtMoney(v)}&nbsp;₽
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Описание',
      render: (v) => v || '—',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Транзакции</h1>

      {/* Фильтр по типу */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <Filter size={16} className="text-slate-400 shrink-0" />
        <span className="label mb-0">Тип:</span>
        <select
          className="input w-48"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Все</option>
          {TX_TYPES.map((t) => (
            <option key={t} value={t}>
              {TX_LABELS[t]}
            </option>
          ))}
        </select>
        {typeFilter && (
          <button
            className="btn btn-ghost text-sm"
            onClick={() => setTypeFilter('')}
          >
            Сбросить
          </button>
        )}
      </div>

      <DataTable columns={columns} data={txs} loading={loading} />
    </div>
  )
}
