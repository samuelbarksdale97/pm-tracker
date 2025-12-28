'use client';

import { useState, useEffect } from 'react';
import {
    Story,
    Task,
    TeamMember,
    TaskActivity,
    TaskComment,
    getTaskActivity,
    getTaskComments,
    addTaskComment,
    updateStory,
    getSubTasks,
    createSubTask,
    updateSubTaskStatus,
    deleteSubTask,
    createPlatformTask,
    createSubTasksForPlatformTask,
} from '@/lib/supabase';
import { Edit2, Save, X, AlertTriangle, Plus, Check, Circle, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { TaskGenerationPanel } from '@/components/ai/task-generation-panel';
import type { GeneratedSpecs, GeneratedTask } from '@/lib/ai/platform-prompts';
import { PLATFORM_CONFIG, type PlatformId } from '@/lib/ai/platform-prompts';

interface StoryDetailDrawerProps {
    story: Story;
    teamMembers: TeamMember[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStatusChange: (storyId: string, status: Story['status']) => void;
    onOwnerChange: (storyId: string, ownerId: string | null) => void;
    onUpdate: () => void;
    autoShowAIGeneration?: boolean;
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
    'P0': 'bg-red-600',
    'P1': 'bg-yellow-500',
    'P2': 'bg-gray-400',
};

export function StoryDetailDrawer({
    story,
    teamMembers,
    open,
    onOpenChange,
    onStatusChange,
    onOwnerChange,
    onUpdate,
    autoShowAIGeneration,
}: StoryDetailDrawerProps) {
    const [activity, setActivity] = useState<TaskActivity[]>([]);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [subTasks, setSubTasks] = useState<Task[]>([]);
    const [newComment, setNewComment] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editedNotes, setEditedNotes] = useState(story.notes || '');

    // Main edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedName, setEditedName] = useState(story.name);
    const [editedDescription, setEditedDescription] = useState(story.description || '');
    const [editedEstimate, setEditedEstimate] = useState(story.estimate || '');
    const [editedDueDate, setEditedDueDate] = useState(story.due_date || '');
    const [editedBlockedBy, setEditedBlockedBy] = useState(story.blocked_by || '');
    const [editedPriority, setEditedPriority] = useState(story.priority);

    // Sub-task state
    const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
    const [isAddingSubTask, setIsAddingSubTask] = useState(false);

    // AI Generation state
    const [showAIGeneration, setShowAIGeneration] = useState(false);

    // Specs editing state
    const [isEditingDoD, setIsEditingDoD] = useState(false);
    const [editedDoD, setEditedDoD] = useState(story.definition_of_done?.join('\n') || '');
    const [isEditingSpecs, setIsEditingSpecs] = useState(false);
    const [editedSpecs, setEditedSpecs] = useState(story.backend_specs || '');

    // Local state for optimistic updates (prevents jarring refresh)
    const [currentDoD, setCurrentDoD] = useState<string[] | null>(story.definition_of_done || null);
    const [currentSpecs, setCurrentSpecs] = useState<string | null>(story.backend_specs || null);

    const hasSpecs = story.objective || (story.implementation_steps && story.implementation_steps.length > 0) || story.user_stories || story.backend_specs || story.definition_of_done || true;

    useEffect(() => {
        if (open && story) {
            loadDetails();
            // Reset all edit fields when story changes
            setEditedNotes(story.notes || '');
            setEditedName(story.name);
            setEditedDescription(story.description || '');
            setEditedEstimate(story.estimate || '');
            setEditedDueDate(story.due_date || '');
            setEditedBlockedBy(story.blocked_by || '');
            setEditedPriority(story.priority);
            setEditedDoD(story.definition_of_done?.join('\n') || '');
            setEditedSpecs(story.backend_specs || '');
            setCurrentDoD(story.definition_of_done || null);
            setCurrentSpecs(story.backend_specs || null);
            setIsEditMode(false);
            setIsEditingDoD(false);
            setIsEditingSpecs(false);
            // Auto-open AI generation modal if requested
            if (autoShowAIGeneration) {
                setShowAIGeneration(true);
            }
        }
    }, [open, story, autoShowAIGeneration]);

    const loadDetails = async () => {
        try {
            const [act, com, st] = await Promise.all([
                getTaskActivity(story.id),
                getTaskComments(story.id),
                getSubTasks(story.id)
            ]);
            setActivity(act);
            setComments(com);
            setSubTasks(st);
        } catch (err) {
            console.error('Error loading story details:', err);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !authorName.trim()) return;

        setIsSubmitting(true);
        try {
            await addTaskComment(story.id, authorName, newComment);
            setNewComment('');
            await loadDetails();
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveNotes = async () => {
        try {
            await updateStory(story.id, { notes: editedNotes });
            setIsEditingNotes(false);
            onUpdate();
        } catch (err) {
            console.error('Error saving notes:', err);
        }
    };

    const handleSaveDoD = async () => {
        try {
            const dodArray = editedDoD
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            const newDoD = dodArray.length > 0 ? dodArray : null;

            // Optimistically update local state first
            setCurrentDoD(newDoD);
            setIsEditingDoD(false);

            // Then persist to database
            await updateStory(story.id, { definition_of_done: newDoD });

            // Refresh parent in background (won't affect our local state)
            onUpdate();
        } catch (err) {
            console.error('Error saving DoD:', err);
            // Revert on error
            setCurrentDoD(story.definition_of_done || null);
        }
    };

    const handleSaveEstimate = async () => {
        if (editedEstimate === story.estimate) return;
        try {
            await updateStory(story.id, { estimate: editedEstimate });
            onUpdate();
        } catch (err) {
            console.error('Error saving estimate:', err);
        }
    };

    const handleSaveDueDate = async () => {
        if (editedDueDate === story.due_date) return;
        try {
            await updateStory(story.id, { due_date: editedDueDate || null });
            onUpdate();
        } catch (err) {
            console.error('Error saving due date:', err);
        }
    };

    const handleSaveSpecs = async () => {
        try {
            const newSpecs = editedSpecs || null;

            // Optimistically update local state first
            setCurrentSpecs(newSpecs);
            setIsEditingSpecs(false);

            // Then persist to database
            await updateStory(story.id, { backend_specs: newSpecs });

            // Refresh parent in background
            onUpdate();
        } catch (err) {
            console.error('Error saving specs:', err);
            // Revert on error
            setCurrentSpecs(story.backend_specs || null);
        }
    };

    const handleSaveAllChanges = async () => {
        setIsSubmitting(true);
        try {
            await updateStory(story.id, {
                name: editedName,
                description: editedDescription || null,
                estimate: editedEstimate || null,
                due_date: editedDueDate || null,
                blocked_by: editedBlockedBy || null,
                priority: editedPriority,
            });
            setIsEditMode(false);
            onUpdate();
        } catch (err) {
            console.error('Error saving story:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        // Reset to original values
        setEditedName(story.name);
        setEditedDescription(story.description || '');
        setEditedEstimate(story.estimate || '');
        setEditedDueDate(story.due_date || '');
        setEditedBlockedBy(story.blocked_by || '');
        setEditedPriority(story.priority);
        setIsEditMode(false);
    };

    const handleAddSubTask = async () => {
        if (!newSubTaskTitle.trim()) return;
        setIsSubmitting(true);
        try {
            await createSubTask(story.id, newSubTaskTitle.trim());
            setNewSubTaskTitle('');
            setIsAddingSubTask(false);
            await loadDetails();
        } catch (err) {
            console.error('Error adding sub-task:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleSubTaskStatus = async (task: Task) => {
        const newStatus: Task['status'] = task.status === 'Done' ? 'Todo' : 'Done';
        try {
            await updateSubTaskStatus(task.id, newStatus);
            setSubTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: newStatus } : t
            ));
        } catch (err) {
            console.error('Error updating sub-task:', err);
        }
    };

    const handleDeleteSubTask = async (taskId: string) => {
        if (!confirm('Delete this sub-task?')) return;
        try {
            await deleteSubTask(taskId);
            setSubTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            console.error('Error deleting sub-task:', err);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    // Handle AI-generated specs acceptance
    // Creates a separate Task (pm_stories) for EACH platform with full specs
    const handleAcceptAISpecs = async (specs: GeneratedSpecs) => {
        try {
            const createdTasks: Story[] = [];

            // Create a separate Task record for EACH platform
            for (const task of specs.tasks) {
                const platformConfig = PLATFORM_CONFIG[task.platform as PlatformId];
                const platformLabel = platformConfig?.name || task.platform;

                // Create the platform-specific task with full specs
                const platformTask = await createPlatformTask({
                    projectId: story.project_id,
                    userStoryId: story.user_story_id || story.id, // Link to parent UserStory
                    milestoneId: story.milestone_id,
                    platform: task.platform,
                    name: `[${platformLabel}] ${task.name}`,
                    priority: task.priority,
                    estimate: task.estimate,
                    objective: task.objective,
                    rationale: task.rationale,
                    implementationSteps: task.implementation_steps,
                    outputs: task.outputs,
                    validation: task.validation,
                    definitionOfDone: task.definition_of_done,
                    codeSnippets: task.code_snippets || null,
                    dependencies: task.dependencies || null,
                    risks: task.risks || null,
                    testingStrategy: task.testing_strategy || null,
                });

                createdTasks.push(platformTask);

                // Create sub-tasks for this platform task
                if (task.sub_tasks && task.sub_tasks.length > 0) {
                    await createSubTasksForPlatformTask(platformTask.id, task.sub_tasks);
                }
            }

            // Update the original story to mark it as having generated specs
            // Store a summary that references the created platform tasks
            await updateStory(story.id, {
                notes: `AI Generated ${createdTasks.length} platform task(s): ${createdTasks.map(t => t.id).join(', ')}`,
            });

            // Refresh data
            await loadDetails();
            onUpdate();
            setShowAIGeneration(false);
        } catch (error) {
            console.error('Error saving AI specs:', error);
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-2xl bg-gray-950 border-gray-800 overflow-y-auto px-6">
                    <SheetHeader className="pb-4 border-b border-gray-800 px-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-gray-400 text-sm">{story.id.slice(0, 8)}</span>
                                {isEditMode ? (
                                    <Select value={editedPriority} onValueChange={(v) => setEditedPriority(v as Story['priority'])}>
                                        <SelectTrigger className={`w-20 h-6 ${priorityColors[editedPriority]} border-0 text-white text-xs`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="P0">P0</SelectItem>
                                            <SelectItem value="P1">P1</SelectItem>
                                            <SelectItem value="P2">P2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Badge className={priorityColors[story.priority]}>{story.priority}</Badge>
                                )}
                                {(story.blocked_by || editedBlockedBy) && (
                                    <Badge variant="destructive" className="gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Blocked
                                    </Badge>
                                )}
                            </div>
                            {!isEditMode ? (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAIGeneration(true)}
                                        className="gap-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 text-purple-300 hover:text-white hover:border-purple-500"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        AI Generate
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditMode(true)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleSaveAllChanges}
                                        disabled={isSubmitting}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Save className="w-4 h-4 mr-1" />
                                        {isSubmitting ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                        className="text-gray-400"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        {isEditMode ? (
                            <Input
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="text-xl font-semibold bg-gray-800 border-gray-700 text-white mt-2"
                                placeholder="Task name"
                            />
                        ) : (
                            <SheetTitle className="text-white text-xl">{story.name}</SheetTitle>
                        )}
                    </SheetHeader>

                    <div className="py-6 space-y-6">
                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Status</label>
                                <Select
                                    value={story.status}
                                    onValueChange={(value) => {
                                        onStatusChange(story.id, value as Story['status']);
                                    }}
                                >
                                    <SelectTrigger className={`w-full ${statusColors[story.status]} border-0 text-white`}>
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
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Owner</label>
                                <Select
                                    value={story.owner_id || 'unassigned'}
                                    onValueChange={(value) => {
                                        onOwnerChange(story.id, value === 'unassigned' ? null : value);
                                    }}
                                >
                                    <SelectTrigger className="w-full bg-gray-800 border-gray-700">
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
                            </div>
                        </div>

                        {/* Description (edit mode) */}
                        {isEditMode && (
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Description</label>
                                <Textarea
                                    value={editedDescription}
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    placeholder="Add a description..."
                                    rows={3}
                                />
                            </div>
                        )}

                        {/* Task Info (Always Editable) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Estimate</label>
                                <Input
                                    value={editedEstimate}
                                    onChange={(e) => setEditedEstimate(e.target.value)}
                                    onBlur={handleSaveEstimate}
                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                    className="bg-gray-800 border-gray-700 focus:border-blue-500 text-white transition-colors"
                                    placeholder="e.g., 2d, 4h"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Due Date</label>
                                <Input
                                    type="date"
                                    value={editedDueDate}
                                    onChange={(e) => setEditedDueDate(e.target.value)}
                                    onBlur={handleSaveDueDate}
                                    className="bg-gray-800 border-gray-700 focus:border-blue-500 text-white transition-colors"
                                />
                            </div>
                        </div>

                        {/* Blocker Section */}
                        {isEditMode ? (
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Blocked By (leave empty to unblock)</label>
                                <Textarea
                                    value={editedBlockedBy}
                                    onChange={(e) => setEditedBlockedBy(e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    placeholder="Describe what's blocking this task..."
                                    rows={2}
                                />
                            </div>
                        ) : story.blocked_by ? (
                            <div className="bg-red-950 border border-red-800 rounded-lg p-3">
                                <div className="text-red-400 font-medium text-sm">⚠️ Blocked</div>
                                <p className="text-gray-300 text-sm mt-1">{story.blocked_by}</p>
                            </div>
                        ) : null}

                        {/* Dependencies */}
                        {story.dependencies && story.dependencies.length > 0 && (
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Dependencies</label>
                                <div className="flex flex-wrap gap-2">
                                    {story.dependencies.map((dep) => (
                                        <Badge key={dep} variant="outline" className="border-gray-600">
                                            {dep}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tabs with Specs */}
                        <Tabs defaultValue={hasSpecs ? 'specs' : 'activity'} className="mt-6">
                            <TabsList className="bg-gray-900">
                                <TabsTrigger value="tasks">Tasks ({subTasks.length})</TabsTrigger>
                                {hasSpecs && (
                                    <TabsTrigger value="specs">📋 Specs</TabsTrigger>
                                )}
                                <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>
                                <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                                <TabsTrigger value="notes">Notes</TabsTrigger>
                            </TabsList>

                            <TabsContent value="tasks" className="mt-4 space-y-3">
                                {/* Add Sub-task Form */}
                                {isAddingSubTask ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={newSubTaskTitle}
                                            onChange={(e) => setNewSubTaskTitle(e.target.value)}
                                            placeholder="Enter sub-task title..."
                                            className="bg-gray-800 border-gray-700 text-white flex-1"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddSubTask();
                                                if (e.key === 'Escape') {
                                                    setIsAddingSubTask(false);
                                                    setNewSubTaskTitle('');
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleAddSubTask}
                                            disabled={isSubmitting || !newSubTaskTitle.trim()}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setIsAddingSubTask(false);
                                                setNewSubTaskTitle('');
                                            }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsAddingSubTask(true)}
                                        className="w-full bg-gray-800 border-gray-700 border-dashed hover:border-gray-600 text-gray-400"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Sub-task
                                    </Button>
                                )}

                                {/* Sub-tasks List */}
                                <div className="space-y-2">
                                    {subTasks.length === 0 && !isAddingSubTask ? (
                                        <p className="text-gray-500 text-sm text-center py-4">No sub-tasks yet. Click above to add one.</p>
                                    ) : (
                                        subTasks.map(st => (
                                            <div
                                                key={st.id}
                                                className="bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-center justify-between group hover:border-gray-700 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <button
                                                        onClick={() => handleToggleSubTaskStatus(st)}
                                                        className="flex-shrink-0 focus:outline-none"
                                                    >
                                                        {st.status === 'Done' ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500 hover:text-green-400" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-gray-500 hover:text-gray-400" />
                                                        )}
                                                    </button>
                                                    <span className={`text-sm truncate ${st.status === 'Done' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                                        {st.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs ${st.status === 'Done'
                                                            ? 'border-green-800 text-green-400'
                                                            : st.status === 'In Progress'
                                                                ? 'border-blue-800 text-blue-400'
                                                                : 'border-gray-700 text-gray-500'
                                                            }`}
                                                    >
                                                        {st.status}
                                                    </Badge>
                                                    <button
                                                        onClick={() => handleDeleteSubTask(st.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Progress indicator */}
                                {subTasks.length > 0 && (
                                    <div className="pt-2 border-t border-gray-800">
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                            <span>Progress</span>
                                            <span>{subTasks.filter(t => t.status === 'Done').length}/{subTasks.length} completed</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 transition-all duration-300"
                                                style={{
                                                    width: `${(subTasks.filter(t => t.status === 'Done').length / subTasks.length) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Backend Specs Tab */}
                            {hasSpecs && (
                                <TabsContent value="specs" className="mt-4 space-y-6">
                                    {/* User Stories */}
                                    {story.user_stories && story.user_stories.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-blue-400 mb-2">User Stories</h4>
                                            <div className="space-y-2">
                                                {story.user_stories.map((s, i) => (
                                                    <Card key={i} className="bg-gray-900 border-gray-800 p-3">
                                                        <div className="flex gap-3">
                                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-400">
                                                                {i + 1}
                                                            </span>
                                                            <p className="text-gray-200 text-sm">{s}</p>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Definition of Done */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-semibold text-green-400">Definition of Done</h4>
                                            {!isEditingDoD && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsEditingDoD(true)}
                                                    className="text-gray-400 hover:text-white h-7 px-2"
                                                >
                                                    <Edit2 className="w-3 h-3 mr-1" />
                                                    Edit
                                                </Button>
                                            )}
                                        </div>
                                        {isEditingDoD ? (
                                            <div className="space-y-2">
                                                <Textarea
                                                    value={editedDoD}
                                                    onChange={(e) => setEditedDoD(e.target.value)}
                                                    className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                                                    placeholder="Enter criteria, one per line..."
                                                    rows={6}
                                                />
                                                <p className="text-xs text-gray-500">Enter one criterion per line</p>
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleSaveDoD} className="bg-green-600 hover:bg-green-700">
                                                        <Save className="w-3 h-3 mr-1" />
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditedDoD(currentDoD?.join('\n') || '');
                                                            setIsEditingDoD(false);
                                                        }}
                                                        className="text-gray-400"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : currentDoD && currentDoD.length > 0 ? (
                                            <Card className="bg-gray-900 border-gray-800 p-4">
                                                <ul className="space-y-2">
                                                    {currentDoD.map((dod: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                                            <div className="mt-1 w-4 h-4 rounded border border-gray-600 flex-shrink-0" />
                                                            <span className={story.status === 'Done' ? 'line-through text-gray-500' : ''}>{dod}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Card>
                                        ) : (
                                            <Card className="bg-gray-900 border-gray-800 border-dashed p-4 text-center">
                                                <p className="text-gray-500 text-sm">No definition of done yet.</p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsEditingDoD(true)}
                                                    className="mt-2 text-green-400"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Add Criteria
                                                </Button>
                                            </Card>
                                        )}
                                    </div>

                                    {/* Technical Specs */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-semibold text-purple-400">Technical Implementation Specs</h4>
                                            {!isEditingSpecs && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsEditingSpecs(true)}
                                                    className="text-gray-400 hover:text-white h-7 px-2"
                                                >
                                                    <Edit2 className="w-3 h-3 mr-1" />
                                                    Edit
                                                </Button>
                                            )}
                                        </div>
                                        {isEditingSpecs ? (
                                            <div className="space-y-2">
                                                <Textarea
                                                    value={editedSpecs}
                                                    onChange={(e) => setEditedSpecs(e.target.value)}
                                                    className="bg-gray-800 border-gray-700 text-white font-mono text-xs"
                                                    placeholder="Enter technical specs, code snippets, API details..."
                                                    rows={12}
                                                />
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleSaveSpecs} className="bg-green-600 hover:bg-green-700">
                                                        <Save className="w-3 h-3 mr-1" />
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditedSpecs(currentSpecs || '');
                                                            setIsEditingSpecs(false);
                                                        }}
                                                        className="text-gray-400"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : currentSpecs ? (
                                            <Card className="bg-gray-900 border-gray-800 p-4">
                                                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                                    {currentSpecs}
                                                </pre>
                                            </Card>
                                        ) : (
                                            <Card className="bg-gray-900 border-gray-800 border-dashed p-4 text-center">
                                                <p className="text-gray-500 text-sm">No technical specs yet.</p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsEditingSpecs(true)}
                                                    className="mt-2 text-purple-400"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" />
                                                    Add Specs
                                                </Button>
                                            </Card>
                                        )}
                                    </div>
                                </TabsContent>
                            )}

                            <TabsContent value="activity" className="mt-4">
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {activity.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No activity yet.</p>
                                    ) : (
                                        activity.map((act) => (
                                            <div key={act.id} className="flex gap-3 text-sm">
                                                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                                                <div>
                                                    <span className="text-gray-400">{act.user_name || 'System'}</span>
                                                    {act.action === 'status_change' && (
                                                        <span className="text-white">
                                                            {' '}changed status from <span className="text-gray-400">{act.old_value}</span> to <span className="text-green-400">{act.new_value}</span>
                                                        </span>
                                                    )}
                                                    {act.action === 'comment' && (
                                                        <span className="text-white"> added a comment</span>
                                                    )}
                                                    {act.action === 'assignment' && (
                                                        <span className="text-white"> changed assignment</span>
                                                    )}
                                                    {act.action === 'edit' && (
                                                        <span className="text-white"> {act.comment}</span>
                                                    )}
                                                    {act.action === 'created' && (
                                                        <span className="text-white"> created this task</span>
                                                    )}
                                                    <div className="text-gray-600 text-xs">{formatDate(act.created_at)}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="comments" className="mt-4 space-y-4">
                                {/* Add Comment */}
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Your name"
                                        value={authorName}
                                        onChange={(e) => setAuthorName(e.target.value)}
                                        className="bg-gray-900 border-gray-700"
                                    />
                                    <Textarea
                                        placeholder="Add a comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        className="bg-gray-900 border-gray-700"
                                        rows={2}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleAddComment}
                                        disabled={isSubmitting || !newComment.trim() || !authorName.trim()}
                                    >
                                        {isSubmitting ? 'Adding...' : 'Add Comment'}
                                    </Button>
                                </div>

                                {/* Comments List */}
                                <div className="space-y-4 max-h-64 overflow-y-auto">
                                    {comments.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No comments yet.</p>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="bg-gray-900 p-3 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-white">{comment.author_name}</span>
                                                    <span className="text-gray-500 text-xs">{formatDate(comment.created_at)}</span>
                                                </div>
                                                <p className="text-gray-300 text-sm">{comment.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="notes" className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm text-gray-400">Notes</label>
                                    {!isEditingNotes && (
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>
                                            Edit
                                        </Button>
                                    )}
                                </div>
                                {isEditingNotes ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editedNotes}
                                            onChange={(e) => setEditedNotes(e.target.value)}
                                            className="bg-gray-900 border-gray-700"
                                            rows={5}
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleSaveNotes}>Save</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setIsEditingNotes(false)}>Cancel</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                                        {story.notes || 'No notes yet. Click Edit to add.'}
                                    </p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </SheetContent>
            </Sheet>

            {/* AI Generation Dialog */}
            <Dialog open={showAIGeneration} onOpenChange={setShowAIGeneration}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-950 border-gray-800">
                    <DialogTitle className="sr-only">AI Task Generation</DialogTitle>
                    <TaskGenerationPanel
                        userStory={{
                            id: story.id,
                            narrative: story.name + (story.description ? ': ' + story.description : ''),
                            persona: 'member',
                            feature_area: story.workstream_id || 'general',
                            acceptance_criteria: story.definition_of_done,
                            priority: story.priority,
                        }}
                        onAccept={handleAcceptAISpecs}
                        onClose={() => setShowAIGeneration(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
