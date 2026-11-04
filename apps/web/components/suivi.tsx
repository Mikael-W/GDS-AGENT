"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type Props = { dsn: string; version: string; environnement: string };

/** Erreurs du navigateur vers GlitchTip ; le DSN vient du serveur, à l'exécution. */
export function Suivi({ dsn, version, environnement }: Props) {
  useEffect(() => {
    if (!dsn) return;
    Sentry.init({ dsn, release: version, environment: environnement });
  }, [dsn, version, environnement]);
  return null;
}
