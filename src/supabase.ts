import { createClient } from '@supabase/supabase-js'

// Clé publique (publishable), faite pour être dans la page : lecture des lignes actives seulement.
const URL_SUPABASE = 'https://vjvqyiaoipwxxnnrzmxt.supabase.co'
const CLE_PUBLIQUE = 'sb_publishable_xJjf7GbfAQpFQKXYf4szQA_xVyoJ8G4'

export const supabase = createClient(URL_SUPABASE, CLE_PUBLIQUE)
