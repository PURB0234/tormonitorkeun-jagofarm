
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    href?: string;
    variant?: "primary" | "secondary" | "danger" | "nav" | "sync" | "addSchedule" | "addNote";
};

export default function Button({
    children,
    variant = "primary",
    className = "",
    href,
    ...props
}: ButtonProps) {
    const variants = {
        primary:
            "bg-green-600 text-white hover:bg-green-700",
        secondary:
            "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
        danger:
            "bg-red-600 text-white hover:bg-red-700",
        nav:
            "px-4 py-2 border-b-2 border-gray-800 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-black hover:bg-gray-200",
        sync:
            "bg-[#F1F5F1] h-5 border border-black/10 rounded-xs text-[#1E5E35]",
        addSchedule:
            "bg-white border border-black/10 rounded-xs text-black",
        addNote:
            "bg-[#1E5E35] border border-black/10 rounded-xs text-white",
    };

    if (href) {
        return (
            <Link href={href} prefetch={true} className={className}>
                {children}
            </Link>
        );
    }

    return (
        <button
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
