'use client';

import { useMemo } from 'react';
import { Story, Workstream, UserStory } from '@/lib/supabase';
import { Card } from '@/components/ui/card';

interface ProgressDashboardProps {
    stories: Story[];
    userStories: UserStory[];
    workstreams: Workstream[];
    onStoryClick?: (story: Story) => void;
}

export function ProgressDashboard({ userStories }: ProgressDashboardProps) {
    // Use userStories as the primary data source for progress tracking
    const stats = useMemo(() => {
        const byStatus = {
            'Not Started': userStories.filter(s => s.status === 'Not Started').length,
            'In Progress': userStories.filter(s => s.status === 'In Progress').length,
            'Done': userStories.filter(s => s.status === 'Done').length,
            'Blocked': userStories.filter(s => s.status === 'Blocked').length,
            'Testing': userStories.filter(s => s.status === 'Testing').length,
        };

        const byPriority = {
            'P0': userStories.filter(s => s.priority === 'P0').length,
            'P1': userStories.filter(s => s.priority === 'P1').length,
            'P2': userStories.filter(s => s.priority === 'P2').length,
        };

        // Group by feature_area instead of workstream for user stories
        const featureAreas = new Map<string, { name: string; total: number; done: number }>();
        userStories.forEach(s => {
            const area = s.feature_area || 'Uncategorized';
            const existing = featureAreas.get(area) || { name: area, total: 0, done: 0 };
            existing.total++;
            if (s.status === 'Done') existing.done++;
            featureAreas.set(area, existing);
        });

        const byFeatureArea = Array.from(featureAreas.values()).map((fa, i) => ({
            id: fa.name,
            name: fa.name,
            color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'][i % 8],
            total: fa.total,
            done: fa.done,
            percentage: fa.total > 0 ? Math.round((fa.done / fa.total) * 100) : 0,
        }));

        return { byStatus, byPriority, byFeatureArea };
    }, [userStories]);

    const completionPercentage = userStories.length > 0
        ? Math.round((stats.byStatus.Done / userStories.length) * 100)
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
                    <span className="text-green-400 font-semibold">{stats.byStatus.Done}</span> of {userStories.length} user stories
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
                        { label: 'Testing', count: stats.byStatus.Testing, color: '#F59E0B' },
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
                                            width: `${userStories.length > 0 ? (item.count / userStories.length) * 100 : 0}%`,
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
                        const height = userStories.length > 0 ? (item.count / userStories.length) * 100 : 0;
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

            {/* Feature Area Progress */}
            <Card className="bg-gray-900 border-gray-800 p-6 col-span-full">
                <h3 className="text-lg font-semibold text-white mb-4">Progress by Feature Area</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.byFeatureArea.map((fa) => (
                        <div
                            key={fa.id}
                            className="p-4 rounded-lg"
                            style={{ backgroundColor: `${fa.color}15` }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: fa.color }}
                                />
                                <span className="font-medium text-white text-sm">{fa.name}</span>
                            </div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-3xl font-bold" style={{ color: fa.color }}>
                                    {fa.percentage}%
                                </span>
                                <span className="text-gray-400 text-sm">
                                    ({fa.done}/{fa.total})
                                </span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${fa.percentage}%`,
                                        backgroundColor: fa.color
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Blockers Alert - from tasks if any are blocked */}
            {stats.byStatus.Blocked > 0 && (
                <Card className="bg-red-950 border-red-800 p-6 col-span-full">
                    <h3 className="text-lg font-semibold text-red-400 mb-2">
                        {stats.byStatus.Blocked} Blocked User Stories
                    </h3>
                    <p className="text-gray-300 text-sm">
                        These user stories require attention before work can proceed.
                    </p>
                </Card>
            )}
        </div>
    );
}
