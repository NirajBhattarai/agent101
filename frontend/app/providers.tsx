"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { Provider as ReduxProvider } from "react-redux";
import type { Config as WagmiConfig } from "wagmi";
import { store } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [ready, setReady] = useState(false);
  const [wagmiConfig, setWagmiConfig] = useState<WagmiConfig | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { initAppKit } = await import("@/lib/config/appkit-config");
      const adapter = initAppKit();
      if (mounted) {
        // adapter is WagmiAdapter; expose wagmiConfig to WagmiProvider
        setWagmiConfig((adapter as any).wagmiConfig as WagmiConfig);
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready || !wagmiConfig) {
    return null;
  }

  return (
    <ReduxProvider store={store}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </ReduxProvider>
  );
}
