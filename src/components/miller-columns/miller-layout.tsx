'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Epic,
    Feature,
    UserStory,
    Story,
    TeamMember,
    getEpicsWithCounts,
    getFeaturesWithCounts,
    getUserStoriesForFeature,
    getTasksForUserStory,
    updateEpic,
    updateFeature,
    deleteEpic,
    deleteFeature,
    createFeature,
    reorderEpics,
} from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FeatureNavColumn } from './feature-nav-column';
import { UserStoryColumn } from './user-story-column';
import { DetailColumn } from './detail-column';
import {
    Layers,
    ChevronRight,
    Edit2,
    Loader2,
    Settings,
    Trash2,
    AlertTriangle,
    Plus,
    GripVertical,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMillerUrlState } from '@/hooks/use-url-state';

interface MillerLayoutProps {
    projectId: string;
    teamMembers: TeamMember[];
    onRefresh: () => void;
}

// Feature with stories for display
export type FeatureWithStories = Feature & { stories: UserStory[] };

export function MillerLayout({ projectId, teamMembers, onRefresh }: MillerLayoutProps) {
    // URL-based selection state (persists across tab switches)
    const {
        epicId: urlEpicId,
        featureId: urlFeatureId,
        storyId: urlStoryId,
        setEpicId: setUrlEpicId,
        setFeatureId: setUrlFeatureId,
        setStoryId: setUrlStoryId,
    } = useMillerUrlState();

    // Epic data and selection
    const [epics, setEpics] = useState<Epic[]>([]);
    const [loadingEpics, setLoadingEpics] = useState(true);
    const [selectedEpicId, setSelectedEpicId] = useState<string | null>(urlEpicId);

    // Feature data
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loadingFeatures, setLoadingFeatures] = useState(false);

    // User story data
    const [userStories, setUserStories] = useState<UserStory[]>([]);
    const [loadingStories, setLoadingStories] = useState(false);

    // Task data
    const [tasks, setTasks] = useState<Story[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // Selection state
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(urlFeatureId);
    const [selectedUserStoryId, setSelectedUserStoryId] = useState<string | null>(urlStoryId);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Track if initial load from URL is complete
    const initialLoadRef = useRef(false);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Track previous epic to detect real changes
    const prevEpicRef = useRef<string | null>(null);

    // Load epics on mount (only once)
    useEffect(() => {
        const loadEpics = async () => {
            setLoadingEpics(true);
            try {
                const data = await getEpicsWithCounts(projectId);
                setEpics(data);

                // On initial load, always select the first epic in display_order
                // This ensures the epic with lowest display_order is always selected by default
                if (!initialLoadRef.current && data.length > 0) {
                    initialLoadRef.current = true;

                    // Always default to first epic in display_order
                    // Only set local state - don't update URL on initial load to avoid
                    // race conditions with tab switching URL updates
                    const firstId = data[0].id;
                    setSelectedEpicId(firstId);
                    prevEpicRef.current = firstId;
                }
            } catch (err) {
                console.error('Error loading epics:', err);
            } finally {
                setLoadingEpics(false);
            }
        };

        loadEpics();
        // Only run once on mount - urlEpicId is read but not a dependency
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // Load features when epic is selected
    const loadFeaturesForEpic = useCallback(async (epicId: string) => {
        setLoadingFeatures(true);
        try {
            const data = await getFeaturesWithCounts(epicId);
            setFeatures(data);
            return data;
        } catch (err) {
            console.error('Error loading features:', err);
            return [];
        } finally {
            setLoadingFeatures(false);
        }
    }, []);

    // Handle epic selection changes and initial URL restoration
    useEffect(() => {
        if (!selectedEpicId) return;

        const isInitialLoad = prevEpicRef.current === null || prevEpicRef.current === selectedEpicId;
        const isEpicChange = prevEpicRef.current !== null && prevEpicRef.current !== selectedEpicId;

        // Update URL when epic changes (but not on every render)
        if (isEpicChange) {
            setUrlEpicId(selectedEpicId);
        }

        // Load features for the selected epic
        loadFeaturesForEpic(selectedEpicId).then((loadedFeatures) => {
            if (isInitialLoad && urlFeatureId) {
                // Initial load: restore feature from URL if valid
                if (loadedFeatures.some(f => f.id === urlFeatureId)) {
                    setSelectedFeatureId(urlFeatureId);
                    // Load stories for restored feature
                    loadStoriesForFeature(urlFeatureId).then((loadedStories) => {
                        if (urlStoryId && loadedStories.some(s => s.id === urlStoryId)) {
                            setSelectedUserStoryId(urlStoryId);
                            loadTasksForStory(urlStoryId);
                        }
                    });
                }
            } else if (isEpicChange) {
                // Epic changed: clear downstream selections
                setSelectedFeatureId(null);
                setSelectedUserStoryId(null);
                setSelectedTaskId(null);
                setUserStories([]);
                setTasks([]);
                setUrlFeatureId(null);
                setUrlStoryId(null);
            }
        });

        prevEpicRef.current = selectedEpicId;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEpicId]);

    // Load user stories when feature is selected
    const loadStoriesForFeature = useCallback(async (featureId: string) => {
        setLoadingStories(true);
        try {
            const stories = await getUserStoriesForFeature(featureId);
            setUserStories(stories);
            return stories;
        } catch (err) {
            console.error('Error loading stories:', err);
            return [];
        } finally {
            setLoadingStories(false);
        }
    }, []);

    // Load tasks when user story is selected
    const loadTasksForStory = useCallback(async (userStoryId: string) => {
        setLoadingTasks(true);
        try {
            const tasksData = await getTasksForUserStory(userStoryId);
            setTasks(tasksData);
        } catch (err) {
            console.error('Error loading tasks:', err);
        } finally {
            setLoadingTasks(false);
        }
    }, []);

    // Selection handlers - sync local state and URL
    const handleSelectEpic = useCallback((epicId: string) => {
        setSelectedEpicId(epicId);
    }, []);

    const handleSelectFeature = useCallback((featureId: string | null) => {
        setSelectedFeatureId(featureId);
        setUrlFeatureId(featureId);
        setSelectedUserStoryId(null);
        setUrlStoryId(null);
        setSelectedTaskId(null);
        setUserStories([]);
        setTasks([]);

        if (featureId) {
            loadStoriesForFeature(featureId);
        }
    }, [loadStoriesForFeature, setUrlFeatureId, setUrlStoryId]);

    const handleSelectUserStory = useCallback((userStoryId: string | null) => {
        setSelectedUserStoryId(userStoryId);
        setUrlStoryId(userStoryId);
        setSelectedTaskId(null);
        setTasks([]);

        if (userStoryId) {
            loadTasksForStory(userStoryId);
        }
    }, [loadTasksForStory, setUrlStoryId]);

    const handleSelectTask = useCallback((taskId: string | null) => {
        setSelectedTaskId(taskId);
    }, []);

    // Get selected objects
    const selectedEpic = epics.find(e => e.id === selectedEpicId) || null;
    const selectedFeature = features.find(f => f.id === selectedFeatureId) || null;
    const selectedUserStory = userStories.find(s => s.id === selectedUserStoryId) || null;
    const selectedTask = tasks.find(t => t.id === selectedTaskId) || null;

    // Refresh handlers
    const handleFeatureCreated = useCallback(() => {
        if (selectedEpicId) {
            loadFeaturesForEpic(selectedEpicId);
        }
    }, [selectedEpicId, loadFeaturesForEpic]);

    const handleStoryCreated = useCallback(() => {
        if (selectedFeatureId) {
            loadStoriesForFeature(selectedFeatureId);
        }
        onRefresh();
    }, [selectedFeatureId, loadStoriesForFeature, onRefresh]);

    const handleTasksChanged = useCallback(() => {
        if (selectedUserStoryId) {
            loadTasksForStory(selectedUserStoryId);
        }
    }, [selectedUserStoryId, loadTasksForStory]);

    const handleUserStoryUpdated = useCallback(() => {
        if (selectedFeatureId) {
            loadStoriesForFeature(selectedFeatureId);
        }
        onRefresh();
    }, [selectedFeatureId, loadStoriesForFeature, onRefresh]);

    const handleEpicUpdated = useCallback((updatedEpic: Epic) => {
        setEpics(prev => prev.map(e => e.id === updatedEpic.id ? { ...e, ...updatedEpic } : e));
        onRefresh();
    }, [onRefresh]);

    const handleEpicDeleted = useCallback((epicId: string) => {
        setEpics(prev => prev.filter(e => e.id !== epicId));
        // If the deleted epic was selected, clear selection
        if (selectedEpicId === epicId) {
            setSelectedEpicId(null);
            setSelectedFeatureId(null);
            setSelectedUserStoryId(null);
            setSelectedTaskId(null);
            setFeatures([]);
            setUserStories([]);
            setTasks([]);
        }
        onRefresh();
    }, [selectedEpicId, onRefresh]);

    const handleEpicsReordered = useCallback((epicIds: string[]) => {
        // Update local state to reflect new order
        const newEpics = epicIds.map(id => epics.find(e => e.id === id)!).filter(Boolean);
        setEpics(newEpics);
    }, [epics]);

    const handleFeatureUpdated = useCallback((updatedFeature: Feature) => {
        setFeatures(prev => prev.map(f => f.id === updatedFeature.id ? { ...f, ...updatedFeature } : f));
        onRefresh();
    }, [onRefresh]);

    const handleFeatureDeleted = useCallback((featureId: string) => {
        setFeatures(prev => prev.filter(f => f.id !== featureId));
        // If the deleted feature was selected, clear selection
        if (selectedFeatureId === featureId) {
            setSelectedFeatureId(null);
            setSelectedUserStoryId(null);
            setSelectedTaskId(null);
            setUserStories([]);
            setTasks([]);
        }
        onRefresh();
    }, [selectedFeatureId, onRefresh]);

    const handleUserStoryDeleted = useCallback((userStoryId: string) => {
        setUserStories(prev => prev.filter(s => s.id !== userStoryId));
        // If the deleted story was selected, clear selection
        if (selectedUserStoryId === userStoryId) {
            setSelectedUserStoryId(null);
            setSelectedTaskId(null);
            setTasks([]);
        }
        onRefresh();
    }, [selectedUserStoryId, onRefresh]);

    // Mobile accordion view
    if (isMobile) {
        return (
            <MobileAccordionView
                epics={epics}
                features={features}
                userStories={userStories}
                tasks={tasks}
                selectedEpicId={selectedEpicId}
                selectedFeatureId={selectedFeatureId}
                selectedUserStoryId={selectedUserStoryId}
                loadingEpics={loadingEpics}
                loadingFeatures={loadingFeatures}
                loadingStories={loadingStories}
                onSelectEpic={handleSelectEpic}
                onSelectFeature={handleSelectFeature}
                onSelectUserStory={handleSelectUserStory}
            />
        );
    }

    // Desktop layout with Epic tabs
    return (
        <div className="space-y-3">
            {/* Epic Tabs */}
            <EpicTabBar
                projectId={projectId}
                epics={epics}
                selectedEpicId={selectedEpicId}
                loading={loadingEpics}
                onSelectEpic={handleSelectEpic}
                onEpicUpdated={handleEpicUpdated}
                onEpicDeleted={handleEpicDeleted}
                onEpicsReordered={handleEpicsReordered}
            />

            {/* Three-column layout */}
            <div className="flex h-[calc(100vh-280px)] min-h-[500px] border border-gray-800 rounded-lg overflow-hidden bg-gray-950">
                {/* Column 1: Features */}
                <div className="w-1/4 min-w-[260px] max-w-[300px] border-r border-gray-800 flex flex-col">
                    <FeatureListColumn
                        projectId={projectId}
                        epicId={selectedEpicId}
                        epics={epics}
                        features={features}
                        selectedFeatureId={selectedFeatureId}
                        loading={loadingFeatures}
                        onSelectFeature={handleSelectFeature}
                        onFeatureUpdated={handleFeatureUpdated}
                        onFeatureDeleted={handleFeatureDeleted}
                        onFeatureMoved={() => {
                            // When a feature moves to a different epic, reload the current epic's features
                            if (selectedEpicId) loadFeaturesForEpic(selectedEpicId);
                            onRefresh();
                        }}
                        onFeatureCreated={() => {
                            if (selectedEpicId) loadFeaturesForEpic(selectedEpicId);
                            onRefresh();
                        }}
                    />
                </div>

                {/* Column 2: User Stories */}
                <div className="w-[35%] min-w-[300px] border-r border-gray-800 flex flex-col">
                    <UserStoryColumn
                        projectId={projectId}
                        userStories={userStories}
                        selectedEpic={selectedEpic}
                        selectedFeature={selectedFeature}
                        selectedUserStoryId={selectedUserStoryId}
                        loading={loadingStories}
                        teamMembers={teamMembers}
                        onSelectUserStory={handleSelectUserStory}
                        onStoryCreated={handleStoryCreated}
                        onStoryUpdated={handleUserStoryUpdated}
                    />
                </div>

                {/* Column 3: Detail Pane */}
                <div className="flex-1 min-w-[380px] flex flex-col overflow-hidden">
                    <DetailColumn
                        projectId={projectId}
                        userStory={selectedUserStory}
                        task={selectedTask}
                        tasks={tasks}
                        teamMembers={teamMembers}
                        loadingTasks={loadingTasks}
                        selectedTaskId={selectedTaskId}
                        onSelectTask={handleSelectTask}
                        onTasksChanged={handleTasksChanged}
                        onUserStoryUpdated={handleUserStoryUpdated}
                        onUserStoryDeleted={handleUserStoryDeleted}
                    />
                </div>
            </div>
        </div>
    );
}

const STATUSES = ['Not Started', 'In Progress', 'Done', 'On Hold'] as const;

// Edit Epic Dialog Component
function EditEpicDialog({
    epic,
    open,
    onOpenChange,
    onSave,
    onDelete,
}: {
    epic: Epic | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (updatedEpic: Epic) => void;
    onDelete: (epicId: string) => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<Epic['status']>('Not Started');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (epic) {
            setName(epic.name);
            setDescription(epic.description || '');
            setStatus(epic.status);
        }
        setShowDeleteConfirm(false);
    }, [epic]);

    const handleSave = async () => {
        if (!epic) return;
        setSaving(true);
        try {
            const updated = await updateEpic(epic.id, {
                name,
                description,
                status,
            });
            onSave(updated);
            onOpenChange(false);
        } catch (err) {
            console.error('Error updating epic:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!epic) return;
        setDeleting(true);
        try {
            await deleteEpic(epic.id);
            onDelete(epic.id);
            onOpenChange(false);
        } catch (err) {
            console.error('Error deleting epic:', err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-400" />
                        Edit Epic
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white"
                            placeholder="Epic name"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                            placeholder="Epic description (optional)"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Status</label>
                        <Select value={status} onValueChange={(v) => setStatus(v as Epic['status'])}>
                            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                                {STATUSES.map((s) => (
                                    <SelectItem key={s} value={s} className="text-white">
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                                Delete Epic
                            </Button>
                        ) : (
                            <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg space-y-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-red-300">
                                        <p className="font-medium">Delete this epic?</p>
                                        <p className="text-red-400 mt-1">
                                            All features and user stories will be unlinked. This cannot be undone.
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
                                        disabled={deleting}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {deleting ? (
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
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-gray-700"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Edit Feature Dialog Component
function EditFeatureDialog({
    feature,
    epics,
    currentEpicId,
    open,
    onOpenChange,
    onSave,
    onMoved,
    onDelete,
}: {
    feature: Feature | null;
    epics: Epic[];
    currentEpicId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (updatedFeature: Feature) => void;
    onMoved: () => void;
    onDelete: (featureId: string) => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Feature['priority']>('P1');
    const [status, setStatus] = useState<Feature['status']>('Not Started');
    const [selectedEpicId, setSelectedEpicId] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (feature) {
            setName(feature.name);
            setDescription(feature.description || '');
            setPriority(feature.priority);
            setStatus(feature.status);
            setSelectedEpicId(feature.epic_id);
        }
        setShowDeleteConfirm(false);
    }, [feature]);

    const handleSave = async () => {
        if (!feature) return;
        setSaving(true);
        try {
            const epicChanged = selectedEpicId !== feature.epic_id;
            const updated = await updateFeature(feature.id, {
                name,
                description,
                priority,
                status,
                epic_id: selectedEpicId,
            });

            if (epicChanged) {
                // Feature was moved to a different epic
                onMoved();
            } else {
                onSave(updated);
            }
            onOpenChange(false);
        } catch (err) {
            console.error('Error updating feature:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!feature) return;
        setDeleting(true);
        try {
            await deleteFeature(feature.id);
            onDelete(feature.id);
            onOpenChange(false);
        } catch (err) {
            console.error('Error deleting feature:', err);
        } finally {
            setDeleting(false);
        }
    };

    const PRIORITIES = ['P0', 'P1', 'P2'] as const;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-indigo-400" />
                        Edit Feature
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white"
                            placeholder="Feature name"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                            placeholder="Feature description (optional)"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Priority</label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as Feature['priority'])}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                    {PRIORITIES.map((p) => (
                                        <SelectItem key={p} value={p} className="text-white">
                                            {p === 'P0' ? 'P0 - Critical' : p === 'P1' ? 'P1 - High' : 'P2 - Normal'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Status</label>
                            <Select value={status} onValueChange={(v) => setStatus(v as Feature['status'])}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s} value={s} className="text-white">
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Move to Epic Section */}
                    {epics.length > 1 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-purple-400" />
                                Move to Epic
                            </label>
                            <Select value={selectedEpicId} onValueChange={setSelectedEpicId}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue placeholder="Select epic..." />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                    {epics.map((epic) => (
                                        <SelectItem key={epic.id} value={epic.id} className="text-white">
                                            <div className="flex items-center gap-2">
                                                <span>{epic.name}</span>
                                                {epic.id === currentEpicId && (
                                                    <span className="text-xs text-gray-400">(current)</span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedEpicId && selectedEpicId !== feature?.epic_id && (
                                <p className="text-xs text-amber-400">
                                    Feature will be moved to a different epic
                                </p>
                            )}
                        </div>
                    )}

                    {/* Delete Section */}
                    <div className="pt-4 border-t border-gray-700">
                        {!showDeleteConfirm ? (
                            <Button
                                variant="ghost"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Feature
                            </Button>
                        ) : (
                            <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg space-y-3">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-red-300">
                                        <p className="font-medium">Delete this feature?</p>
                                        <p className="text-red-400 mt-1">
                                            User stories will be unlinked from this feature. This cannot be undone.
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
                                        disabled={deleting}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {deleting ? (
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
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-gray-700"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Epic Tab Bar Component
function EpicTabBar({
    projectId,
    epics,
    selectedEpicId,
    loading,
    onSelectEpic,
    onEpicUpdated,
    onEpicDeleted,
    onEpicsReordered,
}: {
    projectId: string;
    epics: Epic[];
    selectedEpicId: string | null;
    loading: boolean;
    onSelectEpic: (epicId: string) => void;
    onEpicUpdated: (epic: Epic) => void;
    onEpicDeleted: (epicId: string) => void;
    onEpicsReordered: (epicIds: string[]) => void;
}) {
    const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
    const [draggedEpicId, setDraggedEpicId] = useState<string | null>(null);
    const [dragOverEpicId, setDragOverEpicId] = useState<string | null>(null);

    const handleDragStart = (epicId: string) => {
        setDraggedEpicId(epicId);
    };

    const handleDragEnd = async () => {
        if (draggedEpicId && dragOverEpicId && draggedEpicId !== dragOverEpicId) {
            // Calculate new order
            const newEpics = [...epics];
            const draggedIndex = newEpics.findIndex(e => e.id === draggedEpicId);
            const targetIndex = newEpics.findIndex(e => e.id === dragOverEpicId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                // Remove dragged item and insert at target position
                const [draggedEpic] = newEpics.splice(draggedIndex, 1);
                newEpics.splice(targetIndex, 0, draggedEpic);

                // Get new order of epic IDs
                const newEpicIds = newEpics.map(e => e.id);

                // Save to database
                try {
                    await reorderEpics(projectId, newEpicIds);
                    onEpicsReordered(newEpicIds);
                } catch (err) {
                    console.error('Failed to reorder epics:', err);
                }
            }
        }

        setDraggedEpicId(null);
        setDragOverEpicId(null);
    };

    const handleDragOver = (e: React.DragEvent, epicId: string) => {
        e.preventDefault();
        if (epicId !== draggedEpicId) {
            setDragOverEpicId(epicId);
        }
    };

    const handleDragLeave = () => {
        setDragOverEpicId(null);
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg border border-gray-800">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm text-gray-400">Loading epics...</span>
            </div>
        );
    }

    if (epics.length === 0) {
        return (
            <div className="flex items-center gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                <Layers className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">No epics found. Create an epic to get started.</span>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center gap-1 p-1 bg-gray-900/50 rounded-lg border border-gray-800 overflow-x-auto">
                <div className="flex items-center gap-1 px-2 border-r border-gray-700 mr-1">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-gray-400">Epic:</span>
                </div>
                {epics.map(epic => {
                    const isSelected = selectedEpicId === epic.id;
                    const isDragging = draggedEpicId === epic.id;
                    const isDragOver = dragOverEpicId === epic.id;
                    const progress = epic.user_story_count && epic.user_story_count > 0
                        ? Math.round(((epic.completed_story_count || 0) / epic.user_story_count) * 100)
                        : 0;

                    return (
                        <div
                            key={epic.id}
                            role="button"
                            tabIndex={0}
                            draggable
                            onDragStart={() => handleDragStart(epic.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, epic.id)}
                            onDragLeave={handleDragLeave}
                            onClick={() => onSelectEpic(epic.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelectEpic(epic.id);
                                }
                            }}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer group",
                                isSelected
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : "text-gray-400 hover:text-white hover:bg-gray-800",
                                isDragging && "opacity-50",
                                isDragOver && "border-l-2 border-purple-500"
                            )}
                        >
                            {/* Drag Handle */}
                            <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-3 h-3" />
                            </div>
                            <span>{epic.name}</span>
                            <div className="flex items-center gap-1">
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded",
                                    isSelected ? "bg-purple-500/30" : "bg-gray-700"
                                )}>
                                    {epic.completed_story_count || 0}/{epic.user_story_count || 0}
                                </span>
                                {progress > 0 && (
                                    <div className="w-8 h-1 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full",
                                                progress === 100 ? "bg-green-500" : "bg-purple-500"
                                            )}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            {/* Edit button for epic */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className={cn(
                                        "p-0.5 rounded hover:bg-gray-700",
                                        isSelected ? "text-purple-300" : "text-gray-500"
                                    )}>
                                        <Settings className="w-3 h-3" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                                    <DropdownMenuItem
                                        className="text-gray-300 hover:text-white cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingEpic(epic);
                                        }}
                                    >
                                        <Edit2 className="w-3 h-3 mr-2" />
                                        Edit Epic
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                })}
            </div>

            {/* Edit Epic Dialog */}
            <EditEpicDialog
                epic={editingEpic}
                open={editingEpic !== null}
                onOpenChange={(open) => {
                    if (!open) setEditingEpic(null);
                }}
                onSave={onEpicUpdated}
                onDelete={onEpicDeleted}
            />
        </>
    );
}

// Feature List Column (simplified, no epic grouping)
function FeatureListColumn({
    projectId,
    epicId,
    epics,
    features,
    selectedFeatureId,
    loading,
    onSelectFeature,
    onFeatureUpdated,
    onFeatureDeleted,
    onFeatureMoved,
    onFeatureCreated,
}: {
    projectId: string;
    epicId: string | null;
    epics: Epic[];
    features: Feature[];
    selectedFeatureId: string | null;
    loading: boolean;
    onSelectFeature: (featureId: string | null) => void;
    onFeatureUpdated: (feature: Feature) => void;
    onFeatureDeleted: (featureId: string) => void;
    onFeatureMoved: () => void;
    onFeatureCreated: () => void;
}) {
    const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newFeatureName, setNewFeatureName] = useState('');
    const [newFeatureDescription, setNewFeatureDescription] = useState('');
    const [newFeaturePriority, setNewFeaturePriority] = useState<'P0' | 'P1' | 'P2'>('P1');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateFeature = async () => {
        if (!epicId || !newFeatureName.trim()) return;
        setIsCreating(true);
        try {
            await createFeature({
                project_id: projectId,
                epic_id: epicId,
                name: newFeatureName.trim(),
                description: newFeatureDescription.trim() || null,
                priority: newFeaturePriority,
            });
            setNewFeatureName('');
            setNewFeatureDescription('');
            setNewFeaturePriority('P1');
            setShowCreateDialog(false);
            onFeatureCreated();
        } catch (err) {
            console.error('Error creating feature:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const priorityColors: Record<string, string> = {
        'P0': 'bg-red-600',
        'P1': 'bg-yellow-500',
        'P2': 'bg-gray-500',
    };

    const statusColors: Record<string, string> = {
        'Not Started': 'text-gray-400',
        'In Progress': 'text-blue-400',
        'Done': 'text-green-400',
        'On Hold': 'text-yellow-400',
    };

    return (
        <>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-3 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-400" />
                            <span className="text-sm font-medium text-white">Features</span>
                            <span className="text-xs text-gray-500">({features.length})</span>
                        </div>
                        {epicId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCreateDialog(true)}
                                className="h-6 w-6 p-0 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Feature List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                        </div>
                    ) : features.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <Package className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm text-gray-500">No features in this epic</p>
                            <p className="text-xs text-gray-600 mt-1">Create features to organize user stories</p>
                            {epicId && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCreateDialog(true)}
                                    className="mt-3 gap-1 text-indigo-400 border-indigo-500/30"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Feature
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="py-1">
                            {features.map(feature => {
                                const storyCount = feature.user_story_count || 0;
                                const doneCount = feature.completed_story_count || 0;
                                const progress = storyCount > 0 ? Math.round((doneCount / storyCount) * 100) : 0;
                                const isSelected = selectedFeatureId === feature.id;

                                return (
                                    <div
                                        key={feature.id}
                                        onClick={() => onSelectFeature(feature.id)}
                                        className={cn(
                                            "px-3 py-2 cursor-pointer border-l-2 transition-colors group",
                                            isSelected
                                                ? "bg-indigo-500/20 border-indigo-500"
                                                : "hover:bg-gray-800/50 border-transparent"
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            <Package className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={cn(
                                                        "text-sm font-medium truncate flex-1",
                                                        isSelected ? "text-white" : "text-gray-300"
                                                    )}>
                                                        {feature.name}
                                                    </span>
                                                    <Badge className={cn("text-[10px] px-1 py-0", priorityColors[feature.priority])}>
                                                        {feature.priority}
                                                    </Badge>
                                                    {/* Edit button - visible on hover or when selected */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingFeature(feature);
                                                        }}
                                                        className={cn(
                                                            "p-0.5 rounded hover:bg-gray-700 transition-opacity",
                                                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                                                            isSelected ? "text-indigo-300" : "text-gray-500"
                                                        )}
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                {feature.description && (
                                                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                        {feature.description}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={cn("text-[10px]", statusColors[feature.status])}>
                                                        {feature.status}
                                                    </span>
                                                    <span className="text-[10px] text-gray-600">•</span>
                                                    <span className="text-[10px] text-gray-500">
                                                        {doneCount}/{storyCount} stories
                                                    </span>
                                                    {progress > 0 && (
                                                        <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn(
                                                                    "h-full transition-all",
                                                                    progress === 100 ? "bg-green-500" : "bg-indigo-500"
                                                                )}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Feature Dialog */}
            <EditFeatureDialog
                feature={editingFeature}
                epics={epics}
                currentEpicId={epicId}
                open={editingFeature !== null}
                onOpenChange={(open) => {
                    if (!open) setEditingFeature(null);
                }}
                onSave={onFeatureUpdated}
                onMoved={onFeatureMoved}
                onDelete={onFeatureDeleted}
            />

            {/* Create Feature Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="bg-gray-900 border-gray-700 sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-400" />
                            Create Feature
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-1.5 block">Feature Name</label>
                            <Input
                                value={newFeatureName}
                                onChange={(e) => setNewFeatureName(e.target.value)}
                                placeholder="e.g., User Authentication"
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1.5 block">Description (optional)</label>
                            <Textarea
                                value={newFeatureDescription}
                                onChange={(e) => setNewFeatureDescription(e.target.value)}
                                placeholder="Brief description of the feature..."
                                className="bg-gray-800 border-gray-700 text-white"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-1.5 block">Priority</label>
                            <Select value={newFeaturePriority} onValueChange={(v) => setNewFeaturePriority(v as 'P0' | 'P1' | 'P2')}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="P0" className="text-white">P0 - Critical</SelectItem>
                                    <SelectItem value="P1" className="text-white">P1 - High</SelectItem>
                                    <SelectItem value="P2" className="text-white">P2 - Normal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowCreateDialog(false)}
                            className="border-gray-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateFeature}
                            disabled={isCreating || !newFeatureName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Feature'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Import Package icon for FeatureListColumn
import { Package } from 'lucide-react';

// Mobile Accordion View Component
function MobileAccordionView({
    epics,
    features,
    userStories,
    tasks,
    selectedEpicId,
    selectedFeatureId,
    selectedUserStoryId,
    loadingEpics,
    loadingFeatures,
    loadingStories,
    onSelectEpic,
    onSelectFeature,
    onSelectUserStory,
}: {
    epics: Epic[];
    features: Feature[];
    userStories: UserStory[];
    tasks: Story[];
    selectedEpicId: string | null;
    selectedFeatureId: string | null;
    selectedUserStoryId: string | null;
    loadingEpics: boolean;
    loadingFeatures: boolean;
    loadingStories: boolean;
    onSelectEpic: (id: string) => void;
    onSelectFeature: (id: string | null) => void;
    onSelectUserStory: (id: string | null) => void;
}) {
    if (loadingEpics) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-2 p-4">
            {/* Epic selector */}
            <div className="flex flex-wrap gap-2 mb-4">
                {epics.map(epic => (
                    <button
                        key={epic.id}
                        onClick={() => onSelectEpic(epic.id)}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium",
                            selectedEpicId === epic.id
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-gray-800 text-gray-400"
                        )}
                    >
                        {epic.name}
                    </button>
                ))}
            </div>

            {/* Features for selected epic */}
            {selectedEpicId && (
                loadingFeatures ? (
                    <div className="text-gray-500 text-sm">Loading features...</div>
                ) : features.length === 0 ? (
                    <div className="text-gray-500 text-sm">No features in this epic</div>
                ) : (
                    features.map(feature => (
                        <div key={feature.id} className="border border-gray-800 rounded-lg overflow-hidden">
                            <button
                                onClick={() => onSelectFeature(feature.id)}
                                className={cn(
                                    "w-full p-3 text-left flex items-center justify-between",
                                    selectedFeatureId === feature.id ? "bg-indigo-500/20" : "bg-gray-900"
                                )}
                            >
                                <span className="text-white font-medium">{feature.name}</span>
                                <span className="text-gray-500 text-sm">
                                    {feature.user_story_count || 0} stories
                                </span>
                            </button>

                            {selectedFeatureId === feature.id && (
                                <div className="border-t border-gray-800 p-3 space-y-2 bg-gray-950">
                                    {loadingStories ? (
                                        <div className="text-gray-500 text-sm">Loading stories...</div>
                                    ) : userStories.length === 0 ? (
                                        <div className="text-gray-500 text-sm">No user stories</div>
                                    ) : (
                                        userStories.map(story => (
                                            <button
                                                key={story.id}
                                                onClick={() => onSelectUserStory(story.id)}
                                                className={cn(
                                                    "w-full p-2 text-left text-sm rounded",
                                                    selectedUserStoryId === story.id
                                                        ? "bg-blue-500/20 text-blue-300"
                                                        : "text-gray-400 hover:bg-gray-800"
                                                )}
                                            >
                                                {story.narrative.slice(0, 80)}...
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )
            )}
        </div>
    );
}
