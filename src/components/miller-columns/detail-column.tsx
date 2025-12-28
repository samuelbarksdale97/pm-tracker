'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
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
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Edit2,
    Save,
    X,
    Sparkles,
    User,
    Shield,
    Briefcase,
    Users,
    ChevronRight,
    Plus,
    Check,
    Circle,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    Clock,
    FileText,
    Server,
    Smartphone,
    Monitor,
    Settings,
    Loader2,
} from 'lucide-react';
import {
    UserStory,
    Story,
    TeamMember,
    Task,
    TaskActivity,
    TaskComment,
    updateUserStory,
    deleteUserStory,
    updateStory,
    updateStoryOwner,
    getTaskActivity,
    getTaskComments,
    addTaskComment,
    getSubTasks,
    createSubTask,
    updateSubTaskStatus,
    deleteSubTask,
} from '@/lib/supabase';
import { PlatformTasksSection } from '@/components/platform-tasks-section';
import { TaskGenerationPanel } from '@/components/ai/task-generation-panel';
import { createPlatformTask, createSubTasksForPlatformTask } from '@/lib/supabase';
import type { GeneratedSpecs } from '@/lib/ai/platform-prompts';
import { PLATFORM_CONFIG, type PlatformId } from '@/lib/ai/platform-prompts';

interface DetailColumnProps {
    projectId: string;
    userStory: UserStory | null;
    task: Story | null;
    tasks: Story[];
    teamMembers: TeamMember[];
    loadingTasks: boolean;
    selectedTaskId: string | null;
    onSelectTask: (taskId: string | null) => void;
    onTasksChanged: () => void;
    onUserStoryUpdated: () => void;
    onUserStoryDeleted?: (userStoryId: string) => void;
}

const personaConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    'member': { icon: <User className="w-4 h-4" />, label: 'Member', color: 'text-blue-400' },
    'admin': { icon: <Shield className="w-4 h-4" />, label: 'Admin', color: 'text-purple-400' },
    'staff': { icon: <Briefcase className="w-4 h-4" />, label: 'Staff', color: 'text-green-400' },
    'business': { icon: <Briefcase className="w-4 h-4" />, label: 'Business', color: 'text-orange-400' },
    'guest': { icon: <Users className="w-4 h-4" />, label: 'Guest', color: 'text-gray-400' },
};

const priorityColors: Record<string, string> = {
    'P0': 'bg-red-600 text-white',
    'P1': 'bg-yellow-500 text-black',
    'P2': 'bg-gray-500 text-white',
};

const statusColors: Record<string, string> = {
    'Not Started': 'bg-gray-500',
    'In Progress': 'bg-blue-500',
    'Testing': 'bg-purple-500',
    'Done': 'bg-green-500',
    'Blocked': 'bg-red-500',
    'On Hold': 'bg-yellow-500',
};

// Allowed team members for this project
const ALLOWED_TEAM_MEMBERS = ['Sam', 'Terell', 'Clyde'];

export function DetailColumn({
    projectId,
    userStory,
    task,
    tasks,
    teamMembers,
    loadingTasks,
    selectedTaskId,
    onSelectTask,
    onTasksChanged,
    onUserStoryUpdated,
    onUserStoryDeleted,
}: DetailColumnProps) {
    // Filter team members to only show allowed ones
    const filteredTeamMembers = teamMembers.filter(m => ALLOWED_TEAM_MEMBERS.includes(m.name));

    // If a task is selected, show task detail
    if (task) {
        return (
            <TaskDetailView
                task={task}
                teamMembers={filteredTeamMembers}
                onBack={() => onSelectTask(null)}
                onUpdate={onTasksChanged}
            />
        );
    }

    // If a user story is selected, show user story detail with task list
    if (userStory) {
        return (
            <UserStoryDetailView
                userStory={userStory}
                tasks={tasks}
                teamMembers={teamMembers}
                loadingTasks={loadingTasks}
                projectId={projectId}
                onTaskClick={(t) => onSelectTask(t.id)}
                onTasksChanged={onTasksChanged}
                onUserStoryUpdated={onUserStoryUpdated}
                onUserStoryDeleted={onUserStoryDeleted}
            />
        );
    }

    // Empty state
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <FileText className="w-12 h-12 text-gray-700 mb-4" />
            <p className="text-gray-500">Select a user story</p>
            <p className="text-sm text-gray-600 mt-1">to see details and tasks</p>
        </div>
    );
}

