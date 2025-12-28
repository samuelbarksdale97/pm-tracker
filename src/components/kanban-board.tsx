'use client';

import { useState } from 'react';
import { Story, TeamMember, UserStory } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ChevronDown,
    ChevronRight,
    User,
    Clock,
    Link2,
    AlertTriangle,
    Smartphone,
    Monitor,
    Server,
    Settings,
    BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
    stories: Story[];
    teamMembers: TeamMember[];
    userStories?: UserStory[];
    onStatusChange: (storyId: string, status: Story['status']) => void;
    onStoryClick: (story: Story) => void;
}

const columns: { status: Story['status']; label: string; color: string; wipLimit?: number }[] = [
    { status: 'Not Started', label: 'Not Started', color: '#6B7280' },
    { status: 'In Progress', label: 'In Progress', color: '#3B82F6', wipLimit: 5 },
    { status: 'Testing', label: 'Testing', color: '#8B5CF6', wipLimit: 3 },
    { status: 'Blocked', label: 'Blocked', color: '#EF4444', wipLimit: 3 },
    { status: 'On Hold', label: 'On Hold', color: '#F59E0B' },
    { status: 'Done', label: 'Done', color: '#10B981' },
];

const priorityColors: Record<string, string> = {
    'P0': 'bg-red-600 text-white',
    'P1': 'bg-yellow-500 text-black',
    'P2': 'bg-gray-500 text-white',
};

const workstreamColors: Record<string, string> = {
    'A': '#3B82F6',
    'B': '#10B981',
    'C': '#8B5CF6',
    'D': '#F59E0B',
};

