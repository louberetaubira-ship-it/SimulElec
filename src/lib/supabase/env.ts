/**
 * Coordonnées publiques du projet Supabase « simulelec ».
 * La clé « publishable » est conçue pour être exposée côté client (les droits sont portés par la RLS) ;
 * les valeurs par défaut évitent un déploiement cassé quand les variables d'environnement manquent.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mlbbzkjttloqaptkvamp.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_av2nqan8BdM8XKXMC9bGJA_Cg_mweAF';
