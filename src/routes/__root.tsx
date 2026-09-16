import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { KostnadDonationWidget } from "@/components/insikt/kostnad-donation-widget";

const NAV = [
  { to: "/ledamoter", text: "Ledamöter" },
  { to: "/partier", text: "Partier" },
  { to: "/voteringar", text: "Voteringar" },
  { to: "/kompass", text: "Kompass" },
  { to: "/avvikelser", text: "Avvikelser" },
  { to: "/valloften", text: "Vallöften" },
  { to: "/sakfragor", text: "Sakfrågor" },
  { to: "/jamfor", text: "Jämför" },
  { to: "/bevakningar", text: "Bevakningar" },
] as const;

function NotFoundComponent() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-4xl">Sidan finns inte</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Adressen leder inte till någon sida i Insikt. Den kan ha ändrats.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Till startsidan
      </Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl">Sidan kunde inte visas</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Något gick fel när uppgifterna skulle hämtas. Försök igen, eller rapportera felet så att vi
        kan rätta det.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Försök igen
        </button>
        <Link
          to="/rapportera-fel"
          className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
        >
          Rapportera fel
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Insikt — förstå riksdagens beslut" },
      {
        name: "description",
        content:
          "Insikt gör riksdagens arbete begripligt: ledamöter, partier, voteringar och beslut med länk till originalkällan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="sv">
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

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header role="banner" className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="rubrik text-2xl tracking-tight" aria-label="Insikt startsida">
          Insikt
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Huvudmeny">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground" }}
            >
              {n.text}
            </Link>
          ))}
          <Link
            to="/sok"
            className="ml-1 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
          >
            Sök
          </Link>
        </nav>
        <button
          type="button"
          className="rounded-md border border-input px-3 py-2 text-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Stäng huvudmeny" : "Öppna huvudmeny"}
          onClick={() => setOpen((v) => !v)}
        >
          Meny
        </button>
      </div>
      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-border px-4 py-2 md:hidden"
          aria-label="Mobilmeny"
        >
          {[...NAV, { to: "/sok", text: "Sök" } as const].map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              {n.text}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

function Footer() {
  return (
    <footer role="contentinfo" className="mt-16 border-t border-border bg-[var(--yta)]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="rubrik text-lg">Insikt</p>
          <p className="mt-2 text-muted-foreground">
            Partipolitiskt obunden och byggd på Riksdagens öppna data. Varje uppgift går att spåra
            till originalkällan.
          </p>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Information och källor">
          <Link to="/om-insikt" className="hover:underline">
            Om Insikt
          </Link>
          <Link to="/neutralitet" className="hover:underline">
            Neutralitet &amp; oberoende
          </Link>
          <Link to="/kallor-och-metod" className="hover:underline">
            Källor &amp; metod
          </Link>
          <Link to="/ordlista" className="hover:underline">
            Ordlista
          </Link>
        </nav>
        <nav className="flex flex-col gap-1" aria-label="Övriga länkar och källor">
          <Link to="/valkretsar" className="hover:underline">
            Valkretsar
          </Link>
          <Link to="/rapportera-fel" className="hover:underline">
            Rapportera fel
          </Link>
          <Link to="/admin" className="hover:underline">
            Administration
          </Link>
          <a
            href="https://data.riksdagen.se"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:underline"
          >
            Riksdagens öppna data (extern länk)
          </a>
        </nav>
      </div>
      <KostnadDonationWidget />
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Hoppa till huvudinnehåll
      </a>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Header />
        <main id="main-content" role="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
