import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Неверный логин или пароль')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center mb-4 shadow-lg">
            <Building2 className="w-7 h-7 text-navy-200" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">БанкDB</h1>
          <p className="text-sm text-slate-500 mt-1">Система управления базой данных</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Логин</label>
            <input
              className="input"
              type="text"
              placeholder="login"
              autoComplete="username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Пароль</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
