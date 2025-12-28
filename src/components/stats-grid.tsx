'use client';

import { Card } from '@/components/ui/card';

interface StatsCardProps {
    label: string;
    value: number;
    total?: number;
    color?: string;
}

export function StatsCard({ label, value, total, color = 'text-white' }: StatsCardProps) {
    const percentage = total ? Math.round((value / total) * 100) : null;

    return (
        <Card className="bg-gray-900 border-gray-800 p-4">
            <div className="text-sm text-gray-400 mb-1">{label}</div>
            <div className={`text-3xl font-bold ${color}`}>
                {value}
                {percentage !== null && (
                    <span className="text-sm text-gray-500 ml-2">({percentage}%)</span>
                )}
            </div>
        </Card>
    );
}

interface StatsGridProps {
    stats: {
        total: number;
        notStarted: number;
        inProgress: number;
        done: number;
        blocked: number;
        p0: number;
        p1: number;
        p2: number;
    };
}

export function StatsGrid({ stats }: StatsGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            <StatsCard label="Total Tasks" value={stats.total} color="text-white" />
            <StatsCard label="Not Started" value={stats.notStarted} total={stats.total} color="text-gray-400" />
            <StatsCard label="In Progress" value={stats.inProgress} total={stats.total} color="text-blue-400" />
            <StatsCard label="Done" value={stats.done} total={stats.total} color="text-green-400" />
            <StatsCard label="Blocked" value={stats.blocked} total={stats.total} color="text-red-400" />
            <StatsCard label="P0 (Critical)" value={stats.p0} color="text-red-500" />
            <StatsCard label="P1 (Important)" value={stats.p1} color="text-yellow-500" />
            <StatsCard label="P2 (Nice-to-have)" value={stats.p2} color="text-gray-500" />
        </div>
    );
}
