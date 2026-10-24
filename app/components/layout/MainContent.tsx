
import type { ReactNode } from "react";

type MainContentProps = {
    children: ReactNode;
};

export default function MainContent({
    children,
}: MainContentProps) {
    return (
        <main className="main-content">
            {children}
        </main>
    );
}
