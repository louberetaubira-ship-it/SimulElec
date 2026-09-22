/**
 * Évaluateur d'expressions de la calculatrice « type collège » (module pur, sans `eval`).
 *
 * Opérations : + − × ÷ (et * /), parenthèses, √ (préfixe), ² (suffixe), ^, π, virgule
 * décimale, moins unaire, multiplication implicite (« 2π », « 3(4+1) », « 2√9 »).
 */

type Jeton =
  | { t: 'n'; v: number }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '^' }
  | { t: '(' } | { t: ')' } | { t: 'sqrt' } | { t: 'carre' } | { t: 'pi' };

function lexer(src: string): Jeton[] {
  const s = src.replace(/[\s  ]+/g, '');
  const out: Jeton[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.,]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.,]/.test(s[j])) j++;
      const brut = s.slice(i, j).replace(',', '.');
      if ((brut.match(/\./g) ?? []).length > 1 || brut === '.') throw new Error('Nombre mal écrit');
      out.push({ t: 'n', v: Number(brut) });
      i = j;
      continue;
    }
    if (c === '+') out.push({ t: 'op', v: '+' });
    else if (c === '-' || c === '−' || c === '–') out.push({ t: 'op', v: '-' });
    else if (c === '*' || c === '×' || c === 'x' || c === '·') out.push({ t: 'op', v: '*' });
    else if (c === '/' || c === '÷' || c === ':') out.push({ t: 'op', v: '/' });
    else if (c === '^') out.push({ t: 'op', v: '^' });
    else if (c === '(') out.push({ t: '(' });
    else if (c === ')') out.push({ t: ')' });
    else if (c === '√') out.push({ t: 'sqrt' });
    else if (c === '²') out.push({ t: 'carre' });
    else if (c === 'π') out.push({ t: 'pi' });
    else throw new Error(`Caractère inattendu : ${c}`);
    i++;
  }
  return out;
}

/** Évalue une expression ; lève une erreur lisible si elle est mal formée. */
export function evaluer(src: string): number {
  const j = lexer(src);
  let p = 0;
  const voir = () => j[p];
  const commenceFacteur = (k: Jeton | undefined) => !!k && (k.t === 'n' || k.t === '(' || k.t === 'sqrt' || k.t === 'pi');

  const expr = (): number => {
    let v = terme();
    for (let k = voir(); k && k.t === 'op' && (k.v === '+' || k.v === '-'); k = voir()) {
      p++;
      const d = terme();
      v = k.v === '+' ? v + d : v - d;
    }
    return v;
  };
  const terme = (): number => {
    let v = unaire();
    for (;;) {
      const k = voir();
      if (k && k.t === 'op' && (k.v === '*' || k.v === '/')) {
        p++;
        const d = unaire();
        if (k.v === '/' && d === 0) throw new Error('Division par zéro');
        v = k.v === '*' ? v * d : v / d;
      } else if (commenceFacteur(k)) {
        v *= unaire(); // multiplication implicite
      } else return v;
    }
  };
  const unaire = (): number => {
    const k = voir();
    if (k && k.t === 'op' && (k.v === '-' || k.v === '+')) {
      p++;
      const v = unaire();
      return k.v === '-' ? -v : v;
    }
    return puissance();
  };
  const puissance = (): number => {
    let v = primaire();
    for (;;) {
      const k = voir();
      if (k && k.t === 'carre') { p++; v = v * v; continue; }
      if (k && k.t === 'op' && k.v === '^') { p++; v = Math.pow(v, unaire()); continue; }
      return v;
    }
  };
  const primaire = (): number => {
    const k = voir();
    if (!k) throw new Error('Expression incomplète');
    if (k.t === 'n') { p++; return k.v; }
    if (k.t === 'pi') { p++; return Math.PI; }
    if (k.t === 'sqrt') {
      p++;
      const v = puissance();
      if (v < 0) throw new Error('Racine d’un nombre négatif');
      return Math.sqrt(v);
    }
    if (k.t === '(') {
      p++;
      const v = expr();
      if (voir()?.t === ')') p++; // parenthèse fermante facultative en fin d'expression
      else if (voir()) throw new Error('Parenthèse manquante');
      return v;
    }
    throw new Error('Expression mal formée');
  };

  if (j.length === 0) throw new Error('Expression vide');
  const v = expr();
  if (p < j.length) throw new Error('Expression mal formée');
  if (!Number.isFinite(v)) throw new Error('Résultat indéfini');
  return v;
}

/** Résultat affiché à la française, 10 chiffres significatifs au plus. */
export function afficherResultat(v: number): string {
  const r = Number(v.toPrecision(10));
  if (Math.abs(r) >= 1e12 || (Math.abs(r) > 0 && Math.abs(r) < 1e-6)) return r.toExponential(6).replace('.', ',');
  return String(r).replace('.', ',');
}
