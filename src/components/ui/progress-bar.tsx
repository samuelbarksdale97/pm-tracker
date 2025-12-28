'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'warning' | 'danger';
    showLabel?: boolean;
    labelPosition?: 'inside' | 'right';
    className?: string;
    animated?: boolean;
}

const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
};

const variantStyles = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
};

export function ProgressBar({
    value,
    max = 100,
    size = 'md',
    variant = 'success',
    showLabel = false,
    labelPosition = 'right',
    className,
    animated = false,
}: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div className={cn(
                'flex-1 bg-gray-700 rounded-full overflow-hidden',
                sizeStyles[size]
            )}>
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-500',
                        variantStyles[variant],
                        animated && 'animate-pulse'
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && labelPosition === 'right' && (
                <span className="text-sm font-medium text-gray-400 w-10 text-right">
                    {Math.round(percentage)}%
                </span>
            )}
        </div>
    );
}

// Segmented progress for showing multiple states
interface SegmentedProgressProps {
    segments: Array<{
        value: number;
        color: string;
        label?: string;
    }>;
    total: number;
    size?: 'sm' | 'md' | 'lg';
    showLegend?: boolean;
    className?: string;
}

export function SegmentedProgress({
    segments,
    total,
    size = 'md',
    showLegend = false,
    className,
}: SegmentedProgressProps) {
    return (
        <div className={cn('space-y-2', className)}>
            <div className={cn(
                'flex bg-gray-700 rounded-full overflow-hidden',
                sizeStyles[size]
            )}>
                {segments.map((segment, idx) => {
                    const percentage = total > 0 ? (segment.value / total) * 100 : 0;
                    return (
                        <div
                            key={idx}
                            className="h-full transition-all duration-500"
                            style={{
                                width: `${percentage}%`,
                                backgroundColor: segment.color,
                            }}
                            title={segment.label ? `${segment.label}: ${segment.value}` : undefined}
                        />
                    );
                })}
            </div>
            {showLegend && (
                <div className="flex gap-4 text-xs">
                    {segments.map((segment, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: segment.color }}
                            />
                            <span className="text-gray-400">
                                {segment.label || `Segment ${idx + 1}`}: {segment.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Circular progress for dashboards
interface CircularProgressProps {
    value: number;
    max?: number;
    size?: number;
    strokeWidth?: number;
    variant?: 'default' | 'success' | 'warning' | 'danger';
    showLabel?: boolean;
    label?: string;
    sublabel?: string;
    className?: string;
}

const circularVariantStyles = {
    default: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
};

export function CircularProgress({
    value,
    max = 100,
    size = 120,
    strokeWidth = 10,
    variant = 'success',
    showLabel = true,
    label,
    sublabel,
    className,
}: CircularProgressProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className={cn('relative inline-flex items-center justify-center', className)}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#374151"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={circularVariantStyles[variant]}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            {showLabel && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                        {label || `${Math.round(percentage)}%`}
                    </span>
                    {sublabel && (
                        <span className="text-xs text-gray-400">{sublabel}</span>
                    )}
                </div>
            )}
        </div>
    );
}
