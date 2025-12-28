'use client';

import { useState } from 'react';
import { Story, TeamMember } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface StoryRowProps {
    story: Story;
    teamMembers: TeamMember[];
    onStatusChange: (storyId: string, status: Story['status']) => void;
    onOwnerChange: (storyId: string, ownerId: string | null) => void;
    onStoryClick: (story: Story) => void;
}

const statusColors: Record<Story['status'], string> = {
    'Not Started': 'bg-gray-500',
    'In Progress': 'bg-blue-500',
    'Testing': 'bg-purple-500',
    'Done': 'bg-green-500',
    'Blocked': 'bg-red-500',
    'On Hold': 'bg-yellow-500',
};

const priorityColors: Record<string, string> = {
    'P0': 'bg-red-600 text-white',
    'P1': 'bg-yellow-500 text-black',
    'P2': 'bg-gray-400 text-white',
};

export function StoryRow({ story, teamMembers, onStatusChange, onOwnerChange, onStoryClick }: StoryRowProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isBlocked = story.status === 'Blocked';
    const hasUserStories = story.user_stories && story.user_stories.length > 0;

    return (
        <>
            <tr
                className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${isBlocked ? 'opacity-70' : ''}`}
            >
                <td className="p-3 font-mono text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        {hasUserStories && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                            </button>
                        )}
                        {!hasUserStories && <span className="w-6" />}
                        {story.id}
                    </div>
                </td>
                <td className="p-3" onClick={() => onStoryClick(story)}>
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-white hover:text-blue-400 transition-colors">{story.name}</span>
                        {story.notes && (
                            <span className="text-xs text-gray-500">{story.notes}</span>
                        )}
                        {story.dependencies && story.dependencies.length > 0 && (
                            <span className="text-xs text-gray-600">
                                Deps: {story.dependencies.join(', ')}
                            </span>
                        )}
                    </div>
                </td>
                <td className="p-3">
                    <Badge className={priorityColors[story.priority]}>{story.priority}</Badge>
                </td>
                <td className="p-3 text-sm text-gray-400">{story.estimate || '-'}</td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <Select
                        value={story.status}
                        onValueChange={(value) => onStatusChange(story.id, value as Story['status'])}
                    >
                        <SelectTrigger className={`w-32 ${statusColors[story.status]} border-0 text-white`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                            <SelectItem value="Blocked">Blocked</SelectItem>
                            <SelectItem value="On Hold">On Hold</SelectItem>
                        </SelectContent>
                    </Select>
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <Select
                        value={story.owner_id || 'unassigned'}
                        onValueChange={(value) => onOwnerChange(story.id, value === 'unassigned' ? null : value)}
                    >
                        <SelectTrigger className="w-36 bg-gray-800 border-gray-700">
                            <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                    {member.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </td>
            </tr>
            {/* Expanded User Stories */}
            {isExpanded && hasUserStories && (
                <tr className="bg-gray-900/50">
                    <td colSpan={6} className="p-0">
                        <div className="pl-12 pr-4 py-3 border-l-4 border-blue-500 ml-4">
                            <div className="text-xs font-semibold text-blue-400 mb-2">User Stories</div>
                            <ul className="space-y-2">
                                {story.user_stories?.map((us, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                        <span className="text-blue-400 mt-0.5">•</span>
                                        <span>{us}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
