'use client';

import { useState } from 'react';
import { Zap, Columns3, List } from 'lucide-react';
import { ViewModeSwitcher } from '@/components/ui/view-mode-switcher';
import { KanbanBoard } from '@/components/kanban-board';
import { StoryTable } from '@/components/story-table';
import { StatsGrid } from '@/components/stats-grid';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Story, Workstream, TeamMember, UserStory } from '@/lib/supabase';

type ExecuteView = 'kanban' | 'table';

interface ExecuteTabProps {
    stories: Story[];
    workstreams: Workstream[];
    teamMembers: TeamMember[];
    userStories?: UserStory[];
    onStatusChange: (storyId: string, status: Story['status']) => Promise<void>;
    onOwnerChange: (storyId: string, ownerId: string | null) => Promise<void>;
    onStoryClick: (story: Story) => void;
}

const viewOptions = [
    { key: 'kanban' as const, label: 'Kanban', icon: Columns3 },
    { key: 'table' as const, label: 'Table', icon: List },
];

export function ExecuteTab({
    stories,
    workstreams,
    teamMembers,
    userStories = [],
    onStatusChange,
    onOwnerChange,
    onStoryClick,
}: ExecuteTabProps) {
    const [view, setView] = useState<ExecuteView>('kanban');
    const [workstreamFilter, setWorkstreamFilter] = useState<string>('all');

    // Filter stories by workstream
    const filteredStories = workstreamFilter === 'all'
        ? stories
        : stories.filter(s => s.workstream_id === workstreamFilter);

    // Calculate stats for filtered stories
    const stats = {
        total: filteredStories.length,
        notStarted: filteredStories.filter(t => t.status === 'Not Started').length,
        inProgress: filteredStories.filter(t => t.status === 'In Progress').length,
        done: filteredStories.filter(t => t.status === 'Done').length,
        blocked: filteredStories.filter(t => t.status === 'Blocked').length,
        p0: filteredStories.filter(t => t.priority === 'P0').length,
        p1: filteredStories.filter(t => t.priority === 'P1').length,
        p2: filteredStories.filter(t => t.priority === 'P2').length,
    };

    return (
        <div className="space-y-6">
            {/* Tab Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-green-400" />
                        <h2 className="text-xl font-semibold text-white">Execute</h2>
                    </div>
                    <ViewModeSwitcher
                        options={viewOptions}
                        value={view}
                        onChange={setView}
                    />
                </div>

                {/* Workstream Filter */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Workstream:</span>
                    <Select value={workstreamFilter} onValueChange={setWorkstreamFilter}>
                        <SelectTrigger className="w-48 bg-gray-900 border-gray-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Workstreams</SelectItem>
                            {workstreams.map((ws) => (
                                <SelectItem key={ws.id} value={ws.id}>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: ws.color || '#666' }}
                                        />
                                        {ws.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stats Grid - show in table view */}
            {view === 'table' && <StatsGrid stats={stats} />}

            {/* View Content */}
            {view === 'kanban' && (
                <KanbanBoard
                    stories={filteredStories}
                    teamMembers={teamMembers}
                    userStories={userStories}
                    onStatusChange={onStatusChange}
                    onStoryClick={onStoryClick}
                />
            )}

            {view === 'table' && (
                <StoryTable
                    stories={filteredStories}
                    teamMembers={teamMembers}
                    onStatusChange={onStatusChange}
                    onOwnerChange={onOwnerChange}
                    onStoryClick={onStoryClick}
                />
            )}
        </div>
    );
}
