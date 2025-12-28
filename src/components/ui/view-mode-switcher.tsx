'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewOption<T extends string> {
    key: T;
    label: string;
    icon?: LucideIcon;
}

interface ViewModeSwitcherProps<T extends string> {
    options: ViewOption<T>[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
}

export function ViewModeSwitcher<T extends string>({
    options,
    value,
    onChange,
    className,
}: ViewModeSwitcherProps<T>) {
    return (
        <div className={cn('inline-flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg', className)}>
            {options.map((option) => {
                const Icon = option.icon;
                const isActive = value === option.key;

                return (
                    <button
                        key={option.key}
                        onClick={() => onChange(option.key)}
                        className={cn(
                            'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5',
                            isActive
                                ? 'bg-gray-700 text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                        )}
                    >
                        {Icon && <Icon className="w-4 h-4" />}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
