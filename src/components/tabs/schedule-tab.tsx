'use client';

import { useState } from 'react';
import { Calendar, LayoutGrid, Target } from 'lucide-react';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { MilestoneBoard } from '@/components/milestone-board';
import { GoalsTimeline } from '@/components/goals-timeline';
import { Milestone, UserStory, Feature } from '@/lib/supabase';

type ScheduleView = 'goals' | 'board';

interface ScheduleTabProps {
    projectId: string;
    milestones: Milestone[];
    userStories: UserStory[];
    features: Feature[];
    onRefresh: () => void;
    onUserStoryCreated: (userStory: UserStory) => void;
}

const viewOptions = [
    { key: 'goals' as const, label: 'Goals', icon: Target },
    { key: 'board' as const, label: 'Board', icon: LayoutGrid },
];

export function ScheduleTab({
    projectId,
    milestones,
    userStories,
    features,
    onRefresh,
    onUserStoryCreated,
}: ScheduleTabProps) {
    const [view, setView] = useState<ScheduleView>('goals');

    return (
        <div className="space-y-6">
            {/* Tab Header */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-semibold text-white">Schedule</h2>
                </div>
                <ViewModeSwitcher
                    options={viewOptions}
                    value={view}
                    onChange={setView}
                />
            </div>

            {/* View Content */}
            {view === 'goals' && (
                <GoalsTimeline
                    projectId={projectId}
                    onRefresh={onRefresh}
                />
            )}

            {view === 'board' && (
                <MilestoneBoard
                    projectId={projectId}
                    milestones={milestones}
                    userStories={userStories}
                    features={features}
                    onRefresh={onRefresh}
                    onUserStoryCreated={onUserStoryCreated}
                />
            )}
        </div>
    );
}
