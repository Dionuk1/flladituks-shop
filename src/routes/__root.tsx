import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/lib/cart";
import { ThemeProvider } from "@/lib/theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Faqja nuk u gjet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Faqja që po kërkoni nuk ekziston ose është zhvendosur.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Kthehu në fillim
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Faqja nuk u ngarkua</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Diçka shkoi keq. Provo të rifreskosh ose kthehu në fillim.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Provo përsëri
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Kthehu në fillim
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FlladituKS — Dyqani Online në Kosovë" },
      {
        name: "description",
        content:
          "FlladituKS — produktet më të reja me dërgesë në të gjithë Kosovën. Pagesa në dorë.",
      },
      { property: "og:title", content: "FlladituKS — Dyqani Online në Kosovë" },
      {
        property: "og:description",
        content: "Bli online me dorëzim të shpejtë në të gjithë Kosovën.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "FlladituKS — Dyqani Online në Kosovë" },
      { name: "description", content: "FlladituKS is a modern Albanian e-commerce web application for selling products online." },
      { property: "og:description", content: "FlladituKS is a modern Albanian e-commerce web application for selling products online." },
      { name: "twitter:description", content: "FlladituKS is a modern Albanian e-commerce web application for selling products online." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d93c098-3b8a-4494-b90c-f13515270625/id-preview-47c219bc--6177c6b5-f807-4b19-9fb6-3db829df7606.lovable.app-1781530914503.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d93c098-3b8a-4494-b90c-f13515270625/id-preview-47c219bc--6177c6b5-f807-4b19-9fb6-3db829df7606.lovable.app-1781530914503.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="sq">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CartProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </CartProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
