import { supabase } from '../supabaseClient'

/**
 * Genera un calendario round-robin (tutti contro tutti).
 * In questa versione creiamo **4 cicli**: Andata1, Ritorno1, Andata2, Ritorno2.
 * - Ogni coppia di squadre si affronta 4 volte (2 in casa, 2 fuori).
 * - Ruotiamo l'ordine giornate nei cicli 3-4 per distribuire meglio i rematch.
 * - Le date vengono salvate per completezza, ma nel front-end non vengono mostrate.
 */
export async function generateCalendar() {
  // Evita duplicati se il calendario esiste già
  const { count } = await supabase
    .from('matchdays')
    .select('id', { count: 'exact', head: true })
  if ((count || 0) > 0) {
    throw new Error('Calendario già presente: elimina o svuota le giornate prima di rigenerare.')
  }

  // Prendi le squadre
  const { data: teams, error: tErr } = await supabase.from('teams').select('id')
  if (tErr) throw tErr
  if (!teams || teams.length < 2) throw new Error('Servono almeno 2 squadre')

  const ids = teams.map(t => t.id)

  // Se dispari, aggiungi un bye (null)
  const even = ids.length % 2 === 0 ? ids : [...ids, null]
  const n = even.length
  const rounds = n - 1

  // Round-robin (metodo "circle")
  function buildBasePairs(arr) {
    const a = arr.slice()
    const all = []
    for (let r = 0; r < rounds; r++) {
      const day = []
      for (let i = 0; i < n / 2; i++) {
        const h = a[i]
        const w = a[n - 1 - i]
        if (h && w) day.push([h, w])
      }
      all.push(day)
      // ruota mantenendo fisso il primo
      a.splice(1, 0, a.pop())
    }
    return all
  }

  const base = buildBasePairs(even)

  // Helper per ruotare l’ordine delle giornate (per non duplicare il palinsesto)
  const rotate = (arr, offset) => arr.slice(offset).concat(arr.slice(0, offset))

  // 2 andate + 2 ritorni
  const CYCLES = 4
  const baseRot = rotate(base, 1)

  const cycles = [
    // Andata 1
    base.map(day => day.map(([h, a]) => [h, a])),
    // Ritorno 1
    base.map(day => day.map(([h, a]) => [a, h])),
    // Andata 2 (ruotata)
    baseRot.map(day => day.map(([h, a]) => [h, a])),
    // Ritorno 2 (ruotata + invertita)
    baseRot.map(day => day.map(([h, a]) => [a, h])),
  ].slice(0, CYCLES)

  // Opzionale: assegniamo date tecniche (una ogni 7 giorni) — NON verranno mostrate in UI
  let mdCounter = 1
  let currentDate = new Date()
  const addDays = (d, days) => {
    const x = new Date(d)
    x.setDate(x.getDate() + days)
    return x.toISOString()
  }

  for (const cyc of cycles) {
    for (const day of cyc) {
      // crea la giornata
      const { data: md, error: mdErr } = await supabase
        .from('matchdays')
        .insert({
          matchday_number: mdCounter,
          matchday_date: addDays(currentDate, (mdCounter - 1) * 7), // non visualizzata in UI
        })
        .select()
        .single()
      if (mdErr) throw mdErr

      // inserisci le partite della giornata
      const rows = day.map(([home, away]) => ({
        matchday_id: md.id,
        home_team: home,
        away_team: away,
        home_goals: null,
        away_goals: null,
      }))
      const { error: mErr } = await supabase.from('matches').insert(rows)
      if (mErr) throw mErr

      mdCounter++
    }
  }

  return { createdMatchdays: mdCounter - 1 }
}
