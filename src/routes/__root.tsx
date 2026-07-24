import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-gradient-gold">404</h1>
        <p className="mt-4 text-muted-foreground">Esta página não existe.</p>
        <Link to="/" className="mt-6 inline-block underline text-primary">Voltar ao início</Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Privé — Experiências exclusivas para noivas" },
      { name: "description", content: "Plataforma boutique para casamento, chá de lingerie e despedida de solteira. Páginas personalizadas, lista de presentes, experiência premium." },
      { property: "og:title", content: "Privé — Experiências exclusivas para noivas" },
      { property: "og:description", content: "Plataforma boutique para casamento, chá de lingerie e despedida de solteira. Páginas personalizadas, lista de presentes, experiência premium." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Privé — Experiências exclusivas para noivas" },
      { name: "twitter:description", content: "Plataforma boutique para casamento, chá de lingerie e despedida de solteira. Páginas personalizadas, lista de presentes, experiência premium." },
      { property: "og:image", content: "https://prive.qrztech.com/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://prive.qrztech.com/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: "https://prive.qrztech.com/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: () => (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-center" />
    </AuthProvider>
  ),
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
