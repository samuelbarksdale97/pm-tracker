'use client';

import { useState, useMemo } from 'react';
import { Story, createStory, deleteStory } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ChevronRight,
    ChevronDown,
    Clock,
    FileText,
    Sparkles,
    Server,
    Smartphone,
    Monitor,
    Settings,
    Plus,
    Trash2,
    MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Platform configuration with icons
const PLATFORM_CONFIG: Record<string, {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
}> = {
    'A': {
        label: 'Backend',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/40',
        icon: <Server className="w-4 h-4" />
    },
    'B': {
        label: 'Mobile',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/40',
        icon: <Smartphone className="w-4 h-4" />
    },
    'C': {
        label: 'Admin',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/40',
        icon: <Monitor className="w-4 h-4" />
    },
    'D': {
        label: 'Infra',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/40',
        icon: <Settings className="w-4 h-4" />
    },
};

const statusColors: Record<string, string> = {
    'Not Started': 'bg-gray-500',
    'In Progress': 'bg-blue-500',
    'Done': 'bg-green-500',
    'Blocked': 'bg-red-500',
    'On Hold': 'bg-yellow-500',
};

const priorityColors: Record<string, string> = {
    'P0': 'bg-red-600 text-white',
    'P1': 'bg-yellow-500 text-black',
    'P2': 'bg-gray-400 text-white',
};

interface PlatformTasksSectionProps {
    tasks: Story[];
    loading: boolean;
    projectId: string;
    userStoryId: string;
    milestoneId: string | null;
    onTaskClick: (task: Story) => void;
    onGenerateClick: () => void;
    onTasksChange: () => void;
}

