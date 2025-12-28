'use client';

import { useMemo } from 'react';
import { Story, Workstream } from '@/lib/supabase';
import { Card } from '@/components/ui/card';

interface ProgressDashboardProps {
    stories: Story[];
    workstreams: Workstream[];
    onStoryClick?: (story: Story) => void;
}

export function ProgressDashboard({ stories, workstreams, onStoryClick }: ProgressDashboardProps) {
    const stats = useMemo(() => {
        const byStatus = {
            'Not Started': stories.filter(t => t.status === 'Not Started').length,
            'In Progress': stories.filter(t => t.status === 'In Progress').length,
            'Done': stories.filter(t => t.status === 'Done').length,
            'Blocked': stories.filter(t => t.status === 'Blocked').length,
            'On Hold': stories.filter(t => t.status === 'On Hold').length,
        };

        const byPriority = {
            'P0': stories.filter(t => t.priority === 'P0').length,
            'P1': stories.filter(t => t.priority === 'P1').length,
            'P2': stories.filter(t => t.priority === 'P2').length,
        };

        const byWorkstream = workstreams.map(ws => {
            const wsStories = stories.filter(t => t.workstream_id === ws.id);
            const done = wsStories.filter(t => t.status === 'Done').length;
            return {
                id: ws.id,
                name: ws.name,
                color: ws.color || '#666',
                total: wsStories.length,
                done,
                percentage: wsStories.length > 0 ? Math.round((done / wsStories.length) * 100) : 0,
            };
        });

        // Estimate total days
        const totalEstimate = stories.reduce((sum, t) => {
            if (!t.estimate) return sum;
            const match = t.estimate.match(/(\d+)([dh])/);
            if (!match) return sum;
            const [, num, unit] = match;
            return sum + (unit === 'd' ? parseInt(num) : parseInt(num) / 8);
        }, 0);

        const completedEstimate = stories
            .filter(t => t.status === 'Done')
            .reduce((sum, t) => {
                if (!t.estimate) return sum;
                const match = t.estimate.match(/(\d+)([dh])/);
                if (!match) return sum;
                const [, num, unit] = match;
                return sum + (unit === 'd' ? parseInt(num) : parseInt(num) / 8);
            }, 0);

        return { byStatus, byPriority, byWorkstream, totalEstimate, completedEstimate };
    }, [stories, workstreams]);

    const completionPercentage = stories.length > 0
        ? Math.round((stats.byStatus.Done / stories.length) * 100)
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Overall Progress */}
            <Card className="bg-gray-900 border-gray-800 p-6 col-span-full lg:col-span-1">
                <h3 className="text-lg font-semibold text-white mb-4">Overall Progress</h3>
                <div className="relative w-40 h-40 mx-auto">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="#374151"
                            strokeWidth="12"
                            fill="none"
                        />
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            stroke="#10B981"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${completionPercentage * 4.4} 440`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-white">{completionPercentage}%</span>
                        <span className="text-gray-400 text-sm">Complete</span>
                    </div>
                </div>
                <div className="mt-4 text-center text-gray-400">
                    <span className="text-green-400 font-semibold">{stats.byStatus.Done}</span> of {stories.length} stories
                </div>
            </Card>

            {/* Status Breakdown */}
            <Card className="bg-gray-900 border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">By Status</h3>
                <div className="space-y-3">
                    {[
                        { label: 'Not Started', count: stats.byStatus['Not Started'], color: '#6B7280' },
                        { label: 'In Progress', count: stats.byStatus['In Progress'], color: '#3B82F6' },
                        { label: 'Done', count: stats.byStatus.Done, color: '#10B981' },
                        { label: 'Blocked', count: stats.byStatus.Blocked, color: '#EF4444' },
                        { label: 'On Hold', count: stats.byStatus['On Hold'], color: '#F59E0B' },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                            <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-300">{item.label}</span>
                                    <span className="text-gray-400">{item.count}</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${(item.count / stories.length) * 100}%`,
                                            backgroundColor: item.color
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Priority Breakdown */}
            <Card className="bg-gray-900 border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">By Priority</h3>
                <div className="flex justify-around items-end h-40">
                    {[
                        { label: 'P0', count: stats.byPriority.P0, color: '#EF4444', desc: 'Critical' },
                        { label: 'P1', count: stats.byPriority.P1, color: '#F59E0B', desc: 'Important' },
                        { label: 'P2', count: stats.byPriority.P2, color: '#6B7280', desc: 'Nice-to-have' },
                    ].map((item) => {
                        const height = (item.count / stories.length) * 100;
                        return (
                            <div key={item.label} className="flex flex-col items-center gap-2">
                                <span className="text-2xl font-bold" style={{ color: item.color }}>
                                    {item.count}
                                </span>
                                <div
                                    className="w-16 rounded-t transition-all"
                                    style={{
                                        height: `${Math.max(height, 10)}%`,
                                        backgroundColor: item.color
                                    }}
                                />
                                <div className="text-center">
                                    <div className="font-semibold text-white">{item.label}</div>
                                    <div className="text-xs text-gray-500">{item.desc}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Workstream Progress */}
            <Card className="bg-gray-900 border-gray-800 p-6 col-span-full">
                <h3 className="text-lg font-semibold text-white mb-4">Workstream Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.byWorkstream.map((ws) => (
                        <div
                            key={ws.id}
                            className="p-4 rounded-lg"
                            style={{ backgroundColor: `${ws.color}15` }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: ws.color }}
                                />
                                <span className="font-medium text-white">{ws.name}</span>
                            </div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl font-bold" style={{ color: ws.color }}>
                                    {ws.percentage}%
                                </span>
                                <span className="text-gray-400 text-sm">
                                    ({ws.done}/{ws.total})
                                </span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${ws.percentage}%`,
                                        backgroundColor: ws.color
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Blockers Alert */}
            {stats.byStatus.Blocked > 0 && (
                <Card className="bg-red-950 border-red-800 p-6 col-span-full">
                    <h3 className="text-lg font-semibold text-red-400 mb-2">
                        ⚠️ {stats.byStatus.Blocked} Blocked Tasks
                    </h3>
                    <p className="text-gray-300 text-sm">
                        These tasks require attention before work can proceed:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {stories
                            .filter(t => t.status === 'Blocked')
                            .map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => onStoryClick?.(t)}
                                    className="bg-red-900 text-red-300 px-2 py-1 rounded text-sm hover:bg-red-800 hover:text-red-200 transition-colors cursor-pointer text-left"
                                >
                                    {t.name.substring(0, 40)}{t.name.length > 40 ? '...' : ''}
                                </button>
                            ))}
                    </div>
                </Card>
            )}

            {/* Time Estimate */}
            <Card className="bg-gray-900 border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Estimated Effort</h3>
                <div className="text-center">
                    <div className="text-4xl font-bold text-blue-400 mb-1">
                        {Math.round(stats.totalEstimate)} days
                    </div>
                    <div className="text-gray-400 text-sm mb-4">Total estimated</div>
                    <div className="text-2xl font-semibold text-green-400">
                        {Math.round(stats.completedEstimate)} days
                    </div>
                    <div className="text-gray-400 text-sm">Completed</div>
                </div>
            </Card>
        </div>
    );
}
