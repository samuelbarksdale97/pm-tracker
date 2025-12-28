'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-md bg-gray-800',
                className
            )}
            style={style}
        />
    );
}

// Common skeleton patterns
export function CardSkeleton({ className }: SkeletonProps) {
    return (
        <div className={cn('bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3', className)}>
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-6 w-6 rounded-full" />
            </div>
        </div>
    );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
    return (
        <div className="flex items-center gap-4 p-3 border-b border-gray-800">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        'h-4',
                        i === 0 ? 'w-12' : i === 1 ? 'w-48' : 'w-20'
                    )}
                />
            ))}
        </div>
    );
}

export function KanbanColumnSkeleton() {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg min-w-[280px] p-4 space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-8" />
            </div>
            <div className="space-y-3">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                ))}
            </div>

            {/* Charts area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                <Skeleton className="h-2 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function GanttSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-32" />
                </div>
            </div>

            {/* Chart area */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-8 w-full" style={{ marginLeft: `${i * 40}px` }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
