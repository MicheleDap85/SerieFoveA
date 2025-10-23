import { supabase } from '../supabaseClient'

export async function uploadTeamLogo(file) {
  if (!file) throw new Error('Nessun file selezionato')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeName = file.name.toLowerCase().replaceAll(' ', '-').replace(/[^a-z0-9_\-\.]/g, '')
  const path = `logos/${Date.now()}-${safeName}`

  const { error: upErr } = await supabase.storage
    .from('team-logos')
    .upload(path, file, {
      contentType: file.type || `image/${ext}`,
      cacheControl: '3600',
      upsert: false
    })
  if (upErr) throw upErr

  const { data } = supabase.storage.from('team-logos').getPublicUrl(path)
  const publicUrl = data?.publicUrl
  if (!publicUrl) throw new Error('Impossibile ottenere URL pubblico')
  return { publicUrl, path }
}