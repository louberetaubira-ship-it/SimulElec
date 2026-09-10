'use client';

import React from 'react';
import { AideButton } from './AideCours';

export function Side({ children }: { children: React.ReactNode }) {
  return (
    <aside className="flex flex-col gap-2.5 overflow-y-auto border-b border-[var(--line)] bg-[var(--surface)] p-3.5 lg:border-b-0 lg:border-r">
      <div className="sticky top-0 z-20 -mx-3.5 -mt-3.5 border-b border-[var(--line)] bg-[var(--surface)] px-3.5 py-2">
        <AideButton />
      </div>
      {children}
    </aside>
  );
}

export function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-w-0 flex-col items-center gap-2.5 overflow-y-auto p-3">
      {children}
    </main>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="max-w-[60ch] text-center text-[12px] text-muted">{children}</p>;
}
