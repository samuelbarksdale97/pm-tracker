'use client';

import { Story, TeamMember } from '@/lib/supabase';
import { StoryRow } from './story-row';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface StoryTableProps {
    stories: Story[];
    teamMembers: TeamMember[];
    onStatusChange: (storyId: string, status: Story['status']) => void;
    onOwnerChange: (storyId: string, ownerId: string | null) => void;
    onStoryClick: (story: Story) => void;
}

export function StoryTable({ stories, teamMembers, onStatusChange, onOwnerChange, onStoryClick }: StoryTableProps) {
    if (stories.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No tasks match the current filters.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
            <Table>
                <TableHeader>
                    <TableRow className="border-gray-800 bg-gray-900">
                        <TableHead className="w-16 text-gray-400">ID</TableHead>
                        <TableHead className="text-gray-400">Story</TableHead>
                        <TableHead className="w-20 text-gray-400">Priority</TableHead>
                        <TableHead className="w-20 text-gray-400">Estimate</TableHead>
                        <TableHead className="w-36 text-gray-400">Status</TableHead>
                        <TableHead className="w-40 text-gray-400">Owner</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {stories.map((story) => (
                        <StoryRow
                            key={story.id}
                            story={story}
                            teamMembers={teamMembers}
                            onStatusChange={onStatusChange}
                            onOwnerChange={onOwnerChange}
                            onStoryClick={onStoryClick}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