// User Story Detail View
function UserStoryDetailView({
    userStory,
    tasks,
    teamMembers,
    loadingTasks,
    projectId,
    onTaskClick,
    onTasksChanged,
    onUserStoryUpdated,
    onUserStoryDeleted,
}: {
    userStory: UserStory;
    tasks: Story[];
    teamMembers: TeamMember[];
    loadingTasks: boolean;
    projectId: string;
    onTaskClick: (task: Story) => void;
    onTasksChanged: () => void;
    onUserStoryUpdated: () => void;
    onUserStoryDeleted?: (userStoryId: string) => void;
}) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAIGeneration, setShowAIGeneration] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit state
    const [editedNarrative, setEditedNarrative] = useState(userStory.narrative);
    const [editedPersona, setEditedPersona] = useState(userStory.persona);
    const [editedPriority, setEditedPriority] = useState(userStory.priority);
    const [editedStatus, setEditedStatus] = useState(userStory.status);
    const [editedOwnerId, setEditedOwnerId] = useState<string | null>(userStory.owner_id);
    const [editedAcceptanceCriteria, setEditedAcceptanceCriteria] = useState(
        userStory.acceptance_criteria?.join('\n') || ''
    );

    // Filter team members to only show allowed ones
    const filteredTeamMembers = teamMembers.filter(m => ALLOWED_TEAM_MEMBERS.includes(m.name));

    // Reset edit state when story changes
    useEffect(() => {
        setEditedNarrative(userStory.narrative);
        setEditedPersona(userStory.persona);
        setEditedPriority(userStory.priority);
        setEditedStatus(userStory.status);
        setEditedOwnerId(userStory.owner_id);
        setEditedAcceptanceCriteria(userStory.acceptance_criteria?.join('\n') || '');
        setIsEditMode(false);
        setShowDeleteConfirm(false);
    }, [userStory]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteUserStory(userStory.id);
            onUserStoryDeleted?.(userStory.id);
        } catch (err) {
            console.error('Error deleting user story:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            await updateUserStory(userStory.id, {
                narrative: editedNarrative,
                persona: editedPersona,
                priority: editedPriority,
                status: editedStatus,
                owner_id: editedOwnerId,
                acceptance_criteria: editedAcceptanceCriteria
                    ? editedAcceptanceCriteria.split('\n').filter(line => line.trim())
                    : null,
            });
            setIsEditMode(false);
            onUserStoryUpdated();
        } catch (err) {
            console.error('Error saving user story:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get assignee name helper
    const getAssigneeName = (ownerId: string | null) => {
        if (!ownerId) return 'Unassigned';
        const member = filteredTeamMembers.find(m => m.id === ownerId);
        return member?.name || 'Unknown';
    };

    const handleAcceptAISpecs = async (specs: GeneratedSpecs) => {
        try {
            for (const task of specs.tasks) {
                const platformConfig = PLATFORM_CONFIG[task.platform as PlatformId];
                const platformLabel = platformConfig?.name || task.platform;

                const platformTask = await createPlatformTask({
                    projectId: userStory.project_id,
                    userStoryId: userStory.id,
                    milestoneId: userStory.milestone_id,
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

                if (task.sub_tasks && task.sub_tasks.length > 0) {
                    await createSubTasksForPlatformTask(platformTask.id, task.sub_tasks);
                }
            }

            onTasksChanged();
            setShowAIGeneration(false);
        } catch (error) {
            console.error('Error saving AI specs:', error);
        }
    };

    const persona = personaConfig[userStory.persona] || personaConfig['member'];

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Badge className={priorityColors[userStory.priority]}>{userStory.priority}</Badge>
                        <Badge className={statusColors[userStory.status]}>{userStory.status}</Badge>
                    </div>
                    {!isEditMode ? (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAIGeneration(true)}
                                className="gap-1 h-7 text-xs bg-purple-600/20 border-purple-500/30 text-purple-300 hover:text-white"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Tasks
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditMode(true)}
                                className="h-7 text-xs text-gray-400"
                            >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                Edit
                            </Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="h-7 text-xs bg-green-600"
                            >
                                <Save className="w-3.5 h-3.5 mr-1" />
                                Save
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditMode(false)}
                                className="h-7 text-xs"
                            >
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
                <h2 className="text-lg font-medium text-white">User Story</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Persona Row */}
                <div className={cn("flex items-center gap-2", persona.color)}>
                    {persona.icon}
                    <span className="text-sm font-medium">{persona.label}</span>
                </div>

                {/* Assignee Row (View Mode) */}
                {!isEditMode && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Assigned to:</span>
                        <span className="text-sm text-gray-300 bg-gray-800 px-2 py-0.5 rounded">
                            {getAssigneeName(userStory.owner_id)}
                        </span>
                    </div>
                )}

                {/* Narrative */}
                {isEditMode ? (
                    <Textarea
                        value={editedNarrative}
                        onChange={(e) => setEditedNarrative(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        rows={3}
                    />
                ) : (
                    <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3">
                        <p className="text-white italic">"{userStory.narrative}"</p>
                    </div>
                )}

                {/* Edit Mode Fields */}
                {isEditMode && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Persona</label>
                                <Select value={editedPersona} onValueChange={(v) => setEditedPersona(v as UserStory['persona'])}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700 h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="business">Business</SelectItem>
                                        <SelectItem value="guest">Guest</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Priority</label>
                                <Select value={editedPriority} onValueChange={(v) => setEditedPriority(v as 'P0' | 'P1' | 'P2')}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700 h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="P0">P0 - Critical</SelectItem>
                                        <SelectItem value="P1">P1 - High</SelectItem>
                                        <SelectItem value="P2">P2 - Normal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Status</label>
                                <Select value={editedStatus} onValueChange={(v) => setEditedStatus(v as UserStory['status'])}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700 h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Not Started">Not Started</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Testing">Testing</SelectItem>
                                        <SelectItem value="Done">Done</SelectItem>
                                        <SelectItem value="Blocked">Blocked</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Assigned To</label>
                                <Select
                                    value={editedOwnerId || 'unassigned'}
                                    onValueChange={(v) => setEditedOwnerId(v === 'unassigned' ? null : v)}
                                >
                                    <SelectTrigger className="bg-gray-800 border-gray-700 h-8 text-sm">
                                        <SelectValue placeholder="Select assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">
                                            <span className="text-gray-400">Unassigned</span>
                                        </SelectItem>
                                        {filteredTeamMembers.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Acceptance Criteria */}
                {isEditMode ? (
                    <>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Acceptance Criteria (one per line)</label>
                            <Textarea
                                value={editedAcceptanceCriteria}
                                onChange={(e) => setEditedAcceptanceCriteria(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white text-sm"
                                rows={4}
                            />
                        </div>

                        {/* Delete Section */}
                        <div className="pt-4 border-t border-gray-700">
                            {!showDeleteConfirm ? (
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete User Story
                                </Button>
                            ) : (
                                <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg space-y-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-red-300">
                                            <p className="font-medium">Delete this user story?</p>
                                            <p className="text-red-400 mt-1">
                                                Tasks will be unlinked. This cannot be undone.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="text-gray-400"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            {isDeleting ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                                    Deleting...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 className="w-3 h-3 mr-2" />
                                                    Delete
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : userStory.acceptance_criteria && userStory.acceptance_criteria.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Acceptance Criteria</h4>
                        <ul className="space-y-1">
                            {userStory.acceptance_criteria.map((criteria, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    {criteria}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Tasks Section */}
                <div className="pt-2">
                    <PlatformTasksSection
                        tasks={tasks}
                        loading={loadingTasks}
                        projectId={projectId}
                        userStoryId={userStory.id}
                        milestoneId={userStory.milestone_id || null}
                        onTaskClick={onTaskClick}
                        onGenerateClick={() => setShowAIGeneration(true)}
                        onTasksChange={onTasksChanged}
                    />
                </div>
            </div>

            {/* AI Generation Dialog */}
            <Dialog open={showAIGeneration} onOpenChange={setShowAIGeneration}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-950 border-gray-800">
                    <DialogTitle className="sr-only">AI Task Generation</DialogTitle>
                    <TaskGenerationPanel
                        userStory={{
                            id: userStory.id,
                            narrative: userStory.narrative,
                            persona: userStory.persona,
                            feature_area: userStory.feature_area,
                            acceptance_criteria: userStory.acceptance_criteria,
                            priority: userStory.priority,
                        }}
                        onAccept={handleAcceptAISpecs}
                        onClose={() => setShowAIGeneration(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Task Detail View - Full detail with tabs
function TaskDetailView({
    task,
    teamMembers,
    onBack,
    onUpdate,
}: {
    task: Story;
    teamMembers: TeamMember[];
    onBack: () => void;
    onUpdate: () => void;
}) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activity, setActivity] = useState<TaskActivity[]>([]);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [subTasks, setSubTasks] = useState<Task[]>([]);
    const [newComment, setNewComment] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
    const [isAddingSubTask, setIsAddingSubTask] = useState(false);

    // Edit state
    const [editedName, setEditedName] = useState(task.name);
    const [editedDescription, setEditedDescription] = useState(task.description || '');
    const [editedEstimate, setEditedEstimate] = useState(task.estimate || '');
    const [editedPriority, setEditedPriority] = useState(task.priority);
    const [editedStatus, setEditedStatus] = useState(task.status);

    // Specs editing state
    const [editedDoD, setEditedDoD] = useState(task.definition_of_done?.join('\n') || '');
    const [editedSpecs, setEditedSpecs] = useState(task.backend_specs || '');
    const [isEditingDoD, setIsEditingDoD] = useState(false);
    const [isEditingSpecs, setIsEditingSpecs] = useState(false);

    // Assignee state
    const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);

    useEffect(() => {
        loadDetails();
        resetEditState();
    }, [task.id]);

    const loadDetails = async () => {
        try {
            const [act, com, st] = await Promise.all([
                getTaskActivity(task.id),
                getTaskComments(task.id),
                getSubTasks(task.id)
            ]);
            setActivity(act);
            setComments(com);
            setSubTasks(st);
        } catch (err) {
            console.error('Error loading task details:', err);
        }
    };

    const resetEditState = () => {
        setEditedName(task.name);
        setEditedDescription(task.description || '');
        setEditedEstimate(task.estimate || '');
        setEditedPriority(task.priority);
        setEditedStatus(task.status);
        setEditedDoD(task.definition_of_done?.join('\n') || '');
        setEditedSpecs(task.backend_specs || '');
        setIsEditMode(false);
        setIsEditingDoD(false);
        setIsEditingSpecs(false);
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            await updateStory(task.id, {
                name: editedName,
                description: editedDescription || null,
                estimate: editedEstimate || null,
                priority: editedPriority,
                status: editedStatus,
            });
            setIsEditMode(false);
            onUpdate();
        } catch (err) {
            console.error('Error saving task:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveDoD = async () => {
        try {
            const dodArray = editedDoD.split('\n').filter(line => line.trim());
            await updateStory(task.id, { definition_of_done: dodArray.length > 0 ? dodArray : null });
            setIsEditingDoD(false);
            onUpdate();
        } catch (err) {
            console.error('Error saving DoD:', err);
        }
    };

    const handleSaveSpecs = async () => {
        try {
            await updateStory(task.id, { backend_specs: editedSpecs || null });
            setIsEditingSpecs(false);
            onUpdate();
        } catch (err) {
            console.error('Error saving specs:', err);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !authorName.trim()) return;
        try {
            await addTaskComment(task.id, authorName, newComment);
            setNewComment('');
            await loadDetails();
        } catch (err) {
            console.error('Error adding comment:', err);
        }
    };

    const handleAddSubTask = async () => {
        if (!newSubTaskTitle.trim()) return;
        try {
            await createSubTask(task.id, newSubTaskTitle.trim());
            setNewSubTaskTitle('');
            setIsAddingSubTask(false);
            await loadDetails();
        } catch (err) {
            console.error('Error adding sub-task:', err);
        }
    };

    const handleToggleSubTaskStatus = async (subTask: Task) => {
        const newStatus: Task['status'] = subTask.status === 'Done' ? 'Todo' : 'Done';
        try {
            await updateSubTaskStatus(subTask.id, newStatus);
            setSubTasks(prev => prev.map(t => t.id === subTask.id ? { ...t, status: newStatus } : t));
        } catch (err) {
            console.error('Error updating sub-task:', err);
        }
    };

    const handleDeleteSubTask = async (taskId: string) => {
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

    const handleAssigneeChange = async (ownerId: string | null) => {
        setIsUpdatingAssignee(true);
        try {
            await updateStoryOwner(task.id, ownerId);
            onUpdate();
        } catch (err) {
            console.error('Error updating assignee:', err);
        } finally {
            setIsUpdatingAssignee(false);
        }
    };

    const getAssigneeName = (ownerId: string | null) => {
        if (!ownerId) return 'Unassigned';
        const member = teamMembers.find(m => m.id === ownerId);
        return member?.name || 'Unknown';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBack}
                            className="h-6 px-2 text-xs text-gray-400"
                        >
                            ← Back
                        </Button>
                        <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                        <Badge className={statusColors[task.status]}>{task.status}</Badge>
                        {task.blocked_by && (
                            <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Blocked
                            </Badge>
                        )}
                    </div>
                    {!isEditMode ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditMode(true)}
                            className="h-7 text-xs text-gray-400"
                        >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Edit
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="h-7 text-xs bg-green-600"
                            >
                                <Save className="w-3.5 h-3.5 mr-1" />
                                Save
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetEditState}
                                className="h-7 text-xs"
                            >
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                {isEditMode ? (
                    <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white text-lg font-medium"
                    />
                ) : (
                    <h2 className="text-lg font-medium text-white">{task.name}</h2>
                )}
            </div>

            {/* Content with Tabs */}
            <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="specs" className="h-full flex flex-col">
                    <TabsList className="bg-gray-900 mx-4 mt-2 flex-shrink-0">
                        <TabsTrigger value="specs" className="text-xs">Specs</TabsTrigger>
                        <TabsTrigger value="tasks" className="text-xs">Tasks ({subTasks.length})</TabsTrigger>
                        <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
                        <TabsTrigger value="comments" className="text-xs">Comments ({comments.length})</TabsTrigger>
                    </TabsList>

                    {/* Specs Tab */}
                    <TabsContent value="specs" className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Assignee Section */}
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm text-gray-400">Assignee</span>
                                </div>
                                <Select
                                    value={task.owner_id || 'unassigned'}
                                    onValueChange={(v) => handleAssigneeChange(v === 'unassigned' ? null : v)}
                                    disabled={isUpdatingAssignee}
                                >
                                    <SelectTrigger className="w-40 bg-gray-800 border-gray-700 h-8 text-sm">
                                        <SelectValue placeholder="Select assignee">
                                            {isUpdatingAssignee ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Updating...
                                                </span>
                                            ) : (
                                                getAssigneeName(task.owner_id)
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">
                                            <span className="text-gray-400">Unassigned</span>
                                        </SelectItem>
                                        {teamMembers.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                <div className="flex items-center gap-2">
                                                    <span>{member.name}</span>
                                                    <span className="text-xs text-gray-500 capitalize">({member.role})</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Info Row */}
                        {isEditMode ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Estimate</label>
                                    <Input
                                        value={editedEstimate}
                                        onChange={(e) => setEditedEstimate(e.target.value)}
                                        placeholder="e.g., 2d, 4h"
                                        className="bg-gray-800 border-gray-700 h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Status</label>
                                    <Select value={editedStatus} onValueChange={(v) => setEditedStatus(v as Story['status'])}>
                                        <SelectTrigger className="bg-gray-800 border-gray-700 h-8 text-sm">
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
                            </div>
                        ) : (
                            <div className="flex gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Estimate:</span>
                                    <span className="ml-1 text-white">{task.estimate || 'Not set'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Due:</span>
                                    <span className="ml-1 text-white">{task.due_date || 'Not set'}</span>
                                </div>
                            </div>
                        )}

                        {/* Objective */}
                        {task.objective && (
                            <div>
                                <h4 className="text-xs font-medium text-blue-400 mb-1">Objective</h4>
                                <p className="text-sm text-gray-300">{task.objective}</p>
                            </div>
                        )}

                        {/* Implementation Steps */}
                        {task.implementation_steps && task.implementation_steps.length > 0 && (
                            <div>
                                <h4 className="text-xs font-medium text-blue-400 mb-1">Implementation Steps</h4>
                                <ol className="space-y-2">
                                    {task.implementation_steps.map((step, i) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center">
                                                {step.step}
                                            </span>
                                            <div className="flex-1">
                                                <div className="text-sm text-white font-medium">{step.title}</div>
                                                {step.details && (
                                                    <div className="text-xs text-gray-400 mt-0.5">{step.details}</div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* Definition of Done */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-medium text-green-400">Definition of Done</h4>
                                {!isEditingDoD && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditingDoD(true)}
                                        className="h-5 px-2 text-[10px] text-gray-500"
                                    >
                                        Edit
                                    </Button>
                                )}
                            </div>
                            {isEditingDoD ? (
                                <div className="space-y-2">
                                    <Textarea
                                        value={editedDoD}
                                        onChange={(e) => setEditedDoD(e.target.value)}
                                        className="bg-gray-800 border-gray-700 text-white text-sm"
                                        rows={4}
                                        placeholder="One criterion per line..."
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveDoD} className="h-6 text-xs bg-green-600">Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setIsEditingDoD(false)} className="h-6 text-xs">Cancel</Button>
                                    </div>
                                </div>
                            ) : task.definition_of_done && task.definition_of_done.length > 0 ? (
                                <ul className="space-y-1">
                                    {task.definition_of_done.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                            <div className="w-3 h-3 mt-0.5 rounded border border-gray-600 flex-shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-600">No definition of done set.</p>
                            )}
                        </div>

                        {/* Technical Specs */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-medium text-purple-400">Technical Specs</h4>
                                {!isEditingSpecs && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditingSpecs(true)}
                                        className="h-5 px-2 text-[10px] text-gray-500"
                                    >
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
                                        rows={8}
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveSpecs} className="h-6 text-xs bg-green-600">Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setIsEditingSpecs(false)} className="h-6 text-xs">Cancel</Button>
                                    </div>
                                </div>
                            ) : task.backend_specs ? (
                                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-gray-900 p-3 rounded">{task.backend_specs}</pre>
                            ) : (
                                <p className="text-sm text-gray-600">No technical specs.</p>
                            )}
                        </div>

                        {/* Code Snippets */}
                        {task.code_snippets && task.code_snippets.length > 0 && (
                            <div>
                                <h4 className="text-xs font-medium text-orange-400 mb-1">Code Snippets</h4>
                                <div className="space-y-3">
                                    {task.code_snippets.map((snippet, i) => (
                                        <div key={i} className="bg-gray-900 rounded overflow-hidden">
                                            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
                                                <span className="text-xs text-gray-400">{snippet.title}</span>
                                                <span className="text-[10px] text-gray-500 uppercase">{snippet.language}</span>
                                            </div>
                                            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono p-3 overflow-x-auto">
                                                {snippet.code}
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Tasks Tab */}
                    <TabsContent value="tasks" className="flex-1 overflow-y-auto p-4 space-y-3">
                        {/* Add Sub-task */}
                        {isAddingSubTask ? (
                            <div className="flex gap-2">
                                <Input
                                    value={newSubTaskTitle}
                                    onChange={(e) => setNewSubTaskTitle(e.target.value)}
                                    placeholder="Sub-task title..."
                                    className="bg-gray-800 border-gray-700 text-white flex-1 h-8 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddSubTask();
                                        if (e.key === 'Escape') setIsAddingSubTask(false);
                                    }}
                                />
                                <Button size="sm" onClick={handleAddSubTask} className="h-8 bg-green-600">
                                    <Check className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsAddingSubTask(false)} className="h-8">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddingSubTask(true)}
                                className="w-full border-dashed h-8 text-xs"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Sub-task
                            </Button>
                        )}

                        {/* Sub-tasks List */}
                        {subTasks.length === 0 ? (
                            <p className="text-sm text-gray-600 text-center py-4">No sub-tasks yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {subTasks.map(st => (
                                    <div
                                        key={st.id}
                                        className="bg-gray-900 border border-gray-800 p-2 rounded flex items-center gap-2 group"
                                    >
                                        <button onClick={() => handleToggleSubTaskStatus(st)}>
                                            {st.status === 'Done' ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <Circle className="w-4 h-4 text-gray-500" />
                                            )}
                                        </button>
                                        <span className={cn(
                                            "text-sm flex-1",
                                            st.status === 'Done' ? "text-gray-500 line-through" : "text-gray-300"
                                        )}>
                                            {st.title}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteSubTask(st.id)}
                                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                {/* Progress */}
                                <div className="pt-2 border-t border-gray-800">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                        <span>Progress</span>
                                        <span>{subTasks.filter(t => t.status === 'Done').length}/{subTasks.length}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all"
                                            style={{ width: `${(subTasks.filter(t => t.status === 'Done').length / subTasks.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* Activity Tab */}
                    <TabsContent value="activity" className="flex-1 overflow-y-auto p-4">
                        {activity.length === 0 ? (
                            <p className="text-sm text-gray-600 text-center py-4">No activity yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {activity.map((act) => (
                                    <div key={act.id} className="flex gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        <div>
                                            <span className="text-gray-400">{act.user_name || 'System'}</span>
                                            {act.action === 'status_change' && (
                                                <span className="text-white">
                                                    {' '}changed status to <span className="text-green-400">{act.new_value}</span>
                                                </span>
                                            )}
                                            {act.action === 'created' && (
                                                <span className="text-white"> created this task</span>
                                            )}
                                            <div className="text-xs text-gray-600">{formatDate(act.created_at)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Comments Tab */}
                    <TabsContent value="comments" className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Add Comment */}
                        <div className="space-y-2">
                            <Input
                                placeholder="Your name"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                className="bg-gray-800 border-gray-700 h-8 text-sm"
                            />
                            <Textarea
                                placeholder="Add a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-sm"
                                rows={2}
                            />
                            <Button
                                size="sm"
                                onClick={handleAddComment}
                                disabled={!newComment.trim() || !authorName.trim()}
                                className="h-7 text-xs"
                            >
                                Add Comment
                            </Button>
                        </div>

                        {/* Comments List */}
                        {comments.length === 0 ? (
                            <p className="text-sm text-gray-600 text-center py-4">No comments yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="bg-gray-900 p-3 rounded">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-white text-sm">{comment.author_name}</span>
                                            <span className="text-gray-600 text-xs">{formatDate(comment.created_at)}</span>
                                        </div>
                                        <p className="text-gray-300 text-sm">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
