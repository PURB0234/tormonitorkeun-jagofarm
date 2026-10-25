
import type { ReactNode } from "react";
// import SideBar from "./SideBar";
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
            {/* <SideBar /> */}

            {/* <div className="app-main"> */}
            <TopBar />
            <MainContent>{children}</MainContent>
            {/* </div> */}
        </div>
    );
}
