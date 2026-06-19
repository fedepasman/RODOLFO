import { requireUser } from "@/lib/actions/auth";
import { Sidebar } from "@/components/layout/sidebar";
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
      <aside className="hidden w-60 shrink-0 border-r bg-background md:block">
        <div className="flex h-14 items-center border-b px-5 font-semibold">
          Licitaciones
        </div>
        <Sidebar />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-5">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
