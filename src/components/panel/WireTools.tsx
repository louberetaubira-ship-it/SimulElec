'use client';

/**
 * Outils de correction du câblage, partagés par l'étape « Câblage » du parcours et
 * l'atelier libre : barre d'outils (Annuler / Rétablir / Supprimer), menu contextuel
 * tactile, message « … supprimé · Annuler » et boîtes de dialogue de confirmation.
 *
 * Tout est présentationnel : l'état vit dans le store de l'appelant.
 */
import React from 'react';
import './wiretools.css';

/* ------------------------------------------------------------- barre d'outils */

export interface WireToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  canDelete: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  /** Boutons supplémentaires (réinitialisations, câblage assisté…). */
  children?: React.ReactNode;
  /** Barre compacte de la barre haute du mode atelier. */
  compact?: boolean;
}

export function WireToolbar({
  canUndo, canRedo, canDelete, onUndo, onRedo, onDelete, children, compact,
}: WireToolbarProps) {
  return (
    <div className={`wt-bar${compact ? ' compact' : ''}`} role="group" aria-label="Outils de câblage">
      <button
        type="button" className="wt-btn" data-testid="wt-undo"
        disabled={!canUndo} onClick={onUndo}
        title="Annuler (Ctrl+Z)" aria-keyshortcuts="Control+Z"
      >
        ↩︎ <span className="lbl">Annuler</span>
      </button>
      <button
        type="button" className="wt-btn" data-testid="wt-redo"
        disabled={!canRedo} onClick={onRedo}
        title="Rétablir (Ctrl+Maj+Z)" aria-keyshortcuts="Control+Shift+Z"
      >
        ↪︎ <span className="lbl">Rétablir</span>
      </button>
      <button
        type="button" className="wt-btn danger" data-testid="wt-delete"
        disabled={!canDelete} onClick={onDelete}
        title="Supprimer le fil sélectionné (Suppr)"
      >
        ✕ <span className="lbl">Supprimer le fil</span>
      </button>
      {children}
    </div>
  );
}

/** Bouton secondaire de la barre (réinitialisations). */
export function WireToolButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="wt-btn ghost" {...rest}>{children}</button>;
}

/* ------------------------------------------------------- menu contextuel tactile */

export interface WireMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onCancel: () => void;
}

/** Petit menu « Supprimer / Annuler » ouvert par un appui long sur un fil. */
export function WireContextMenu({ x, y, onDelete, onCancel }: WireMenuProps) {
  const box = React.useRef<HTMLDivElement>(null);

  // un geste hors du menu le referme ; à l'intérieur, on laisse le bouton recevoir son clic
  React.useEffect(() => {
    const close = (e: PointerEvent) => {
      if (box.current?.contains(e.target as Node)) return;
      onCancel();
    };
    const id = window.setTimeout(() => window.addEventListener('pointerdown', close), 0);
    return () => { window.clearTimeout(id); window.removeEventListener('pointerdown', close); };
  }, [onCancel]);

  const left = Math.max(8, Math.min(x - 70, (typeof window === 'undefined' ? 320 : window.innerWidth) - 156));
  const top = Math.max(8, y - 12);

  return (
    <div ref={box} className="wt-menu" style={{ left, top }} role="menu" data-testid="wire-menu">
      <button type="button" role="menuitem" className="del" onClick={onDelete}>Supprimer</button>
      <button type="button" role="menuitem" onClick={onCancel}>Annuler</button>
    </div>
  );
}

/* --------------------------------------------------------- message « supprimé » */

export function UndoBar({ message, onUndo, onDismiss }: {
  message: string | null; onUndo: () => void; onDismiss: () => void;
}) {
  if (!message) return null;
  return (
    <div className="wt-undo" role="status" data-testid="undo-bar">
      <span>{message}</span>
      <button type="button" onClick={onUndo}>Annuler</button>
      <button type="button" className="x" onClick={onDismiss} aria-label="Fermer">×</button>
    </div>
  );
}

/* --------------------------------------------------------------- confirmation */

export interface ConfirmDialogProps {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  /** Action irréversible : le dialogue le dit et le bouton passe en rouge. */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title, body, confirmLabel, danger, busy, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { ref.current?.focus(); }, []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onCancel(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <div className="wt-modal" role="dialog" aria-modal="true" aria-label={title} data-testid="confirm-dialog">
      <div className="wt-modal-back" onClick={onCancel} />
      <div className="wt-modal-box">
        <h2>{title}</h2>
        <div className="bd">{body}</div>
        <div className="ft">
          <button type="button" className="wt-btn" onClick={onCancel}>Annuler</button>
          <button
            type="button"
            ref={ref}
            className={`wt-btn ${danger ? 'crit' : 'primary'}`}
            data-testid="confirm-ok"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Un instant…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- raccourcis */

/** Le focus est-il dans un champ de saisie ? */
function typing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export interface ShortcutsOptions {
  active: boolean;
  hasSelection: boolean;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onEscape: () => void;
}

/**
 * `Suppr` / `Retour arrière` suppriment le fil sélectionné, `Échap` le désélectionne,
 * `Ctrl/Cmd+Z` annule et `Ctrl/Cmd+Maj+Z` rétablit.
 *
 * L'écouteur est posé en phase de capture : `Échap` doit désélectionner le fil avant que
 * le `<Workspace>` ne quitte le mode plein écran.
 */
export function useWireShortcuts({ active, hasSelection, onDelete, onUndo, onRedo, onEscape }: ShortcutsOptions) {
  const ref = React.useRef({ hasSelection, onDelete, onUndo, onRedo, onEscape });
  ref.current = { hasSelection, onDelete, onUndo, onRedo, onEscape };

  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (typing()) return;
      const h = ref.current;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) h.onRedo(); else h.onUndo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); h.onRedo(); return; }
      if (mod) return;
      if (e.key === 'Escape' && h.hasSelection) {
        e.preventDefault();
        e.stopImmediatePropagation();
        h.onEscape();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && h.hasSelection) {
        e.preventDefault();
        h.onDelete();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active]);
}
