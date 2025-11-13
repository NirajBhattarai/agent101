"use client";

import { useEffect, useState } from "react";

export function WalletConnect() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return null;
  return <appkit-button></appkit-button>;
}
