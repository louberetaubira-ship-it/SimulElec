'use client';
/** Aiguillage d'une question vers le renderer de son outil de réponse. */
import type { CorrectionQuestion, ReponseSujet } from '@/lib/sujet/types';
import type { QuestionPublique } from '@/lib/sujet/public';
import QBulles from './QBulles';
import QCalcul from './QCalcul';
import QCavaliers from './QCavaliers';
import QCocher from './QCocher';
import QOrdonner from './QOrdonner';
import QPlacement from './QPlacement';
import QRedige from './QRedige';
import QRelier from './QRelier';
import QSchema from './QSchema';
import QTableau from './QTableau';
import QValeur from './QValeur';
import type { RDe } from './outils';

interface Props {
  /** Question PUBLIQUE (sans corrigé). */
  q: QuestionPublique;
  r: ReponseSujet | undefined;
  onChange: (r: ReponseSujet) => void;
  readOnly: boolean;
  montrer: boolean;
  /** Correction serveur de la question (coloration juste / faux par élément). */
  correction?: CorrectionQuestion | null;
}

export default function Question({ q, r, onChange, readOnly, montrer, correction }: Props) {
  const p = { onChange, readOnly, montrer, correction };
  switch (q.type) {
    case 'cocher': return <QCocher q={q} r={r as RDe<'cocher'> | undefined} {...p} />;
    case 'relier': return <QRelier q={q} r={r as RDe<'relier'> | undefined} {...p} />;
    case 'ordonner': return <QOrdonner q={q} r={r as RDe<'ordonner'> | undefined} {...p} />;
    case 'valeur': return <QValeur q={q} r={r as RDe<'valeur'> | undefined} {...p} />;
    case 'calcul': return <QCalcul q={q} r={r as RDe<'calcul'> | undefined} {...p} />;
    case 'tableau': return <QTableau q={q} r={r as RDe<'tableau'> | undefined} {...p} />;
    case 'redige': return <QRedige q={q} r={r as RDe<'redige'> | undefined} {...p} />;
    case 'bulles': return <QBulles q={q} r={r as RDe<'bulles'> | undefined} {...p} />;
    case 'placement': return <QPlacement q={q} r={r as RDe<'placement'> | undefined} {...p} />;
    case 'cavaliers': return <QCavaliers q={q} r={r as RDe<'cavaliers'> | undefined} {...p} />;
    case 'schema': return <QSchema q={q} r={r as RDe<'schema'> | undefined} {...p} />;
  }
}
