import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    className?: string;
    wrapperClassName?: string;
};

export default function Select({
    children,
    className = "",
    wrapperClassName = "",
    ...props
}: SelectProps) {
    return (
        <div className={`relative inline-flex items-center ${wrapperClassName}`}>
            <select
                className={`appearance-none bg-white border border-gray-300 rounded-lg pl-2.5 pr-7 py-1 text-xs font-semibold text-gray-800 hover:border-gray-400 focus:outline-hidden focus:ring-1 focus:ring-green-700 cursor-pointer shadow-2xs transition ${className}`}
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2 pointer-events-none" />
        </div>
    );
}
