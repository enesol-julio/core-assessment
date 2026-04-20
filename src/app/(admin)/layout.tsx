import { redirect } from "next/navigation";
import { loadSession } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await loadSession();
  if (!session) redirect("/?from=admin");
  if (session.role !== "admin") redirect("/?forbidden=1");
  return <>{children}</>;
}
