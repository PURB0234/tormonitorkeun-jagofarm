import type { ReactNode } from "react";
import TopBar from "./TopBar";
import MainContent from "./MainContent";
import type { UserRole } from "../../lib/auth/permissions";

type AppShellProps = {
    children: ReactNode;
    role?: UserRole;
};

export default function AppShell({
    children,
    role,
}: AppShellProps) {
    return (
        <div className="app-shell">
            <TopBar role={role} />
            <MainContent>{children}</MainContent>
        </div>
    );
}
