import { requireUser } from "@/lib/actions/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LogoutButton } from "@/components/shared/logout-button";

/**
 * Layout de la app autenticada. Verifica el usuario en el servidor (defensa en
 * profundidad: además del proxy). Si no hay sesión, requireUser() redirige a /login.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex flex-1">
      <aside className="hidden w-56 shrink-0 bg-sidebar md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-sidebar-border px-5">
          <div>
            <p className="text-sm font-bold tracking-widest text-sidebar-foreground uppercase">
              Rodolfo
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider -mt-0.5">
              Licitaciones
            </p>
          </div>
        </div>
        <Sidebar />
      </aside>
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b bg-card px-5">
          <div className="flex items-center gap-3">
            <MobileNav />
            <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
