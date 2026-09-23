/**
 * Aides graduées d'une question (module pur, servi par `POST /api/sujet/aide`).
 *
 * Les aides de la donnée (`QuestionBase.aides`) font foi ; il en faut 3 (1 = où chercher,
 * 2 = méthode, 3 = forme de la réponse). Une aide manquante est remplacée par l'aide PAR DÉFAUT
 * du même niveau :
 *  1 — « Relis le DTR n (titre) » (pages DTR de la question), sinon l'énoncé et la mise en
 *      situation de la partie ;
 *  2 — l'`indice` de la question s'il existe, sinon une méthode selon l'outil ;
 *  3 — la forme de la réponse, générique selon l'outil (jamais la réponse).
 */
import { nomPageDtr } from '../dtr';
import { NB_AIDES } from '../public';
import type { SujetNumerique, SujetQuestion } from '../types';

/** Aide 1 par défaut : où chercher. */
function aideOu(s: Pick<SujetNumerique, 'dtr'>, q: SujetQuestion): string {
  if (q.dtr.length) {
    const pages = q.dtr.map(n => {
      const p = s.dtr.find(x => x.num === n);
      return `${nomPageDtr(s, n)}${p?.titre ? ` (${p.titre})` : ''}`;
    });
    return `📖 Relis ${pages.length > 1 ? 'les documents' : 'le'} ${pages.join(', ')} : la réponse s’y appuie.`;
  }
  return `📖 Relis l’énoncé et la mise en situation de la partie ${q.partie} (page ${q.pageSujet} du sujet) : toutes les données utiles y sont.`;
}

/** Aide 2 par défaut : méthode selon l'outil. */
function aideMethode(q: SujetQuestion): string {
  switch (q.type) {
    case 'cocher': return '🧭 Méthode : élimine d’abord les propositions manifestement fausses, puis vérifie chaque case restante dans le document.';
    case 'relier': return '🧭 Méthode : pour chaque élément de gauche, cherche sa définition ou sa caractéristique dans le document avant de tracer le trait.';
    case 'ordonner': return '🧭 Méthode : repère la première et la dernière étape, puis place les autres dans l’ordre logique de la procédure.';
    case 'valeur': return '🧭 Méthode : repère dans le document la ligne et la colonne qui correspondent aux données de l’énoncé, puis vérifie l’unité demandée.';
    case 'calcul': return '🧭 Méthode : écris la formule littérale avec les grandeurs de l’énoncé, remplace chaque grandeur par sa valeur dans la bonne unité, puis calcule et arrondis comme demandé.';
    case 'tableau': return '🧭 Méthode : complète le tableau ligne par ligne à partir des données du document et de l’énoncé ; vérifie les unités de chaque colonne.';
    case 'redige': return '🧭 Méthode : réponds avec le vocabulaire technique du document, en justifiant par la règle ou la donnée utilisée.';
    case 'bulles': return '🧭 Méthode : associe chaque bulle du plan à l’élément correspondant de la légende du document.';
    case 'placement': return '🧭 Méthode : applique les règles d’implantation du document (répartition régulière, distances aux parois, zone utile) et les données de l’énoncé.';
    case 'cavaliers': return '🧭 Méthode : lis la notice du configurateur : chaque position a une signification précise (adresse, mode, fonction).';
    case 'schema': return '🧭 Méthode : repère les bornes d’alimentation et de commande de chaque appareil, puis trace les liaisons une par une en suivant le schéma de principe du document.';
  }
}

/** Aide 3 par défaut : forme de la réponse (sans valeur). */
function aideForme(q: SujetQuestion): string {
  switch (q.type) {
    case 'cocher':
      return q.multiple || q.bonnes.length > 1
        ? '✏️ Forme de la réponse : coche toutes les cases justes (il peut y en avoir plusieurs, une case fausse retire des points).'
        : '✏️ Forme de la réponse : une seule case à cocher.';
    case 'relier': return '✏️ Forme de la réponse : un trait par élément de gauche, vers un seul élément de droite.';
    case 'ordonner': return `✏️ Forme de la réponse : un rang de 1 à ${q.items.length} pour chaque étape, sans doublon.`;
    case 'valeur':
      return `✏️ Forme de la réponse : ${q.champs.map(c => `${c.label} = …${c.unite ? ` ${c.unite}` : ''}`).join(' ; ')}.`;
    case 'calcul':
      return `✏️ Forme de la réponse : ${q.grandeur} = (formule littérale) = (application numérique) = …${q.unite ? ` ${q.unite}` : ''}${q.arrondi ? ` (${q.arrondi})` : ''}.`;
    case 'tableau': return '✏️ Forme de la réponse : une valeur ou un mot par case, dans l’unité de la colonne.';
    case 'redige': return '✏️ Forme de la réponse : une à trois phrases complètes, avec les mots techniques attendus.';
    case 'bulles': return `✏️ Forme de la réponse : une valeur par bulle${q.choix ? ', choisie dans la liste proposée' : ''}.`;
    case 'placement': {
      const nom = q.symbole === 'croix' ? 'une croix' : q.symbole === 'luminaire' ? 'un symbole par luminaire' : 'un repère';
      return `✏️ Forme de la réponse : ${nom} posé sur le plan à chaque emplacement${q.champs?.length ? ', puis les valeurs demandées sous le plan' : ''}.`;
    }
    case 'cavaliers': return '✏️ Forme de la réponse : une valeur par position de chaque configurateur (« — » quand il n’y en a pas).';
    case 'schema': return '✏️ Forme de la réponse : des traits de couleur entre les bornes (mode traits), puis le même montage sur la platine (mode câblage réel).';
  }
}

/** Les aides de la question, niveaux 1 à 3 (données complétées par les aides par défaut). */
export function aidesQuestion(s: Pick<SujetNumerique, 'dtr'>, q: SujetQuestion): string[] {
  const donnees = (q.aides ?? []).map(a => a.trim());
  const defaut = [aideOu(s, q), q.indice ? `🧭 ${q.indice}` : aideMethode(q), aideForme(q)];
  return Array.from({ length: NB_AIDES }, (_, i) => donnees[i] || defaut[i]);
}

/** Aide d'un niveau (1..3), ou null si le niveau est hors bornes. */
export function aideNiveau(s: Pick<SujetNumerique, 'dtr'>, q: SujetQuestion, niveau: number): string | null {
  if (!Number.isInteger(niveau) || niveau < 1 || niveau > NB_AIDES) return null;
  return aidesQuestion(s, q)[niveau - 1];
}
