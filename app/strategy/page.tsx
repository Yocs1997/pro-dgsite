'use client'
import { useState } from 'react'

export default function EstrategiaDanca() {
  const [pass, setPass] = useState('')
  const [isAuth, setIsAuth] = useState(false)

  const checkPass = () => {
    // Tu contraseña actual
    if (pass === 'Danca2026') { 
      setIsAuth(true)
    } else {
      alert('Contraseña incorrecta')
    }
  }

  // Te permite entrar presionando "Enter" en el teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') checkPass()
  }

  if (isAuth) {
    return <iframe src="/danca.html" className="w-full h-screen border-none" />
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      {/* Decoración de fondo opcional */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#00C9B1 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="z-10 bg-white p-10 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md text-center">
        <div className="mb-6">
           <h2 className="text-2xl font-extrabold text-slate-800">Acceso Privado</h2>
           <p className="text-slate-500 mt-2 text-sm">Propuesta Estratégica — Danca Remit</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <input 
            type="password" 
            autoFocus
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-4 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00C9B1] focus:border-transparent transition-all"
            placeholder="Introduce la contraseña"
          />
          
          <button 
            onClick={checkPass} 
            className="w-full bg-[#0B1F3A] hover:bg-[#162F52] text-white py-4 rounded-xl font-bold transition-colors shadow-lg active:scale-[0.98]"
          >
            Entrar a la Presentación
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-400 uppercase tracking-widest font-semibold">
          Pro-DG Digital Agency
        </p>
      </div>
    </div>
  )
}