export default function Badge({ status, type = 'loan' }) {
  const loanColors = {
    pending:  'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
    approved: 'bg-blue-900/60   text-blue-300   border border-blue-700',
    active:   'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
    paid:     'bg-slate-700/60  text-slate-300  border border-slate-600',
    rejected: 'bg-red-900/60   text-red-300   border border-red-700',
    overdue:  'bg-orange-900/60 text-orange-300 border border-orange-700',
  }

  const accountColors = {
    checking: 'bg-sky-900/60    text-sky-300    border border-sky-700',
    savings:  'bg-teal-900/60   text-teal-300   border border-teal-700',
    deposit:  'bg-purple-900/60 text-purple-300 border border-purple-700',
    credit:   'bg-pink-900/60   text-pink-300   border border-pink-700',
  }

  const txColors = {
    deposit:      'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
    withdrawal:   'bg-red-900/60    text-red-300    border border-red-700',
    transfer_in:  'bg-blue-900/60   text-blue-300   border border-blue-700',
    transfer_out: 'bg-orange-900/60 text-orange-300 border border-orange-700',
    loan_payment: 'bg-purple-900/60 text-purple-300 border border-purple-700',
    fee:          'bg-slate-700/60  text-slate-300  border border-slate-600',
    interest:     'bg-teal-900/60   text-teal-300   border border-teal-700',
  }

  const roleColors = {
    admin:    'bg-red-900/60    text-red-300    border border-red-700',
    operator: 'bg-blue-900/60   text-blue-300   border border-blue-700',
    analyst:  'bg-teal-900/60   text-teal-300   border border-teal-700',
  }
  
  const labels = {
    // loans
    pending:  'Ожидание',
    approved: 'Одобрен',
    active:   'Активен',
    paid:     'Погашен',
    rejected: 'Отклонён',
    overdue:  'Просрочен',
    // accounts
    checking: 'Расчётный',
    savings:  'Сберегательный',
    deposit:  'Депозит',
    credit:   'Кредитный',
    // transactions
    withdrawal:   'Снятие',
    transfer_in:  'Поступление',
    transfer_out: 'Перевод',
    loan_payment: 'Платёж',
    fee:          'Комиссия',
    interest:     'Проценты',
    // loan types
    consumer: 'Потребительский',
    mortgage: 'Ипотека',
    auto:     'Автокредит',
    business: 'Бизнес',
    // roles
    admin:    'Администратор',
    operator: 'Оператор',
    analyst:  'Аналитик',
  }

  const map =
    type === 'account' ? accountColors :
    type === 'tx'      ? txColors      :
    type === 'role'    ? roleColors     :
    loanColors

  const cls =
    map[status] ?? 'bg-slate-700/60 text-slate-300 border border-slate-600'

  return (
    <span
      className={`badge ${cls}`}
    >
      {labels[status] ?? status}
    </span>
  )
}
