'use client';

import React from 'react';
import MesureStage from './MesureStage';

/** Étape « horsTension » du parcours élève. */
export default function MesuresHorsTension({ onNext }: { onNext: () => void }) {
  return <MesureStage variant="horsTension" onNext={onNext} />;
}
