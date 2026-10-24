
import type { ReactNode } from "react";
import AppShell from "../components/layout/AppShell";

type WorkspaceLayoutProps = {
    children: ReactNode;
};

export default function WorkspaceLayout({
    children,
}: WorkspaceLayoutProps) {
    return <AppShell>{children}</AppShell>;
}
