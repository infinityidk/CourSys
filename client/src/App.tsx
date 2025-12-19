import { useState } from 'react'
import Login from './views/Login'

export default function App() {
  const [auth, setAuth] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      {!auth ? <Login onLogin={() => setAuth(true)} /> : (
        <div className="text-center">
          <h1 className="text-2xl font-bold">Authenticated</h1>
          <p className="text-zinc-500">Ready to fetch JSON data...</p>
        </div>
      )}
    </div>
  )
}