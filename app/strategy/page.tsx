'use client'
import { useState } from 'react'

export default function EstrategiaDanca() {
  const [pass, setPass] = useState('')
  const [isAuth, setIsAuth] = useState(false)

  const checkPass = () => {
    if (pass === 'Danca2026') { // Tu contraseña
      setIsAuth(true)
    } else {
      alert('Contraseña incorrecta')
    }
  }

  if (isAuth) {
    return <iframe src="/danca.html" className="w-full h-screen border-none" />
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0A1628]">
      <h2 className="text-white mb-4 font-bold">Acceso Privado - Danca Remit</h2>
      <input 
        type="password" 
        onChange={(e) => setPass(e.target.value)}
        className="p-2 rounded mb-2 text-black"
        placeholder="Ingresa la clave"
      />
      <button onClick={checkPass} className="bg-[#00C9B1] px-4 py-2 rounded font-bold">
        Entrar
      </button>
    </div>
  )
}