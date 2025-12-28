'use client';

import { useState } from 'react';
import { BarChart2, Heart, TrendingUp } from 'lucide-react';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ExecutiveDashboard } from '@/components/dashboard/executive-dashboard';
import { ProgressDashboard } from '@/components/progress-dashboard';
import { StatsGrid } from '@/components/stats-grid';
import { Story, Workstream } from '@/lib/supabase';

type MonitorView = 'health' | 'analytics';

interface MonitorTabProps {
    projectId: string;
    stories: Story[];
    workstreams: Workstream[];
    onStoryClick: (story: Story) => void;
}

const viewOptions = [
    { key: 'health' as const, label: 'Health', icon: Heart },
    { key: 'analytics' as const, label: 'Analytics', icon: TrendingUp },
];

export function MonitorTab({
    projectId,
    stories,
    workstreams,
    onStoryClick,
}: MonitorTabProps) {
    const [view, setView] = useState<MonitorView>('health');

    // Calculate stats for analytics view
    const stats = {
        total: stories.length,
        notStarted: stories.filter(t => t.status === 'Not Started').length,
        inProgress: stories.filter(t => t.status === 'In Progress').length,
        done: stories.filter(t => t.status === 'Done').length,
        blocked: stories.filter(t => t.status === 'Blocked').length,
        p0: stories.filter(t => t.priority === 'P0').length,
        p1: stories.filter(t => t.priority === 'P1').length,
        p2: stories.filter(t => t.priority === 'P2').length,
    };

    return (
        <div className="space-y-6">
            {/* Tab Header */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-purple-400" />
                    <h2 className="text-xl font-semibold text-white">Monitor</h2>
                </div>
                <ViewModeSwitcher
                    options={viewOptions}
                    value={view}
                    onChange={setView}
                />
            </div>

            {/* View Content */}
            {view === 'health' && (
                <ExecutiveDashboard projectId={projectId} />
            )}

            {view === 'analytics' && (
                <>
                    <StatsGrid stats={stats} />
                    <ProgressDashboard
                        stories={stories}
                        workstreams={workstreams}
                        onStoryClick={onStoryClick}
                    />
                </>
            )}
        </div>
    );
}
