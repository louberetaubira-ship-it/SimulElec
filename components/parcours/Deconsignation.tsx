'use client';

import React from 'react';
import MesureStage from './MesureStage';

/** Étape « decons » du parcours élève. */
export default function Deconsignation({ onNext }: { onNext: () => void }) {
  return <MesureStage variant="decons" onNext={onNext} />;
}
