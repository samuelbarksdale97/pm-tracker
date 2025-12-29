'use client';

import { useState, useEffect, useCallback } from 'react';
import { Story, TeamMember, UserStory } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ChevronDown,
    ChevronRight,
    Clock,
    Link2,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanColumn, getVisibleColumns } from '@/lib/kanban-config';
import { KanbanSettingsDialog } from '@/components/kanban-settings-dialog';

interface KanbanBoardProps {
    stories: Story[];
    teamMembers: TeamMember[];
    userStories?: UserStory[];
    onStatusChange: (storyId: string, status: Story['status']) => void;
    onStoryClick: (story: Story) => void;
}

// Priority colors for top stripe and badge
const priorityConfig: Record<string, { stripe: string; bg: string; text: string }> = {
    'P0': { stripe: 'bg-red-500', bg: 'bg-red-500/20', text: 'text-red-400' },
    'P1': { stripe: 'bg-amber-500', bg: 'bg-amber-500/20', text: 'text-amber-400' },
    'P2': { stripe: 'bg-gray-500', bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

// Avatar colors for team members (consistent per name)
const avatarColors = [
    'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-pink-600',
    'bg-indigo-600', 'bg-teal-600', 'bg-orange-600', 'bg-cyan-600',
];

export function KanbanBoard({ stories, teamMembers, userStories = [], onStatusChange, onStoryClick }: KanbanBoardProps) {
    const [draggedStory, setDraggedStory] = useState<Story | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<Story['status'] | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [columns, setColumns] = useState<KanbanColumn[]>([]);

    // Load columns from localStorage
    const loadColumns = useCallback(() => {
        setColumns(getVisibleColumns());
    }, []);

    useEffect(() => {
        loadColumns();
    }, [loadColumns]);

    // Get user story info by ID
    const getUserStoryInfo = (userStoryId: string | null) => {
        if (!userStoryId) return { name: 'Ungrouped', narrative: '' };
        const us = userStories.find(u => u.id === userStoryId);
        if (!us) return { name: `Story`, narrative: '' };
        // Extract just the "As a..." part or truncate
        const narrative = us.narrative;
        const shortened = narrative.length > 40 ? narrative.slice(0, 40) + '…' : narrative;
        return { name: shortened, narrative, priority: us.priority };
    };

    const toggleGroup = (groupKey: string) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupKey)) {
                newSet.delete(groupKey);
            } else {
                newSet.add(groupKey);
            }
            return newSet;
        });
    };

    const handleDragStart = (e: React.DragEvent, story: Story) => {
        setDraggedStory(story);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedStory(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e: React.DragEvent, status: Story['status']) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(status);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = (e: React.DragEvent, status: Story['status']) => {
        e.preventDefault();
        if (draggedStory && draggedStory.status !== status) {
            onStatusChange(draggedStory.id, status);
        }
        setDraggedStory(null);
        setDragOverColumn(null);
    };

    const getColumnStories = (status: Story['status']) => {
        return stories.filter(t => t.status === status);
    };

    // Get stories for a column, grouped by user story
    const getGroupedColumnStories = (status: Story['status']) => {
        const columnStories = stories.filter(t => t.status === status);
        const groups: Map<string | null, Story[]> = new Map();

        columnStories.forEach(story => {
            const key = story.user_story_id;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(story);
        });

        // Sort groups: assigned user stories first (by priority), unassigned last
        const sortedEntries = Array.from(groups.entries()).sort(([keyA], [keyB]) => {
            if (keyA === null) return 1;
            if (keyB === null) return -1;
            return 0;
        });

        return sortedEntries;
    };

    // Get owner info for pill display
    const getOwnerInfo = (ownerId: string | null) => {
        if (!ownerId) return null;
        const member = teamMembers.find(m => m.id === ownerId);
        if (!member?.name) return null;
        // Consistent color based on name
        const colorIndex = member.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length;
        // Use first name for cleaner display
        const firstName = member.name.split(' ')[0];
        return { firstName, color: avatarColors[colorIndex], fullName: member.name };
    };

    // Don't render until columns are loaded
    if (columns.length === 0) {
        return <div className="h-96 flex items-center justify-center text-gray-500">Loading...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Settings bar */}
            <div className="flex justify-end">
                <KanbanSettingsDialog onColumnsChange={loadColumns} />
            </div>

            {/* Kanban columns */}
            <div className="flex gap-3 overflow-x-auto pb-4">
                {columns.map((column) => {
                const columnStories = getColumnStories(column.status);
                const isOver = dragOverColumn === column.status;
                const isOverWipLimit = column.wipLimit && columnStories.length >= column.wipLimit;

                return (
                    <div
                        key={column.status}
                        className={cn(
                            "flex-shrink-0 w-72 rounded-xl transition-all",
                            isOver ? 'bg-gray-800/80 ring-2 ring-blue-500/50' : 'bg-gray-900/50',
                            isOverWipLimit && 'ring-2 ring-amber-500/50'
                        )}
                        onDragOver={(e) => handleDragOver(e, column.status)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, column.status)}
                    >
                        {/* Column Header - Cleaner design */}
                        <div className="px-3 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: column.color }}
                                />
                                <span className="font-medium text-sm text-gray-200">{column.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={cn(
                                    "text-xs font-medium px-2 py-0.5 rounded-full",
                                    isOverWipLimit ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500'
                                )}>
                                    {columnStories.length}
                                    {column.wipLimit && <span className="text-gray-600">/{column.wipLimit}</span>}
                                </span>
                            </div>
                        </div>

                        {/* Column Body */}
                        <div className="px-2 pb-2 min-h-[400px] space-y-3">
                            {getGroupedColumnStories(column.status).map(([userStoryId, groupStories]) => {
                                const groupKey = `${column.status}-${userStoryId || 'unassigned'}`;
                                const isCollapsed = collapsedGroups.has(groupKey);
                                const usInfo = getUserStoryInfo(userStoryId);

                                return (
                                    <div key={groupKey} className="space-y-1.5">
                                        {/* User Story Group Header - More prominent */}
                                        <button
                                            onClick={() => toggleGroup(groupKey)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all",
                                                userStoryId
                                                    ? "bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20"
                                                    : "bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/30"
                                            )}
                                        >
                                            {isCollapsed ? (
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                            )}
                                            <span className={cn(
                                                "text-xs flex-1 truncate",
                                                userStoryId ? "text-blue-300" : "text-gray-400"
                                            )}>
                                                {usInfo.name}
                                            </span>
                                            <span className={cn(
                                                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                                userStoryId ? "bg-blue-500/20 text-blue-400" : "bg-gray-700/50 text-gray-500"
                                            )}>
                                                {groupStories.length}
                                            </span>
                                        </button>

                                        {/* Task Cards - Redesigned */}
                                        {!isCollapsed && (
                                            <div className="space-y-2 pl-1">
                                                {groupStories.map((story) => {
                                                    const ownerInfo = getOwnerInfo(story.owner_id);
                                                    const priority = priorityConfig[story.priority] || priorityConfig['P2'];
                                                    const isBlocked = story.status === 'Blocked' || story.blocked_by;

                                                    return (
                                                        <Card
                                                            key={story.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, story)}
                                                            onDragEnd={handleDragEnd}
                                                            onClick={() => onStoryClick(story)}
                                                            className={cn(
                                                                "relative overflow-hidden bg-gray-800/80 border-gray-700/50 cursor-grab active:cursor-grabbing hover:bg-gray-800 hover:border-gray-600 transition-all group",
                                                                draggedStory?.id === story.id && 'opacity-50 scale-[0.98]',
                                                                isBlocked && 'border-red-500/30'
                                                            )}
                                                        >
                                                            {/* Priority stripe at top - Visual urgency indicator */}
                                                            {story.priority !== 'P2' && (
                                                                <div className={cn("h-1 w-full", priority.stripe)} />
                                                            )}

                                                            <div className="p-3">
                                                                {/* Card Header: Title + Priority Badge */}
                                                                <div className="flex items-start gap-2 mb-2">
                                                                    <p className="text-sm font-medium text-white flex-1 line-clamp-2 leading-snug">
                                                                        {story.name}
                                                                    </p>
                                                                    <Badge className={cn(
                                                                        "text-[10px] px-1.5 py-0 h-5 flex-shrink-0",
                                                                        priority.bg, priority.text
                                                                    )}>
                                                                        {story.priority}
                                                                    </Badge>
                                                                </div>

                                                                {/* Blocked indicator */}
                                                                {isBlocked && (
                                                                    <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-red-500/10 rounded text-red-400 text-xs">
                                                                        <AlertCircle className="w-3 h-3" />
                                                                        <span>Blocked</span>
                                                                    </div>
                                                                )}

                                                                {/* Card Footer: Metadata row */}
                                                                <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
                                                                    {/* Left side: Owner pill + optional metadata */}
                                                                    <div className="flex items-center gap-2">
                                                                        {ownerInfo ? (
                                                                            <span
                                                                                className={cn(
                                                                                    "px-2 py-0.5 rounded-full text-[10px] font-medium text-white",
                                                                                    ownerInfo.color
                                                                                )}
                                                                                title={ownerInfo.fullName}
                                                                            >
                                                                                {ownerInfo.firstName}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded-full bg-gray-700 text-[10px] text-gray-500">
                                                                                Unassigned
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Right side: Estimate + Dependencies */}
                                                                    <div className="flex items-center gap-2">
                                                                        {story.estimate && (
                                                                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                                <Clock className="w-3 h-3" />
                                                                                {story.estimate}
                                                                            </span>
                                                                        )}
                                                                        {story.dependencies && story.dependencies.length > 0 && (
                                                                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                                <Link2 className="w-3 h-3" />
                                                                                {story.dependencies.length}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Empty state */}
                            {columnStories.length === 0 && (
                                <div className={cn(
                                    "h-32 flex flex-col items-center justify-center text-sm border-2 border-dashed rounded-xl transition-all",
                                    isOver
                                        ? 'border-blue-500 bg-blue-500/5 text-blue-400'
                                        : 'border-gray-700/50 text-gray-600'
                                )}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                                        isOver ? 'bg-blue-500/20' : 'bg-gray-800/50'
                                    )}>
                                        <svg className={cn("w-5 h-5", isOver && 'animate-bounce')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                    <span className="text-xs">
                                        {isOver ? 'Drop here' : 'No tasks'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
    );
}
