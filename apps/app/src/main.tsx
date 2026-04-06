import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { setAuthTokenProvider } from "@yinjie/contracts";
import "@yinjie/ui/tokens.css";
import "./index.css";
import { queryClient } from "./lib/query-client";
import { configureContractsRuntime } from "./lib/runtime-config";
import { router } from "./router";
import { hydrateNativeRuntimeConfig } from "./runtime/runtime-config-store";
import { useSessionStore } from "./store/session-store";

async function bootstrap() {
  await hydrateNativeRuntimeConfig();
  setAuthTokenProvider(() => useSessionStore.getState().token);
  configureContractsRuntime();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
