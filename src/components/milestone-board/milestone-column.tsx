'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Calendar,
    MoreVertical,
    Trash2,
    Edit2,
    Check,
    X,
    Lock,
    Unlock,
    Copy,
    AlertTriangle,
} from 'lucide-react';
import { StoryCard } from './story-card';
import { MilestoneColumnProps } from './types';

export function MilestoneColumn({
    milestone,
    stories,
    allMilestones,
    bulkMode,
    selectedStories,
    onToggleStorySelect,
    onSelectAllInMilestone,
    onMoveStory,
    onStartEditing,
    onUpdateMilestone,
    onDeleteMilestone,
    onLockMilestone,
    onDuplicateMilestone,
    editingId,
    onCancelEditing,
    isSubmitting,
}: MilestoneColumnProps) {
    const [editName, setEditName] = useState(milestone.name);
    const [editStartDate, setEditStartDate] = useState(milestone.start_date || '');
    const [editEndDate, setEditEndDate] = useState(milestone.target_date);

    const isEditing = editingId === milestone.id;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const isOverdue = () => {
        const targetDate = new Date(milestone.target_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return targetDate < today && milestone.status !== 'completed';
    };

    const getProgress = () => {
        if (stories.length === 0) return { done: 0, total: 0, percentage: 0 };
        const done = stories.filter(s => s.status === 'Done').length;
        return { done, total: stories.length, percentage: Math.round((done / stories.length) * 100) };
    };

    const progress = getProgress();
    const overdueStatus = isOverdue();
    const unlockedMilestones = allMilestones.filter(m => !m.is_locked);

    const handleStartEditing = () => {
        setEditName(milestone.name);
        setEditStartDate(milestone.start_date || '');
        setEditEndDate(milestone.target_date);
        onStartEditing(milestone);
    };

    const handleSave = () => {
        onUpdateMilestone(milestone.id, editName, editStartDate, editEndDate);
    };

    return (
        <Card
            className={`bg-gray-900 border-gray-800 min-w-[320px] max-w-[320px] flex-shrink-0 ${milestone.is_locked ? 'opacity-75' : ''} ${overdueStatus ? 'border-red-800' : ''}`}
        >
            <div className="p-4 border-b border-gray-800">
                {isEditing ? (
                    <div className="space-y-2">
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-gray-800 border-gray-700 h-8 text-sm"
                            autoFocus
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                className="bg-gray-800 border-gray-700 h-8 text-xs"
                                placeholder="Start"
                            />
                            <Input
                                type="date"
                                value={editEndDate}
                                onChange={(e) => setEditEndDate(e.target.value)}
                                className="bg-gray-800 border-gray-700 h-8 text-xs"
                            />
                        </div>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={handleSave}
                                disabled={isSubmitting}
                            >
                                <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancelEditing}>
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: milestone.color || '#3B82F6' }} />
                                <span className="font-medium text-white">{milestone.name}</span>
                                {milestone.is_locked && (
                                    <Lock className="w-3 h-3 text-gray-500" />
                                )}
                                {overdueStatus && (
                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {bulkMode && stories.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => onSelectAllInMilestone(milestone.id)}
                                    >
                                        Select all
                                    </Button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <MoreVertical className="w-4 h-4 text-gray-400" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800">
                                        <DropdownMenuItem onClick={handleStartEditing} className="gap-2">
                                            <Edit2 className="w-3 h-3" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDuplicateMilestone(milestone.id)} className="gap-2">
                                            <Copy className="w-3 h-3" /> Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => onLockMilestone(milestone.id, !milestone.is_locked)}
                                            className="gap-2"
                                        >
                                            {milestone.is_locked ? (
                                                <><Unlock className="w-3 h-3" /> Unlock</>
                                            ) : (
                                                <><Lock className="w-3 h-3" /> Lock</>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-gray-800" />
                                        <DropdownMenuItem
                                            onClick={() => onDeleteMilestone(milestone.id)}
                                            className="gap-2 text-red-400"
                                        >
                                            <Trash2 className="w-3 h-3" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span className={overdueStatus ? 'text-red-400' : ''}>
                                {formatDate(milestone.target_date)}
                            </span>
                            <span className="text-gray-600">|</span>
                            <span>{progress.done}/{progress.total} done</span>
                        </div>
                        {progress.total > 0 && (
                            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${progress.percentage}%` }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                {stories.map(story => (
                    <StoryCard
                        key={story.id}
                        story={story}
                        milestones={unlockedMilestones}
                        onMove={milestone.is_locked ? undefined : onMoveStory}
                        bulkMode={bulkMode}
                        isSelected={selectedStories.has(story.id)}
                        onToggleSelect={() => onToggleStorySelect(story.id)}
                        disabled={milestone.is_locked}
                    />
                ))}
                {stories.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-gray-600 text-sm">
                            {milestone.is_locked ? 'Milestone locked' : 'Drag stories here or use dropdown'}
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
