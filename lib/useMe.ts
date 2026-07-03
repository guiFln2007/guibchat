"use client";

import { useEffect, useState } from "react";

export interface Me {
  id: string;
  name: string;
  handle: string;
  igUserId: string;
  owner: boolean;
  connected: boolean;
}

/** Hook client-side: dados da conta logada (nome, @handle, se o IG está conectado). */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d))
      .catch(() => {});
  }, []);
  return me;
}
