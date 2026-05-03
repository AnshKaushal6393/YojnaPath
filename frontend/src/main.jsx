import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { i18nReady } from "./i18n";
import App from "./App";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error?.status === 401 || error?.status === 404) {
          return false;
        }

        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function registerServiceWorkerWhenIdle() {
  registerSW({
    immediate: true,
  });
}

if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(registerServiceWorkerWhenIdle);
  } else {
    window.addEventListener("load", registerServiceWorkerWhenIdle, { once: true });
  }
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <RouteErrorBoundary>
            <App />
          </RouteErrorBoundary>
        </QueryClientProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

i18nReady.finally(renderApp);
