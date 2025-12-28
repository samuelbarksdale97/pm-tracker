'use client';

import { useState } from 'react';
import { Calendar, BarChart3, LayoutGrid, MapPin, Target } from 'lucide-react';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { MilestoneGanttR19 } from '@/components/milestone-gantt-r19';
import { MilestoneBoard } from '@/components/milestone-board';
import { MilestoneTimeline } from '@/components/milestone-timeline';
import { GoalsTimeline } from '@/components/goals-timeline';
import { Milestone, UserStory } from '@/lib/supabase';

type ScheduleView = 'goals' | 'timeline' | 'board' | 'roadmap';

interface ScheduleTabProps {
    projectId: string;
    milestones: Milestone[];
    userStories: UserStory[];
    onRefresh: () => void;
    onUserStoryCreated: (userStory: UserStory) => void;
    onUserStoryClick?: (userStory: UserStory) => void;
}

const viewOptions = [
    { key: 'goals' as const, label: 'Goals', icon: Target },
    { key: 'timeline' as const, label: 'Timeline', icon: BarChart3 },
    { key: 'board' as const, label: 'Board', icon: LayoutGrid },
    { key: 'roadmap' as const, label: 'Roadmap', icon: MapPin },
];

export function ScheduleTab({
    projectId,
    milestones,
    userStories,
    onRefresh,
    onUserStoryCreated,
    onUserStoryClick,
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

            {view === 'timeline' && (
                <MilestoneGanttR19
                    projectId={projectId}
                    milestones={milestones}
                    userStories={userStories}
                    onRefresh={onRefresh}
                />
            )}

            {view === 'board' && (
                <MilestoneBoard
                    projectId={projectId}
                    milestones={milestones}
                    userStories={userStories}
                    onRefresh={onRefresh}
                    onUserStoryCreated={onUserStoryCreated}
                />
            )}

            {view === 'roadmap' && (
                <MilestoneTimeline
                    milestones={milestones}
                    userStories={userStories}
                    onStoryClick={onUserStoryClick}
                />
            )}
        </div>
    );
}
