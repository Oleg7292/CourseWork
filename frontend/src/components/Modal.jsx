import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} card shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
