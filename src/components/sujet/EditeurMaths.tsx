'use client';
/**
 * Éditeur de maths (MathLive `<math-field>`) : formules et applications numériques saisies
 * comme sur la copie (fractions, racines, indices, φ…), valeur = LaTeX.
 *
 *  - MathLive est chargé dynamiquement, côté client seulement (jamais au rendu serveur) ;
 *    en attendant (ou s'il ne se charge pas), un champ texte ordinaire prend le relais ;
 *  - clavier virtuel personnalisé (`claviers.ts`) : « Électrotechnique », « 123 », « αβφ »,
 *    « Unités » — affiché à la demande (bouton ⌨) et automatiquement sur écran tactile ;
 *  - polices servies localement (`/mathlive/fonts`, copiées depuis `node_modules/mathlive/fonts`),
 *    sons désactivés, virgule décimale ;
 *  - lecture seule possible (copie remise, vue professeur).
 */
import { createElement, useEffect, useRef, useState } from 'react';
import { CLAVIERS, STYLE_CLAVIER } from './claviers';
import { CHAMP } from './outils';

type Mathlive = typeof import('mathlive');
type ChampMaths = HTMLElement & {
  value: string;
  readOnly: boolean;
  mathVirtualKeyboardPolicy: 'auto' | 'manual' | 'sandboxed';
  setValue: (v: string, o?: { silenceNotifications?: boolean }) => void;
  menuItems: readonly unknown[];
};

let chargement: Promise<Mathlive> | null = null;

/** Charge et configure MathLive une seule fois (polices locales, sans son, claviers, virgule). */
export function chargerMathlive(): Promise<Mathlive> {
  if (typeof window === 'undefined') return Promise.reject(new Error('MathLive : navigateur requis'));
  if (!chargement) {
    chargement = import('mathlive').then(m => {
      const MF = m.MathfieldElement;
      MF.fontsDirectory = '/mathlive/fonts';
      MF.soundsDirectory = null;
      MF.keypressSound = null;
      MF.plonkSound = null;
      MF.decimalSeparator = ',';
      const vk = window.mathVirtualKeyboard;
      if (vk) vk.layouts = CLAVIERS as unknown as typeof vk.layouts;
      if (!document.getElementById('editeur-maths-style')) {
        const st = document.createElement('style');
        st.id = 'editeur-maths-style';
        st.textContent = `${STYLE_CLAVIER}
math-field::part(virtual-keyboard-toggle), math-field::part(menu-toggle) { display: none; }
math-field:focus-within { outline: none; }`;
        document.head.appendChild(st);
      }
      return m;
    }).catch(e => {
      chargement = null;
      throw e;
    });
  }
  return chargement;
}

/** Écran tactile (doigt) : le clavier virtuel s'ouvre tout seul au focus. */
const estTactile = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

export interface EditeurMathsProps {
  /** Valeur LaTeX. */
  value: string;
  onChange?: (latex: string) => void;
  readOnly?: boolean;
  /** Nom accessible du champ (lecteurs d'écran). */
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  /** Classe d'état juste / faux (bordure). */
  etat?: string;
  /** Attributs `data-*` posés sur le conteneur (tests, sélecteurs). */
  data?: Record<string, string>;
  onFocus?: () => void;
}

export default function EditeurMaths({ value, onChange, readOnly = false, ariaLabel, placeholder, className = '', etat = '', data, onFocus }: EditeurMathsProps) {
  const [pret, setPret] = useState(false);
  const [echec, setEchec] = useState(false);
  const ref = useRef<ChampMaths | null>(null);
  const rappel = useRef(onChange);
  rappel.current = onChange;
  const focus = useRef(onFocus);
  focus.current = onFocus;

  useEffect(() => {
    let vivant = true;
    chargerMathlive().then(() => { if (vivant) setPret(true); }).catch(() => { if (vivant) setEchec(true); });
    return () => { vivant = false; };
  }, []);

  // Branchement du <math-field> une fois l'élément défini.
  useEffect(() => {
    const mf = ref.current;
    if (!pret || !mf) return;
    mf.mathVirtualKeyboardPolicy = estTactile() ? 'auto' : 'manual';
    mf.menuItems = [];
    const entree = () => rappel.current?.(mf.value);
    const f = () => focus.current?.();
    mf.addEventListener('input', entree);
    mf.addEventListener('focus', f);
    return () => {
      mf.removeEventListener('input', entree);
      mf.removeEventListener('focus', f);
    };
  }, [pret]);

  // Valeur contrôlée (sans renvoyer d'événement « input »).
  useEffect(() => {
    const mf = ref.current;
    if (!pret || !mf) return;
    if (mf.value !== value) mf.setValue(value ?? '', { silenceNotifications: true });
  }, [pret, value]);

  useEffect(() => {
    const mf = ref.current;
    if (!pret || !mf) return;
    mf.readOnly = readOnly;
    mf.setAttribute('aria-label', ariaLabel);
    if (placeholder) mf.setAttribute('placeholder', `\\text{${placeholder.replace(/[{}\\]/g, '')}}`);
  }, [pret, readOnly, ariaLabel, placeholder]);

  const ouvrirClavier = () => {
    const mf = ref.current;
    if (!mf) return;
    mf.focus();
    window.mathVirtualKeyboard?.show({ animate: true });
  };

  const attrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));

  // Repli : champ texte (chargement en cours, MathLive indisponible).
  if (!pret) {
    return (
      <span className={`flex w-full items-center gap-1.5 ${className}`} {...attrs} data-editeur-maths={echec ? 'repli' : 'chargement'}>
        <input
          className={`${CHAMP} w-full text-[16px]${etat}`}
          value={value}
          aria-label={ariaLabel}
          placeholder={placeholder ?? ''}
          disabled={readOnly}
          onChange={e => onChange?.(e.target.value)}
          onFocus={() => onFocus?.()}
          autoComplete="off"
        />
      </span>
    );
  }

  return (
    <span className={`flex w-full items-center gap-1.5 ${className}`} {...attrs} data-editeur-maths="pret">
      {createElement('math-field', {
        ref,
        class: `block min-h-[46px] w-full rounded-lg border-2 border-line bg-surface px-2 py-1 text-[20px] text-ink focus-within:border-[#2f6fd1]${etat}${readOnly ? ' opacity-95' : ''}`,
        style: { fontSize: '20px', minWidth: 0 },
        'math-virtual-keyboard-policy': 'manual',
        'aria-label': ariaLabel,
        suppressHydrationWarning: true,
      })}
      {!readOnly && (
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={ouvrirClavier}
          className="grid h-[46px] min-w-[46px] flex-none place-items-center rounded-lg border border-line bg-surface2 text-[20px] hover:border-accent"
          aria-label="Afficher le clavier mathématique"
          title="Clavier mathématique"
          data-clavier-maths
        >
          ⌨
        </button>
      )}
    </span>
  );
}
