// 1. app/components/ui/Card.tsx (UI reusable container)
import type { ReactNode } from "react";

export default function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <div className={`bg-white border border-gray-200 rounded-xl p-5 shadow-xs ${className}`}>
            {children}
        </div>
    );
}
