
import type { ReactNode } from "react";
// import SideBar from "./SideBar";
import TopBar from "./TopBar";
import MainContent from "./MainContent";

type AppShellProps = {
    children: ReactNode;
};

export default function AppShell({
    children,
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
