'use client';

import React from 'react';
import MesureStage from './MesureStage';

/** Étape « sousTension » du parcours élève. */
export default function MesuresSousTension({ onNext }: { onNext: () => void }) {
  return <MesureStage variant="sousTension" onNext={onNext} />;
}
