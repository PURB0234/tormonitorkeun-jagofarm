
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

export type ButtonVariant =
    | "primary"
    | "secondary"
    | "outline"
    | "danger"
    | "ghost"
    | "dark"
    | "nav"
    | "sync"
    | "addSchedule"
    | "addNote";

export type ButtonSize = "m" | "xs" | "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    href?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
    primary: "bg-[#1E5E35] text-white hover:bg-[#164728] shadow-2xs border border-transparent",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent",
    outline: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-2xs",
    dark: "bg-slate-900 text-white hover:bg-slate-800 shadow-2xs border border-transparent",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-2xs border border-transparent",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 border border-transparent",
    nav: "border-b-2 text-sm font-semibold transition-colors disabled:opacity-50",
    sync: "bg-[#F1F5F1] border border-black/10 rounded-md text-[#1E5E35] font-semibold hover:bg-gray-200",
    addSchedule: "bg-white border border-black/10 rounded-md text-black font-semibold hover:bg-gray-50",
    addNote: "bg-[#1E5E35] border border-black/10 rounded-md text-white font-semibold hover:bg-[#164728]",
};

const sizeClasses: Record<ButtonSize, string> = {
    m: "px-2 py-1 text-[13px] gap-1",
    xs: "px-2 py-1 text-[11px] rounded-md gap-1",
    sm: "px-2.5 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-3.5 py-2 text-xs font-semibold rounded-lg gap-2",
    lg: "px-4 py-2.5 text-sm font-semibold rounded-xl gap-2",
};

export default function Button({
    children,
    variant = "primary",
    size = "m",
    className = "",
    href,
    disabled,
    ...props
}: ButtonProps) {
    const base =
        "inline-flex items-center justify-center font-medium transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none";
    const combined = `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    if (href && !disabled) {
        return (
            <Link href={href} className={combined}>
                {children}
            </Link>
        );
    }

    return (
        <button className={combined} disabled={disabled} {...props}>
            {children}
        </button>
    );
}
