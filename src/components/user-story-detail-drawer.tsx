'use client';

import { useState, useEffect } from 'react';
import {
    UserStory,
    Story,
    TeamMember,
    Epic,
    Feature,
    getTasksForUserStory,
    updateUserStory,
    deleteUserStory,
    createPlatformTask,
    createSubTasksForPlatformTask,
    getEpic,
    assignUserStoryToEpic,
    getFeatures,
    getFeature,
    assignUserStoryToFeature,
} from '@/lib/supabase';
import { Edit2, Save, X, Sparkles, User, Shield, Briefcase, Users, ChevronRight, ChevronDown, Layers, Target, Package, Trash2 } from 'lucide-react';
import { PlatformTasksSection } from '@/components/platform-tasks-section';
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
import { EpicSelector } from '@/components/epic-management';
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
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { TaskGenerationPanel } from '@/components/ai/task-generation-panel';
import type { GeneratedSpecs } from '@/lib/ai/platform-prompts';
import { PLATFORM_CONFIG, type PlatformId } from '@/lib/ai/platform-prompts';

interface UserStoryDetailDrawerProps {
    userStory: UserStory;
    teamMembers: TeamMember[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTaskClick: (task: Story) => void;
    onUpdate: () => void;
    onDelete?: () => void;
    autoShowAIGeneration?: boolean;
}

const statusColors: Record<string, string> = {
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

const personaConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    'member': { icon: <User className="w-4 h-4" />, label: 'Member', color: 'text-blue-400' },
    'admin': { icon: <Shield className="w-4 h-4" />, label: 'Admin', color: 'text-purple-400' },
    'staff': { icon: <Briefcase className="w-4 h-4" />, label: 'Staff', color: 'text-green-400' },
    'business': { icon: <Briefcase className="w-4 h-4" />, label: 'Business', color: 'text-orange-400' },
    'guest': { icon: <Users className="w-4 h-4" />, label: 'Guest', color: 'text-gray-400' },
};

export function UserStoryDetailDrawer({
    userStory,
    teamMembers,
    open,
    onOpenChange,
    onTaskClick,
    onUpdate,
    onDelete,
    autoShowAIGeneration,
}: UserStoryDetailDrawerProps) {
    const [tasks, setTasks] = useState<Story[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Epic state
    const [epic, setEpic] = useState<Epic | null>(null);
    const [loadingEpic, setLoadingEpic] = useState(false);

    // Feature state
    const [feature, setFeature] = useState<Feature | null>(null);
    const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);
    const [loadingFeatures, setLoadingFeatures] = useState(false);

    // Edit state
    const [editedNarrative, setEditedNarrative] = useState(userStory.narrative);
    const [editedPersona, setEditedPersona] = useState(userStory.persona);
    const [editedFeatureArea, setEditedFeatureArea] = useState(userStory.feature_area);
    const [editedPriority, setEditedPriority] = useState(userStory.priority);
    const [editedStatus, setEditedStatus] = useState(userStory.status);
    const [editedAcceptanceCriteria, setEditedAcceptanceCriteria] = useState(
        userStory.acceptance_criteria?.join('\n') || ''
    );
    const [editedEpicId, setEditedEpicId] = useState<string | null>(userStory.epic_id || null);
    const [editedFeatureId, setEditedFeatureId] = useState<string | null>(userStory.feature_id || null);

    // AI Generation state
    const [showAIGeneration, setShowAIGeneration] = useState(false);

    // Epic context collapsed state (collapsed by default)
    const [epicExpanded, setEpicExpanded] = useState(false);

    useEffect(() => {
        if (open && userStory) {
            loadTasks();
            loadEpic();
            loadFeature();
            // Reset edit fields when userStory changes
            setEditedNarrative(userStory.narrative);
            setEditedPersona(userStory.persona);
            setEditedFeatureArea(userStory.feature_area);
            setEditedPriority(userStory.priority);
            setEditedStatus(userStory.status);
            setEditedAcceptanceCriteria(userStory.acceptance_criteria?.join('\n') || '');
            setEditedEpicId(userStory.epic_id || null);
            setEditedFeatureId(userStory.feature_id || null);
            setIsEditMode(false);

            // Auto-open AI generation modal if requested
            if (autoShowAIGeneration) {
                setShowAIGeneration(true);
            }
        }
    }, [open, userStory, autoShowAIGeneration]);

    const loadEpic = async () => {
        if (!userStory.epic_id) {
            setEpic(null);
            setAvailableFeatures([]);
            return;
        }
        setLoadingEpic(true);
        try {
            const epicData = await getEpic(userStory.epic_id);
            setEpic(epicData);
            // Load features for this epic
            await loadFeaturesForEpic(userStory.epic_id);
        } catch (err) {
            console.error('Error loading epic:', err);
        } finally {
            setLoadingEpic(false);
        }
    };

    const loadFeature = async () => {
        if (!userStory.feature_id) {
            setFeature(null);
            return;
        }
        try {
            const featureData = await getFeature(userStory.feature_id);
            setFeature(featureData);
        } catch (err) {
            console.error('Error loading feature:', err);
        }
    };

    const loadFeaturesForEpic = async (epicId: string) => {
        setLoadingFeatures(true);
        try {
            const features = await getFeatures(epicId);
            setAvailableFeatures(features);
        } catch (err) {
            console.error('Error loading features:', err);
        } finally {
            setLoadingFeatures(false);
        }
    };

    const loadTasks = async () => {
        setLoading(true);
        try {
            const fetchedTasks = await getTasksForUserStory(userStory.id);
            setTasks(fetchedTasks);
        } catch (err) {
            console.error('Error loading tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        setIsSubmitting(true);
        try {
            await updateUserStory(userStory.id, {
                narrative: editedNarrative,
                persona: editedPersona,
                feature_area: editedFeatureArea,
                priority: editedPriority,
                status: editedStatus,
                acceptance_criteria: editedAcceptanceCriteria
                    ? editedAcceptanceCriteria.split('\n').filter(line => line.trim())
                    : null,
            });

            // Update epic assignment if changed
            if (editedEpicId !== userStory.epic_id) {
                await assignUserStoryToEpic(userStory.id, editedEpicId);
                // Reload epic info and clear feature if epic changed
                if (editedEpicId) {
                    const newEpic = await getEpic(editedEpicId);
                    setEpic(newEpic);
                    // Load features for new epic
                    await loadFeaturesForEpic(editedEpicId);
                    // Clear feature assignment since epic changed
                    setEditedFeatureId(null);
                    setFeature(null);
                    await assignUserStoryToFeature(userStory.id, null);
                } else {
                    setEpic(null);
                    setAvailableFeatures([]);
                    setFeature(null);
                    await assignUserStoryToFeature(userStory.id, null);
                }
            } else if (editedFeatureId !== userStory.feature_id) {
                // Only feature changed, not epic
                await assignUserStoryToFeature(userStory.id, editedFeatureId);
                // Reload feature info
                if (editedFeatureId) {
                    const newFeature = await getFeature(editedFeatureId);
                    setFeature(newFeature);
                } else {
                    setFeature(null);
                }
            }

            setIsEditMode(false);
            onUpdate();
        } catch (err) {
            console.error('Error saving user story:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        setEditedNarrative(userStory.narrative);
        setEditedPersona(userStory.persona);
        setEditedFeatureArea(userStory.feature_area);
        setEditedPriority(userStory.priority);
        setEditedStatus(userStory.status);
        setEditedAcceptanceCriteria(userStory.acceptance_criteria?.join('\n') || '');
        setEditedEpicId(userStory.epic_id || null);
        setEditedFeatureId(userStory.feature_id || null);
        setIsEditMode(false);
    };

    // Handle user story deletion
    const handleDeleteUserStory = async () => {
        setIsDeleting(true);
        try {
            await deleteUserStory(userStory.id);
            setShowDeleteConfirm(false);
            onOpenChange(false);
            onDelete?.();
        } catch (error) {
            console.error('Error deleting user story:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle AI-generated specs acceptance
    const handleAcceptAISpecs = async (specs: GeneratedSpecs) => {
        try {
            const createdTasks: Story[] = [];

            // Create a separate Task record for EACH platform
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

                createdTasks.push(platformTask);

                // Create sub-tasks for this platform task
                if (task.sub_tasks && task.sub_tasks.length > 0) {
                    await createSubTasksForPlatformTask(platformTask.id, task.sub_tasks);
                }
            }

            // Refresh the tasks list
            await loadTasks();
            onUpdate();
            setShowAIGeneration(false);
        } catch (error) {
            console.error('Error saving AI specs:', error);
        }
    };

    const persona = personaConfig[userStory.persona] || personaConfig['member'];

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-2xl bg-gray-950 border-gray-800 overflow-y-auto px-6">
                    <SheetHeader className="pb-4 border-b border-gray-800 px-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-gray-400 text-sm">{userStory.id.slice(0, 12)}</span>
                                <Badge className={priorityColors[userStory.priority]}>{userStory.priority}</Badge>
                                <Badge className={statusColors[userStory.status]}>{userStory.status}</Badge>
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
                                        AI Generate Tasks
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
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleSaveChanges}
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
                        <SheetTitle className="text-white text-xl mt-2">User Story</SheetTitle>
                    </SheetHeader>

                    <div className="py-6 space-y-6">
                        {/* Persona Badge */}
                        <div className={`flex items-center gap-2 ${persona.color}`}>
                            {persona.icon}
                            <span className="text-sm font-medium">{persona.label}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400 text-sm">{userStory.feature_area}</span>
                        </div>

                        {/* Epic Context (View Mode) - Collapsible */}
                        {!isEditMode && epic && (
                            <div className="bg-purple-950/30 border border-purple-800/50 rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setEpicExpanded(!epicExpanded)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-purple-900/20 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-purple-400" />
                                        <span className="text-sm font-medium text-purple-300">Part of Epic</span>
                                        <span className="text-white font-medium ml-1">{epic.name}</span>
                                    </div>
                                    {epicExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                                {epicExpanded && (
                                    <div className="px-4 pb-4 border-t border-purple-800/30">
                                        {epic.description && (
                                            <p className="text-sm text-gray-400 mt-3">{epic.description}</p>
                                        )}
                                        {epic.user_value && (
                                            <div className="flex items-start gap-2 mt-3 text-sm">
                                                <Target className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-gray-300">{epic.user_value}</span>
                                            </div>
                                        )}
                                        {epic.business_objectives && epic.business_objectives.length > 0 && (
                                            <div className="mt-3 text-sm">
                                                <span className="text-gray-500">Business Goals:</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {epic.business_objectives.slice(0, 3).map((obj, i) => (
                                                        <Badge key={i} variant="outline" className="border-purple-600/50 text-purple-300 text-xs">
                                                            {obj}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Feature Context (View Mode) */}
                        {!isEditMode && feature && (
                            <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-medium text-blue-300">Feature</span>
                                </div>
                                <p className="text-white font-medium mt-1">{feature.name}</p>
                                {feature.description && (
                                    <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
                                )}
                            </div>
                        )}

                        {/* Epic Selector (Edit Mode) */}
                        {isEditMode && (
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-purple-400" />
                                    Epic Assignment
                                </label>
                                <EpicSelector
                                    projectId={userStory.project_id}
                                    selectedEpicId={editedEpicId}
                                    onSelect={(epicId) => {
                                        setEditedEpicId(epicId);
                                        // Clear feature when epic changes
                                        if (epicId !== editedEpicId) {
                                            setEditedFeatureId(null);
                                            if (epicId) {
                                                loadFeaturesForEpic(epicId);
                                            } else {
                                                setAvailableFeatures([]);
                                            }
                                        }
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Assign this user story to an epic for better organization and context.
                                </p>
                            </div>
                        )}

                        {/* Feature Selector (Edit Mode - only when Epic is selected) */}
                        {isEditMode && editedEpicId && (
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-400" />
                                    Feature Assignment
                                </label>
                                <Select
                                    value={editedFeatureId || 'none'}
                                    onValueChange={(v) => setEditedFeatureId(v === 'none' ? null : v)}
                                >
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue placeholder="Select a feature..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            <span className="text-gray-400">No feature (unassigned)</span>
                                        </SelectItem>
                                        {availableFeatures.map((f) => (
                                            <SelectItem key={f.id} value={f.id}>
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-3 h-3 text-blue-400" />
                                                    {f.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Group this story under a specific feature within the epic.
                                </p>
                            </div>
                        )}

                        {/* Narrative */}
                        {isEditMode ? (
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Narrative</label>
                                <Textarea
                                    value={editedNarrative}
                                    onChange={(e) => setEditedNarrative(e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    rows={3}
                                />
                            </div>
                        ) : (
                            <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-4">
                                <p className="text-white text-lg italic">"{userStory.narrative}"</p>
                            </div>
                        )}

                        {/* Edit Mode Fields */}
                        {isEditMode && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Persona</label>
                                        <Select value={editedPersona} onValueChange={(v) => setEditedPersona(v as UserStory['persona'])}>
                                            <SelectTrigger className="bg-gray-800 border-gray-700">
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
                                        <label className="text-sm text-gray-400 mb-2 block">Feature Area</label>
                                        <Input
                                            value={editedFeatureArea}
                                            onChange={(e) => setEditedFeatureArea(e.target.value)}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Priority</label>
                                        <Select value={editedPriority} onValueChange={(v) => setEditedPriority(v as UserStory['priority'])}>
                                            <SelectTrigger className="bg-gray-800 border-gray-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="P0">P0 - Critical</SelectItem>
                                                <SelectItem value="P1">P1 - High</SelectItem>
                                                <SelectItem value="P2">P2 - Medium</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Status</label>
                                        <Select value={editedStatus} onValueChange={(v) => setEditedStatus(v as UserStory['status'])}>
                                            <SelectTrigger className="bg-gray-800 border-gray-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Not Started">Not Started</SelectItem>
                                                <SelectItem value="In Progress">In Progress</SelectItem>
                                                <SelectItem value="Done">Done</SelectItem>
                                                <SelectItem value="Blocked">Blocked</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Acceptance Criteria (one per line)</label>
                                    <Textarea
                                        value={editedAcceptanceCriteria}
                                        onChange={(e) => setEditedAcceptanceCriteria(e.target.value)}
                                        className="bg-gray-800 border-gray-700 text-white"
                                        rows={4}
                                        placeholder="Enter acceptance criteria, one per line..."
                                    />
                                </div>
                            </>
                        )}

                        {/* Acceptance Criteria (View Mode) */}
                        {!isEditMode && userStory.acceptance_criteria && userStory.acceptance_criteria.length > 0 && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2">Acceptance Criteria</h4>
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

                        {/* Tasks Section - Grouped by Platform */}
                        <PlatformTasksSection
                            tasks={tasks}
                            loading={loading}
                            projectId={userStory.project_id}
                            userStoryId={userStory.id}
                            milestoneId={userStory.milestone_id || null}
                            onTaskClick={onTaskClick}
                            onGenerateClick={() => setShowAIGeneration(true)}
                            onTasksChange={loadTasks}
                        />
                    </div>
                </SheetContent>
            </Sheet>

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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent className="bg-gray-900 border-gray-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete User Story</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            Are you sure you want to delete this user story? This will also delete all {tasks.length} associated tasks. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUserStory}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
