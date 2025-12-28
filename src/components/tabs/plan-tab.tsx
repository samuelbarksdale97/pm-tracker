'use client';

import { Lightbulb, BookOpen, Mountain } from 'lucide-react';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { UserStoryTable } from '@/components/user-story-table';
import { CreateStoryDialog } from '@/components/create-story-dialog';
import { MillerLayout } from '@/components/miller-columns';
import { UserStory, TeamMember, Story } from '@/lib/supabase';
import { useUrlState } from '@/hooks/use-url-state';

type PlanView = 'epics' | 'stories';

interface PlanTabProps {
    projectId: string;
    userStories: UserStory[];
    teamMembers: TeamMember[];
    onUserStoryClick: (userStory: UserStory) => void;
    onTaskClick: (task: Story) => void;
    onNewUserStoryCreated: (userStory: UserStory) => void;
    onRefresh: () => void;
}

const viewOptions = [
    { key: 'epics' as const, label: 'Epics', icon: Mountain },
    { key: 'stories' as const, label: 'Stories', icon: BookOpen },
];

export function PlanTab({
    projectId,
    userStories,
    teamMembers,
    onUserStoryClick,
    onTaskClick,
    onNewUserStoryCreated,
    onRefresh,
}: PlanTabProps) {
    const [view, setView] = useUrlState<PlanView>('view', 'epics');

    return (
        <div className="space-y-4">
            {/* Tab Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-400" />
                        <h2 className="text-xl font-semibold text-white">Plan</h2>
                    </div>
                    <ViewModeSwitcher
                        options={viewOptions}
                        value={view}
                        onChange={setView}
                    />
                </div>

                {/* Create Story button - only show in stories view */}
                {view === 'stories' && (
                    <CreateStoryDialog
                        projectId={projectId}
                        onUserStoryCreated={onNewUserStoryCreated}
                    />
                )}
            </div>

            {/* View Content */}
            {view === 'epics' && (
                <MillerLayout
                    projectId={projectId}
                    teamMembers={teamMembers}
                    onRefresh={onRefresh}
                />
            )}

            {view === 'stories' && (
                <>
                    <p className="text-gray-500 text-sm">
                        Click a User Story to expand and see related implementation tasks.
                    </p>
                    <UserStoryTable
                        userStories={userStories}
                        teamMembers={teamMembers}
                        onTaskClick={onTaskClick}
                        onUserStoryClick={onUserStoryClick}
                    />
                </>
            )}
        </div>
    );
}
