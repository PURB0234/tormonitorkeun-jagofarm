
import { requireAdmin } from "@/app/lib/auth/permissions";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAdmin();

    return <>{children}</>;
}
