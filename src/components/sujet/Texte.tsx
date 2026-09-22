/**
 * Texte d'énoncé fidèle au papier : paragraphes (retours à la ligne) et gras « **ainsi** ».
 */
import { Fragment } from 'react';
import { morceauxGras } from './outils';

export default function Texte({ children, className }: { children: string; className?: string }) {
  const lignes = children.split('\n');
  return (
    <span className={className}>
      {lignes.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {morceauxGras(l).map((m, j) => (m.b ? <b key={j} className="font-semibold">{m.t}</b> : <Fragment key={j}>{m.t}</Fragment>))}
        </Fragment>
      ))}
    </span>
  );
}