export function PlatformTasksSection({
    tasks,
    loading,
    projectId,
    userStoryId,
    milestoneId,
    onTaskClick,
    onGenerateClick,
    onTasksChange,
}: PlatformTasksSectionProps) {
    // Filter state: null = show all, 'A'/'B'/'C'/'D' = filter by platform
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

    // Collapsed platforms state
    const [collapsedPlatforms, setCollapsedPlatforms] = useState<Set<string>>(new Set());

    // Manual task creation state
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskPlatform, setNewTaskPlatform] = useState<string>('A');
    const [newTaskPriority, setNewTaskPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
    const [newTaskEstimate, setNewTaskEstimate] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Delete confirmation state
    const [taskToDelete, setTaskToDelete] = useState<Story | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Group tasks by platform
    const groupedTasks = useMemo(() => {
        const groups: Record<string, Story[]> = {};

        tasks.forEach(task => {
            const platform = task.workstream_id || 'other';
            if (!groups[platform]) {
                groups[platform] = [];
            }
            groups[platform].push(task);
        });

        return groups;
    }, [tasks]);

    // Get platforms that have tasks
    const activePlatforms = useMemo(() => {
        return Object.keys(groupedTasks).filter(p => groupedTasks[p].length > 0);
    }, [groupedTasks]);

    // Filter tasks if a platform is selected
    const filteredTasks = useMemo(() => {
        if (!selectedPlatform) return tasks;
        return tasks.filter(t => t.workstream_id === selectedPlatform);
    }, [tasks, selectedPlatform]);

    // Toggle platform collapse
    const togglePlatform = (platform: string) => {
        setCollapsedPlatforms(prev => {
            const next = new Set(prev);
            if (next.has(platform)) {
                next.delete(platform);
            } else {
                next.add(platform);
            }
            return next;
        });
    };

    // Handle manual task creation
    const handleCreateTask = async () => {
        if (!newTaskName.trim()) return;

        setIsCreating(true);
        try {
            const platformLabel = PLATFORM_CONFIG[newTaskPlatform]?.label || newTaskPlatform;
            await createStory({
                id: crypto.randomUUID(),
                project_id: projectId,
                workstream_id: newTaskPlatform,
                milestone_id: milestoneId,
                user_story_id: userStoryId,
                name: `[${platformLabel}] ${newTaskName}`,
                description: null,
                priority: newTaskPriority,
                status: 'Not Started',
                owner_id: null,
                estimate: newTaskEstimate || null,
                actual_time: null,
                due_date: null,
                dependencies: [],
                notes: null,
                objective: null,
                implementation_steps: null,
                outputs: null,
                validation: null,
                blocked_by: null,
                code_snippets: null,
                backend_specs: null,
                user_stories: null,
                definition_of_done: null,
            });

            // Reset form and close
            setNewTaskName('');
            setNewTaskEstimate('');
            setShowAddTask(false);
            onTasksChange();
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setIsCreating(false);
        }
    };

    // Handle task deletion
    const handleDeleteTask = async () => {
        if (!taskToDelete) return;

        setIsDeleting(true);
        try {
            await deleteStory(taskToDelete.id);
            setTaskToDelete(null);
            onTasksChange();
        } catch (error) {
            console.error('Error deleting task:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <h4 className="text-sm font-medium text-white mb-3">Implementation Tasks</h4>
                <div className="text-gray-500 text-sm text-center py-4">Loading tasks...</div>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div>
                <h4 className="text-sm font-medium text-white mb-3">Implementation Tasks (0)</h4>
                <Card className="bg-gray-800/50 border-gray-700 border-dashed p-6 text-center">
                    <p className="text-gray-400 mb-3">No tasks yet.</p>
                    <div className="flex justify-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddTask(true)}
                            className="gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add Manually
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onGenerateClick}
                            className="gap-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30 text-purple-300 hover:text-white hover:border-purple-500"
                        >
                            <Sparkles className="w-4 h-4" />
                            AI Generate
                        </Button>
                    </div>
                </Card>

                {/* Add Task Dialog */}
                <AddTaskDialog
                    open={showAddTask}
                    onOpenChange={setShowAddTask}
                    taskName={newTaskName}
                    onTaskNameChange={setNewTaskName}
                    platform={newTaskPlatform}
                    onPlatformChange={setNewTaskPlatform}
                    priority={newTaskPriority}
                    onPriorityChange={setNewTaskPriority}
                    estimate={newTaskEstimate}
                    onEstimateChange={setNewTaskEstimate}
                    onCreate={handleCreateTask}
                    isCreating={isCreating}
                />
            </div>
        );
    }

    // Determine if we should show grouped view (multiple platforms) or flat list
    const showGroupedView = activePlatforms.length > 1 && !selectedPlatform;

    return (
        <div>
            {/* Header with Platform Filter Pills */}
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white">
                    Implementation Tasks ({tasks.length})
                </h4>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddTask(true)}
                        className="gap-1 text-gray-400 hover:text-white h-7 px-2"
                    >
                        <Plus className="w-3 h-3" />
                        Add
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onGenerateClick}
                        className="gap-1 text-purple-400 hover:text-purple-300 h-7 px-2"
                    >
                        <Sparkles className="w-3 h-3" />
                        AI
                    </Button>
                </div>
            </div>

            {/* Platform Filter Pills */}
            {activePlatforms.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    <button
                        onClick={() => setSelectedPlatform(null)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            !selectedPlatform
                                ? "bg-white/10 text-white ring-1 ring-white/20"
                                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                        )}
                    >
                        All ({tasks.length})
                    </button>
                    {activePlatforms.map(platform => {
                        const config = PLATFORM_CONFIG[platform];
                        if (!config) return null;
                        const count = groupedTasks[platform]?.length || 0;

                        return (
                            <button
                                key={platform}
                                onClick={() => setSelectedPlatform(selectedPlatform === platform ? null : platform)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5",
                                    selectedPlatform === platform
                                        ? `${config.bgColor} ${config.color} ring-1 ${config.borderColor}`
                                        : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                                )}
                            >
                                {config.icon}
                                {config.label}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[10px]",
                                    selectedPlatform === platform ? "bg-black/20" : "bg-gray-700"
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Task Display */}
            {showGroupedView ? (
                // Grouped view by platform
                <div className="space-y-3">
                    {(['A', 'B', 'C', 'D'] as const).map(platform => {
                        const platformTasks = groupedTasks[platform];
                        if (!platformTasks || platformTasks.length === 0) return null;

                        const config = PLATFORM_CONFIG[platform];
                        const isCollapsed = collapsedPlatforms.has(platform);

                        return (
                            <div
                                key={platform}
                                className={cn(
                                    "rounded-lg border overflow-hidden",
                                    config.borderColor,
                                    config.bgColor
                                )}
                            >
                                {/* Platform Header */}
                                <button
                                    onClick={() => togglePlatform(platform)}
                                    className={cn(
                                        "w-full px-3 py-2 flex items-center gap-2 text-left",
                                        "hover:bg-white/5 transition-colors"
                                    )}
                                >
                                    {isCollapsed ? (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span className={config.color}>{config.icon}</span>
                                    <span className={cn("font-medium", config.color)}>
                                        {config.label}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                        {platformTasks.length} task{platformTasks.length !== 1 ? 's' : ''}
                                    </span>
                                </button>

                                {/* Platform Tasks */}
                                {!isCollapsed && (
                                    <div className="border-t border-gray-700/50 divide-y divide-gray-700/30">
                                        {platformTasks.map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => onTaskClick(task)}
                                                onDelete={() => setTaskToDelete(task)}
                                                showPlatformBadge={false}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Other tasks (no platform assigned) */}
                    {groupedTasks['other'] && groupedTasks['other'].length > 0 && (
                        <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
                            <div className="px-3 py-2 text-gray-400 text-sm font-medium">
                                Other ({groupedTasks['other'].length})
                            </div>
                            <div className="border-t border-gray-700/50 divide-y divide-gray-700/30">
                                {groupedTasks['other'].map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onClick={() => onTaskClick(task)}
                                        onDelete={() => setTaskToDelete(task)}
                                        showPlatformBadge={false}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Flat list (single platform or filtered)
                <div className="space-y-2">
                    {filteredTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => onTaskClick(task)}
                            onDelete={() => setTaskToDelete(task)}
                            showPlatformBadge={!selectedPlatform}
                        />
                    ))}
                </div>
            )}

            {/* Add Task Dialog */}
            <AddTaskDialog
                open={showAddTask}
                onOpenChange={setShowAddTask}
                taskName={newTaskName}
                onTaskNameChange={setNewTaskName}
                platform={newTaskPlatform}
                onPlatformChange={setNewTaskPlatform}
                priority={newTaskPriority}
                onPriorityChange={setNewTaskPriority}
                estimate={newTaskEstimate}
                onEstimateChange={setNewTaskEstimate}
                onCreate={handleCreateTask}
                isCreating={isCreating}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
                <AlertDialogContent className="bg-gray-900 border-gray-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Task</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to delete "{taskToDelete?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteTask}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Add Task Dialog Component
function AddTaskDialog({
    open,
    onOpenChange,
    taskName,
    onTaskNameChange,
    platform,
    onPlatformChange,
    priority,
    onPriorityChange,
    estimate,
    onEstimateChange,
    onCreate,
    isCreating,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskName: string;
    onTaskNameChange: (value: string) => void;
    platform: string;
    onPlatformChange: (value: string) => void;
    priority: 'P0' | 'P1' | 'P2';
    onPriorityChange: (value: 'P0' | 'P1' | 'P2') => void;
    estimate: string;
    onEstimateChange: (value: string) => void;
    onCreate: () => void;
    isCreating: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-800 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white">Add Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Task Name</label>
                        <Input
                            value={taskName}
                            onChange={(e) => onTaskNameChange(e.target.value)}
                            placeholder="e.g., Create authentication API"
                            className="bg-gray-800 border-gray-700 text-white"
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-gray-400 mb-1.5 block">Platform</label>
                            <Select value={platform} onValueChange={onPlatformChange}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A">
                                        <div className="flex items-center gap-2">
                                            <Server className="w-4 h-4 text-blue-400" />
                                            Backend
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="B">
                                        <div className="flex items-center gap-2">
                                            <Smartphone className="w-4 h-4 text-green-400" />
                                            Mobile
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="C">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-4 h-4 text-purple-400" />
                                            Admin
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="D">
                                        <div className="flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-orange-400" />
                                            Infra
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1.5 block">Priority</label>
                            <Select value={priority} onValueChange={(v) => onPriorityChange(v as 'P0' | 'P1' | 'P2')}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="P0">P0 - Critical</SelectItem>
                                    <SelectItem value="P1">P1 - High</SelectItem>
                                    <SelectItem value="P2">P2 - Medium</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1.5 block">Estimate (optional)</label>
                        <Input
                            value={estimate}
                            onChange={(e) => onEstimateChange(e.target.value)}
                            placeholder="e.g., 4 hours, 2 days"
                            className="bg-gray-800 border-gray-700 text-white"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-gray-400"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onCreate}
                        disabled={!taskName.trim() || isCreating}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isCreating ? 'Creating...' : 'Create Task'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Individual Task Card
function TaskCard({
    task,
    onClick,
    onDelete,
    showPlatformBadge = true
}: {
    task: Story;
    onClick: () => void;
    onDelete: () => void;
    showPlatformBadge?: boolean;
}) {
    const platformConfig = task.workstream_id ? PLATFORM_CONFIG[task.workstream_id] : null;

    return (
        <div className="px-3 py-2.5 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-between">
                <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={onClick}
                >
                    {/* Platform Badge (optional) */}
                    {showPlatformBadge && platformConfig && (
                        <span className={cn(
                            "text-xs px-2 py-0.5 rounded flex-shrink-0 flex items-center gap-1",
                            platformConfig.bgColor,
                            platformConfig.color
                        )}>
                            {platformConfig.icon}
                        </span>
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm text-white truncate">{task.name}</span>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            {task.estimate && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {task.estimate}
                                </span>
                            )}
                            {task.objective && (
                                <span className="flex items-center gap-1 text-purple-400">
                                    <FileText className="w-3 h-3" />
                                    Has specs
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <Badge className={priorityColors[task.priority]} variant="outline">
                        {task.priority}
                    </Badge>
                    <Badge className={statusColors[task.status]}>
                        {task.status}
                    </Badge>

                    {/* Actions Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick();
                                }}
                                className="text-gray-300 focus:text-white focus:bg-gray-800"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <ChevronRight
                        className="w-4 h-4 text-gray-500 cursor-pointer"
                        onClick={onClick}
                    />
                </div>
            </div>
        </div>
    );
}
