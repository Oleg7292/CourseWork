import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium min-w-72 max-w-sm
            ${t.type === 'success' ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100' : ''}
            ${t.type === 'error'   ? 'bg-red-900/90 border-red-700 text-red-100' : ''}
            ${t.type === 'info'    ? 'bg-navy-800/90 border-navy-600 text-slate-100' : ''}`}>
            {t.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />}
            {t.type === 'error'   && <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />}
            {t.type === 'info'    && <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-navy-300" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-current opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
