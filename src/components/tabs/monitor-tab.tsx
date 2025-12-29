'use client';

import { useState, useMemo } from 'react';
import { BarChart2, Heart, TrendingUp } from 'lucide-react';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { ExecutiveDashboard } from '@/components/dashboard/executive-dashboard';
import { ExportButton } from '@/components/dashboard/export-button';
import { BackupRestoreDialog } from '@/components/backup-restore-dialog';
import { ProgressDashboard } from '@/components/progress-dashboard';
import { StatsGrid } from '@/components/stats-grid';
import { Story, Workstream, UserStory } from '@/lib/supabase';

type MonitorView = 'health' | 'analytics';

interface MonitorTabProps {
    projectId: string;
    projectName: string;
    stories: Story[];
    userStories: UserStory[];
    workstreams: Workstream[];
    onStoryClick: (story: Story) => void;
    onRefresh: () => void;
}

const viewOptions = [
    { key: 'health' as const, label: 'Health', icon: Heart },
    { key: 'analytics' as const, label: 'Analytics', icon: TrendingUp },
];

export function MonitorTab({
    projectId,
    projectName,
    stories,
    userStories,
    workstreams,
    onStoryClick,
    onRefresh,
}: MonitorTabProps) {
    const [view, setView] = useState<MonitorView>('health');

    // Calculate stats from User Stories (primary planning artifacts)
    const stats = useMemo(() => ({
        total: userStories.length,
        notStarted: userStories.filter(s => s.status === 'Not Started').length,
        inProgress: userStories.filter(s => s.status === 'In Progress').length,
        done: userStories.filter(s => s.status === 'Done').length,
        blocked: userStories.filter(s => s.status === 'Blocked').length,
        p0: userStories.filter(s => s.priority === 'P0').length,
        p1: userStories.filter(s => s.priority === 'P1').length,
        p2: userStories.filter(s => s.priority === 'P2').length,
    }), [userStories]);

    return (
        <div className="space-y-6">
            {/* Tab Header */}
            <div className="flex items-center justify-between">
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
                <div className="flex items-center gap-2">
                    <BackupRestoreDialog
                        projectId={projectId}
                        projectName={projectName}
                        onRestoreComplete={onRefresh}
                    />
                    <ExportButton projectId={projectId} projectName={projectName} />
                </div>
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
                        userStories={userStories}
                        workstreams={workstreams}
                        onStoryClick={onStoryClick}
                    />
                </>
            )}
        </div>
    );
}
