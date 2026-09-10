'use client';

import React from 'react';
import MesureStage from './MesureStage';

/** Étape « epi » du parcours élève. */
export default function EpiConsignation({ onNext }: { onNext: () => void }) {
  return <MesureStage variant="epi" onNext={onNext} />;
}
