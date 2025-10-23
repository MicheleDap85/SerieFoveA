import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function useTeamsMap() {
  const [map, setMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, logo_url, player_name')
      if (!alive) return
      if (error) setError(error)
      else {
        const m = {}
        data?.forEach(t => { m[t.id] = t })
        setMap(m)
      }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const get = useMemo(() => (id) => map[id] || null, [map])
  return { map, get, loading, error }
}
