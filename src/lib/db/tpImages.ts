/**
 * Image de couverture d'un TP dans le catalogue.
 *
 * Écriture réservée à l'administrateur — la règle est posée en base (RLS de la
 * migration 0010), pas seulement dans l'interface : un appel direct à l'API par
 * un professeur est refusé par Postgres. Le contrôle côté écran n'est là que
 * pour ne pas proposer un bouton qui échouerait.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface TpImage {
  tpId: string;
  url: string;
  updatedAt: string;
}

interface TpImageRow { tp_id: string; url: string; updated_at: string }

/** Images posées, indexées par identifiant de TP. Silencieux en cas d'erreur : le
 *  catalogue doit s'afficher même si la table n'existe pas encore. */
export async function getTpImages(sb: SupabaseClient): Promise<Record<string, string>> {
  const { data, error } = await sb.from('tp_images').select('tp_id, url, updated_at');
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const r of data as TpImageRow[]) out[r.tp_id] = r.url;
  return out;
}

export async function listTpImages(sb: SupabaseClient): Promise<TpImage[]> {
  const { data, error } = await sb
    .from('tp_images')
    .select('tp_id, url, updated_at')
    .order('tp_id');
  if (error || !data) return [];
  return (data as TpImageRow[]).map(r => ({ tpId: r.tp_id, url: r.url, updatedAt: r.updated_at }));
}

/**
 * Dépose le fichier dans le bucket puis enregistre son adresse.
 * Le nom du fichier porte un horodatage : sans lui, le navigateur continuerait
 * d'afficher l'ancienne image depuis son cache après un remplacement.
 */
export async function setTpImage(
  sb: SupabaseClient, tpId: string, file: File,
): Promise<{ url: string }> {
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const chemin = `${tpId}-${Date.now()}.${ext || 'jpg'}`;
  const { error: up } = await sb.storage.from('tp-images').upload(chemin, file, {
    cacheControl: '3600', upsert: true, contentType: file.type || 'image/jpeg',
  });
  if (up) throw new Error(up.message);

  const { data } = sb.storage.from('tp-images').getPublicUrl(chemin);
  const url = data.publicUrl;

  const { data: me } = await sb.auth.getUser();
  const { error } = await sb.from('tp_images').upsert({
    tp_id: tpId, url, updated_by: me.user?.id ?? null, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { url };
}

/** Retire l'image : le catalogue reprend le montage automatique des appareils. */
export async function clearTpImage(sb: SupabaseClient, tpId: string): Promise<void> {
  const { error } = await sb.from('tp_images').delete().eq('tp_id', tpId);
  if (error) throw new Error(error.message);
}
