import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AddTeamPage(){
const [name, setName] = useState('')
const [player, setPlayer] = useState('')
const [file, setFile] = useState(null)
const [msg, setMsg] = useState('')

async function handleSubmit(e){
e.preventDefault(); setMsg('')
let logo_url = null
if (file){
const path = `logos/${Date.now()}-${file.name}`
const { error: upErr } = await supabase.storage.from('team-logos').upload(path, file, { upsert: false })
if (upErr) { setMsg(upErr.message); return }
const { data } = await supabase.storage.from('team-logos').getPublicUrl(path)
logo_url = data.publicUrl
}
const { error } = await supabase.from('teams').insert({ name, player_name: player, logo_url })
setMsg(error? error.message : 'Squadra inserita!')
if (!error){ setName(''); setPlayer(''); setFile(null) }
}

return (
<main className="container">
<h2>Aggiungi Squadra</h2>
<form onSubmit={handleSubmit} className="card form">
<label>Nome squadra<input value={name} onChange={e=>setName(e.target.value)} required /></label>
<label>Nome giocatore<input value={player} onChange={e=>setPlayer(e.target.value)} /></label>
<label>Logo squadra<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} /></label>
<button>Salva</button>
{msg && <p className={/inserita/i.test(msg)?'ok':'error'}>{msg}</p>}
</form>
</main>
)
}