'use client';

/**
 * Battement de présence : tant qu'un onglet SimulElec est ouvert et visible, envoie un
 * battement toutes les 60 s (voir `src/lib/db/presence.ts`). Monté une fois dans le layout ;
 * ne fait rien pour un visiteur non connecté (le RPC est calé sur `auth.uid()`).
 */

import { useEffect } from 'react';
import { beat } from '@/lib/db/presence';

const INTERVAL_MS = 60 * 1000;

export default function Heartbeat() {
  useEffect(() => {
    let stopped = false;
    const ping = () => {
      if (!stopped && document.visibilityState === 'visible') beat();
    };
    ping();
    const id = window.setInterval(ping, INTERVAL_MS);
    document.addEventListener('visibilitychange', ping);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', ping);
    };
  }, []);
  return null;
}
