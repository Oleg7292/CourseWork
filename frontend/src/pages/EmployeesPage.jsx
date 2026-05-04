import { useEffect, useState } from 'react'
import { api } from '../api'
import { useToast } from '../components/Toast'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { Plus, UserX, Loader2 } from 'lucide-react'

const fmt = (v) => v ? new Date(v).toLocaleDateString('ru-RU') : '—'
const fmtMoney = (v) => parseFloat(v || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽'

export default function EmployeesPage() {
  const toast = useToast()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.getEmployees().then(d => setEmployees(d.employees || d)).catch(e=>toast(e.message,'error')).finally(()=>setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.createEmployee({ ...form, salary: parseFloat(form.salary) })
      toast('Сотрудник добавлен','success'); setAddOpen(false); setForm({}); load()
    } catch(err) { toast(err.message,'error') } finally { setSaving(false) }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Деактивировать сотрудника?')) return
    try { await api.deleteEmployee(id); toast('Сотрудник деактивирован','success'); load() }
    catch(err) { toast(err.message,'error') }
  }

  const columns = [
    { key: 'last_name', label: 'ФИО', render: (_,r) => `${r.last_name} ${r.first_name} ${r.middle_name||''}` },
    { key: 'position', label: 'Должность' },
    { key: 'department_name', label: 'Отдел', render: v => v || '—' },
    { key: 'phone', label: 'Телефон' },
    { key: 'salary', label: 'Зарплата', render: v => <span className="tabular-nums">{fmtMoney(v)}</span> },
    { key: 'hire_date', label: 'Принят', render: v => fmt(v) },
    { key: 'is_active', label: 'Статус', render: v => (
      <span className={`badge ${v ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-red-900/60 text-red-300 border border-red-700'}`}>
        {v ? 'Активен' : 'Неактивен'}
      </span>
    )},
    { key: 'id', label: '', render: (_,r) => r.is_active ? (
      <button onClick={() => handleDeactivate(r.id)} className="btn-ghost p-1.5 hover:text-red-400"><UserX className="w-4 h-4" /></button>
    ) : null },
  ]

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Сотрудники</h1>
        <button onClick={() => { setAddOpen(true); setForm({}) }} className="btn-primary"><Plus className="w-4 h-4" /> Добавить</button>
      </div>

      <div className="card">
        <DataTable columns={columns} data={employees} loading={loading} emptyText="Сотрудники не найдены" />
      </div>

      <Modal open={addOpen} onClose={() => { setAddOpen(false); setForm({}) }} title="Новый сотрудник" size="lg">
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
          {[
            ['last_name','Фамилия',true],['first_name','Имя',true],['middle_name','Отчество',false],
            ['position','Должность',true],['phone','Телефон',false,'tel'],['email','Email',false,'email'],
            ['hire_date','Дата приёма',true,'date'],['salary','Зарплата',true,'number'],
          ].map(([k,l,req,t='text']) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input className="input" type={t} required={req} value={form[k]||''}
                onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} />
            </div>
          ))}
          <div className="col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setAddOpen(false); setForm({}) }} className="btn-secondary">Отмена</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
