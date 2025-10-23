// src/utils/logo.js
import { supabase } from '../supabaseClient'

/**
 * Restituisce l'URL pubblico del logo di una squadra.
 * Accetta sia un URL completo sia un semplice filename/path salvato in DB.
 */
export function teamLogoUrl(pathOrUrl, {
  bucket = 'team-logos',
  folder = 'teams'
} = {}) {
  if (!pathOrUrl) return ''
  // Se è già un URL http(s), lo usiamo così com'è
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl

  // Se è solo il filename, premettiamo la cartella
  const path = pathOrUrl.startsWith(folder + '/')
    ? pathOrUrl
    : `${folder}/${pathOrUrl}`

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl || ''
}