export function KanbanBoard({ stories, teamMembers, userStories = [], onStatusChange, onStoryClick }: KanbanBoardProps) {
    const [draggedStory, setDraggedStory] = useState<Story | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<Story['status'] | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    // Get user story info by ID
    const getUserStoryInfo = (userStoryId: string | null) => {
        if (!userStoryId) return { name: 'Unassigned Tasks', narrative: 'Tasks not linked to a user story' };
        const us = userStories.find(u => u.id === userStoryId);
        if (!us) return { name: `US: ${userStoryId.slice(0, 8)}...`, narrative: '' };
        return {
            name: us.narrative.length > 50 ? us.narrative.slice(0, 50) + '...' : us.narrative,
            narrative: us.narrative,
            priority: us.priority
        };
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

    const getOwnerName = (ownerId: string | null) => {
        if (!ownerId) return null;
        const member = teamMembers.find(m => m.id === ownerId);
        return member?.name?.split(' ')[0] || null;
    };

    // Get platform icon
    const getPlatformIcon = (platform: string | null | undefined) => {
        const iconClass = "w-3.5 h-3.5";
        switch (platform?.toLowerCase()) {
            case 'mobile':
                return <Smartphone className={cn(iconClass, "text-green-400")} />;
            case 'admin':
                return <Monitor className={cn(iconClass, "text-purple-400")} />;
            case 'backend':
                return <Server className={cn(iconClass, "text-blue-400")} />;
            case 'infra':
                return <Settings className={cn(iconClass, "text-orange-400")} />;
            default:
                return <BookOpen className={cn(iconClass, "text-gray-400")} />;
        }
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => {
                const columnStories = getColumnStories(column.status);
                const isOver = dragOverColumn === column.status;
                const isOverWipLimit = column.wipLimit && columnStories.length >= column.wipLimit;

                return (
                    <div
                        key={column.status}
                        className={`flex-shrink-0 w-72 rounded-lg transition-colors ${isOver ? 'bg-gray-800' : 'bg-gray-900'
                            } ${isOverWipLimit ? 'ring-2 ring-amber-500/50' : ''}`}
                        onDragOver={(e) => handleDragOver(e, column.status)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, column.status)}
                    >
                        {/* Column Header */}
                        <div
                            className="p-3 rounded-t-lg flex items-center justify-between"
                            style={{ backgroundColor: `${column.color}20` }}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: column.color }}
                                />
                                <span className="font-medium text-white">{column.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Badge
                                    variant="secondary"
                                    className={`${isOverWipLimit ? 'bg-amber-600 text-white' : 'bg-gray-700'}`}
                                >
                                    {columnStories.length}
                                    {column.wipLimit && (
                                        <span className="text-gray-400 ml-0.5">/{column.wipLimit}</span>
                                    )}
                                </Badge>
                                {isOverWipLimit && (
                                    <span className="text-amber-400 text-xs" title="WIP limit exceeded">⚠️</span>
                                )}
                            </div>
                        </div>

                        {/* Column Body */}
                        <div className="p-2 min-h-[400px] space-y-3">
                            {getGroupedColumnStories(column.status).map(([userStoryId, groupStories]) => {
                                const groupKey = `${column.status}-${userStoryId || 'unassigned'}`;
                                const isCollapsed = collapsedGroups.has(groupKey);
                                const usInfo = getUserStoryInfo(userStoryId);

                                return (
                                    <div key={groupKey} className="space-y-2">
                                        {/* User Story Group Header */}
                                        <button
                                            onClick={() => toggleGroup(groupKey)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                                                "bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50",
                                                userStoryId ? "border-l-2 border-l-blue-500" : "border-l-2 border-l-gray-600"
                                            )}
                                        >
                                            {isCollapsed ? (
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                            )}
                                            <span className="text-xs text-gray-300 flex-1 truncate">
                                                {usInfo.name}
                                            </span>
                                            <Badge variant="secondary" className="text-[10px] bg-gray-700 h-4 px-1.5">
                                                {groupStories.length}
                                            </Badge>
                                        </button>

                                        {/* Task Cards */}
                                        {!isCollapsed && (
                                            <div className="space-y-2 pl-2">
                                                {groupStories.map((story) => (
                                                    <Card
                                                        key={story.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, story)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={() => onStoryClick(story)}
                                                        className={cn(
                                                            "p-3 bg-gray-800 border-gray-700 cursor-grab active:cursor-grabbing hover:bg-gray-750 transition-all",
                                                            draggedStory?.id === story.id && 'opacity-50'
                                                        )}
                                                        style={{
                                                            borderLeftWidth: 3,
                                                            borderLeftColor: workstreamColors[story.workstream_id] || '#666'
                                                        }}
                                                    >
                                                        {/* Task Name (prominent, at top) */}
                                                        <p className="text-sm font-medium text-white mb-2 line-clamp-2 leading-snug">
                                                            {story.name}
                                                        </p>

                                                        {/* Status Badges Row */}
                                                        <div className="flex items-center gap-1.5 mb-3">
                                                            <Badge className={cn(
                                                                "text-[10px] px-1.5 py-0.5",
                                                                story.status === 'In Progress' && "bg-blue-600 text-white",
                                                                story.status === 'Not Started' && "bg-gray-600 text-gray-200",
                                                                story.status === 'Testing' && "bg-purple-600 text-white",
                                                                story.status === 'Done' && "bg-green-600 text-white",
                                                                story.status === 'Blocked' && "bg-red-600 text-white",
                                                                story.status === 'On Hold' && "bg-yellow-600 text-black"
                                                            )}>
                                                                {story.status}
                                                            </Badge>
                                                            <Badge className={cn("text-[10px] px-1.5 py-0.5", priorityColors[story.priority])}>
                                                                {story.priority}
                                                            </Badge>
                                                            {story.blocked_by && (
                                                                <Badge className="text-[10px] px-1.5 py-0.5 bg-red-900 text-red-300">
                                                                    ⚠️ Blocked
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Property List */}
                                                        <div className="space-y-1.5 text-[11px]">
                                                            {/* Task ID Row */}
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-500 flex items-center gap-1.5">
                                                                    # Task ID
                                                                </span>
                                                                <span className="text-gray-300 font-mono">
                                                                    {story.id.slice(0, 10)}
                                                                </span>
                                                            </div>

                                                            {/* Assignee Row */}
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-500 flex items-center gap-1.5">
                                                                    <User className="w-3 h-3" />
                                                                    Assignee
                                                                </span>
                                                                <span className={story.owner_id ? "text-gray-300" : "text-gray-500 italic"}>
                                                                    {getOwnerName(story.owner_id) || 'Unassigned'}
                                                                </span>
                                                            </div>

                                                            {/* Estimate Row */}
                                                            {story.estimate && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-gray-500 flex items-center gap-1.5">
                                                                        <Clock className="w-3 h-3" />
                                                                        Estimate
                                                                    </span>
                                                                    <span className="text-gray-300">
                                                                        {story.estimate}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Dependencies Row */}
                                                            {story.dependencies && story.dependencies.length > 0 && (
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-gray-500 flex items-center gap-1.5">
                                                                        <Link2 className="w-3 h-3" />
                                                                        Dependencies
                                                                    </span>
                                                                    <span className="text-gray-400">
                                                                        {story.dependencies.length} task{story.dependencies.length > 1 ? 's' : ''}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Story Context Row */}
                                                            {userStoryId && usInfo.narrative && (
                                                                <div className="pt-1.5 mt-1.5 border-t border-gray-700/50">
                                                                    <div className="flex items-start gap-1.5">
                                                                        <BookOpen className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                                                                        <p className="text-gray-500 line-clamp-1 italic">
                                                                            {usInfo.narrative}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {columnStories.length === 0 && (
                                <div className={`h-24 flex flex-col items-center justify-center text-sm border-2 border-dashed rounded-lg transition-all ${isOver ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 text-gray-600'}`}>
                                    <svg className={`w-6 h-6 mb-1 ${isOver ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                    {isOver ? 'Release to drop' : 'Drop tasks here'}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
