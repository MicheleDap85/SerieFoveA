import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
const nav = useNavigate()
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [err, setErr] = useState('')

async function handleSignIn(e){
e.preventDefault()
setErr('')
const { error } = await supabase.auth.signInWithPassword({ email, password })
if (error) setErr(error.message)
else nav('/admin/aggiungi-squadra')
}

return (
<main className="auth container">
<h2>Area Riservata</h2>
<form onSubmit={handleSignIn} className="card">
<label>Email
<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
</label>
<label>Password
<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
</label>
{err && <p className="error">{err}</p>}
<button>Entra</button>
</form>
</main>
)
}