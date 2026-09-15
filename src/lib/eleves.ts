/**
 * Identifiants des comptes élèves créés par le professeur (module pur, sans React).
 *
 * Un élève ne possède pas d'adresse électronique : le professeur lui remet un identifiant
 * `nom.prenom` et un mot de passe. L'identifiant est converti en adresse technique
 * `nom.prenom@<classe>.simulelec.local`, jamais affichée à l'élève.
 */

/** Minuscules, accents retirés, tout ce qui n'est ni lettre ni chiffre supprimé. */
export function slugName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Identifiant de connexion de l'élève : `nom.prenom`. */
export function loginFor(nom: string, prenom: string): string {
  return `${slugName(nom)}.${slugName(prenom)}`;
}

/** Fragment d'adresse technique correspondant à une classe (ex. « 2melec1 »). */
export function classSlug(name: string): string {
  return slugName(name) || 'classe';
}

/** Adresse technique interne associée à un identifiant élève. */
export function emailFor(login: string, classSlugName: string): string {
  return `${login}@${classSlugName}.simulelec.local`;
}

/** Syllabes lisibles à voix haute, sans confusion possible à l'oral. */
const SYLLABES = [
  'ta', 'ro', 'lu', 'mi', 'na', 'pe', 'so', 'vi', 'ka', 'du',
  'be', 'fo', 'gi', 'ma', 'no', 'pi', 'ra', 'sa', 'te', 'vo',
  'zu', 'la', 'me', 'ni', 'po', 'ru', 'si', 'to', 'va', 'bo',
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Mot de passe lisible et dictable : deux syllabes, un tiret, deux chiffres (ex. « tarolu-42 »).
 * Les mots de passe ne sont montrés qu'une fois au professeur, qui les remet à l'élève.
 */
export function generatePassword(): string {
  const mot = `${pick(SYLLABES)}${pick(SYLLABES)}${pick(SYLLABES)}`;
  const chiffres = String(10 + Math.floor(Math.random() * 90));
  return `${mot}-${chiffres}`;
}

/**
 * Mot de passe PROVISOIRE d'un compte enseignant : quatre syllabes et trois
 * chiffres, soit ~14 caractères — encore dictable au téléphone, mais nettement
 * plus solide que le mot de passe élève.
 *
 * L'écart se justifie : un compte enseignant voit les résultats de toutes ses
 * classes, et un compte administrateur voit l'établissement entier. Ce mot de
 * passe ne vit d'ailleurs que le temps d'une session, puisque la personne doit
 * en choisir un autre.
 */
export function generateTempPassword(): string {
  const mot = Array.from({ length: 4 }, () => pick(SYLLABES)).join('');
  const chiffres = String(100 + Math.floor(Math.random() * 900));
  return `${mot}-${chiffres}`;
}

/**
 * Normalise un identifiant saisi à la main par le professeur.
 *
 * Le professeur corrige parfois un identifiant lui-même (homonymes, nom composé,
 * faute de frappe). Ce qu'il tape doit subir le même traitement que ce que tape
 * l'élève à la connexion — sans quoi « Dupont.Léa » serait enregistré tel quel et
 * ne répondrait jamais à « dupont.lea ». On normalise donc chaque fragment
 * séparé par un point, et on jette les fragments vides (« dupont..lea »).
 */
export function normalizeLogin(raw: string): string {
  return raw.split('.').map(slugName).filter(Boolean).join('.');
}
