import type { Metadata } from 'next';
import { TPS } from '@/lib/data/tps';
import { spriteUrl } from '@/lib/data/catalogue';
import { tpSprites } from '@/components/parcours/tpSprites';
import { createClient } from '@/lib/supabase/server';
import { getTpImages } from '@/lib/db/tpImages';
import { classementDe } from '@/lib/taxonomy/classement';
import CatalogueClient, { type CarteTp } from './CatalogueClient';

export const metadata: Metadata = {
  title: 'Catalogue des TP · SimulElec',
  description: 'Travaux pratiques d\'électrotechnique simulés, classés par domaine professionnel : du cahier des charges à la mise en service.',
};

const SCENE_LABEL: Record<string, string> = {
  ind: 'armoire industrielle',
  hab: 'tableau d\'habitation',
  ter: 'coffret tertiaire',
  pv: 'coffret photovoltaïque',
};

/**
 * Catalogue des TP — shell serveur.
 *
 * Il charge les images de couverture posées par l'administrateur et réduit les TP
 * fournis à ce que la carte affiche (on n'envoie pas la définition complète au
 * navigateur). Le composant client y ajoute les TP publiés par les professeurs, puis
 * filtre et groupe le tout par domaine professionnel.
 */
export default async function CataloguePage() {
  // Image de couverture posée par l'administrateur, s'il y en a une : elle
  // remplace le montage automatique des photos d'appareils.
  const images = await getTpImages(createClient());

  const fournis: CarteTp[] = TPS.map((tp) => ({
    id: tp.id,
    title: tp.title,
    summary: tp.summary,
    level: tp.level,
    competences: tp.competences,
    contexte: SCENE_LABEL[tp.scene] ?? null,
    kind: tp.kind ?? null,
    playable: tp.playable,
    prof: false,
    generated: false,
    validatedAt: null,
    sprites: tpSprites(tp.id).map((k) => spriteUrl(k)),
    classement: classementDe(tp),
  }));

  return <CatalogueClient fournis={fournis} images={images} />;
}
