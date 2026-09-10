'use client';

import React from 'react';

type Div = React.HTMLAttributes<HTMLDivElement>;

export function Card({ title, children, className = '', ...rest }: Div & { title?: string }) {
  return (
    <div className={`rounded-xl bg-[var(--surface-2)] p-3 ${className}`} {...rest}>
      {title && <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">{title}</h3>}
      {children}
    </div>
  );
}

export function SideTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] font-semibold uppercase tracking-[.06em] text-muted">{children}</div>;
}

export function Note({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`m-0 text-[12px] leading-relaxed text-muted ${className}`}>{children}</p>;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'md' | 'sm';
};

export function Button({ variant = 'default', size = 'md', className = '', ...rest }: BtnProps) {
  const base = 'rounded-[10px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-default';
  const sizes = size === 'sm' ? 'px-3 py-2 text-[12px] min-h-touch' : 'w-full px-3 py-2.5 text-[12.5px] min-h-touch';
  const variants: Record<string, string> = {
    default: 'border border-[var(--line)] bg-[var(--surface)] text-ink hover:bg-[var(--surface-2)]',
    primary: 'border border-accent bg-accent text-[var(--accent-ink)] hover:brightness-105',
    ghost: 'border border-transparent text-muted hover:text-ink',
  };
  return <button type="button" className={`${base} ${sizes} ${variants[variant]} ${className}`} {...rest} />;
}

export function Kpi({ k, v, unit, small }: { k: string; v: string | number; unit?: string; small?: boolean }) {
  return (
    <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5">
      <div className="text-[9.5px] uppercase tracking-[.06em] text-muted">{k}</div>
      <div className={`font-mono-num font-semibold ${small ? 'text-[13px]' : 'text-[16px]'}`}>
        {v}{unit && <span className="ml-0.5 text-[9px] text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export function Lcd({ big, unit, sub, danger }: { big: string; unit: string; sub: string; danger?: boolean }) {
  return (
    <div
      className={`rounded-lg border-2 p-2.5 font-mono-num ${danger
        ? 'border-[#8A2E2E] bg-[#E8B4B4] text-[#4A0B0B]'
        : 'border-[#4A5A3E] bg-[#C7D6AE] text-[#16230F]'}`}
      style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,.25)' }}
    >
      <div className="flex items-baseline justify-between text-[28px] font-semibold leading-none">
        <span>{big}</span><small className="text-[12px]">{unit}</small>
      </div>
      <div className="mt-1 flex justify-between text-[10px] opacity-85">
        <span>{sub}</span><span>AUTO</span>
      </div>
    </div>
  );
}

export function Chip({ active, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`min-h-touch rounded-full border px-3 py-1.5 text-[11.5px] ${active
        ? 'border-accent bg-accent font-semibold text-[var(--accent-ink)]'
        : 'border-[var(--line)] bg-[var(--surface)] text-ink'}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function CheckRow({ done, title, sub, children }: { done: boolean; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className={`flex gap-2 rounded-[10px] border p-2 text-[12.5px] ${done ? 'border-good/60 bg-[var(--surface)]' : 'border-[var(--line)] bg-[var(--surface)]'}`}>
      <span className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full border-2 text-[11px] ${done ? 'border-good bg-good text-white' : 'border-[var(--line)]'}`}>
        {done ? '✓' : ''}
      </span>
      <div className="flex-1">
        <b className="block font-medium">{title}</b>
        {sub && <small className="block text-muted">{sub}</small>}
        {children}
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      aria-live="polite"
      className={`no-print pointer-events-none fixed bottom-4 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[12.5px] text-[var(--app)] transition-opacity ${message ? 'opacity-100' : 'opacity-0'}`}
    >
      {message ?? ''}
    </div>
  );
}
