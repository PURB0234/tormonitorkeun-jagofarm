"use client";

export type SegmentOption<T extends string = string> = {
    value: T;
    label: string;
    count?: number;
};

type SegmentedControlProps<T extends string = string> = {
    options: SegmentOption<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
    size?: "sm" | "md";
};

export default function SegmentedControl<T extends string = string>({
    options,
    value,
    onChange,
    className = "",
    size = "sm",
}: SegmentedControlProps<T>) {
    const padClasses = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs font-semibold";

    return (
        <div className={`inline-flex items-center border border-gray-200 rounded-lg bg-gray-100 p-0.5 ${className}`}>
            {options.map((opt) => {
                const isActive = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`${padClasses} rounded-md font-medium transition cursor-pointer select-none ${
                            isActive
                                ? "bg-white font-semibold text-gray-900 shadow-2xs"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        <span>{opt.label}</span>
                        {typeof opt.count === "number" && (
                            <span className="ml-1.5 text-[10px] font-mono px-1 py-0.2 rounded-full bg-gray-200 text-gray-600">
                                {opt.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
