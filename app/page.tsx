import { redirect } from "next/navigation";

// La raíz redirige al dashboard. El proxy se encarga de mandar a /login
// si no hay sesión.
export default function Home() {
  redirect("/dashboard");
}
