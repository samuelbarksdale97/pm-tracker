'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BookOpen,
    Plus,
    Loader2,
    AlertCircle,
    User,
    Shield,
    Briefcase,
    Users,
    Sparkles,
    Package,
    Layers,
    Check,
    X,
    CheckSquare,
    Square,
    Trash2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import {
    Epic,
    Feature,
    UserStory,
    TeamMember,
    createUserStory,
    getFeatures,
    createFeature,
    updateUserStory,
    bulkUpdateUserStories,
    bulkDeleteUserStories,
} from '@/lib/supabase';
import { recordGeneration } from '@/lib/ai-metrics';

// Allowed team members for this project
const ALLOWED_TEAM_MEMBERS = ['Sam', 'Terell', 'Clyde'];

// Type for generated stories from AI
interface GeneratedStory {
    narrative: string;
    persona: 'member' | 'admin' | 'staff' | 'business' | 'guest';
    priority: 'P0' | 'P1' | 'P2';
    acceptance_criteria: string[];
    rationale: string;
}

// Type for consolidation result
interface ConsolidationResult {
    stories_to_create: Array<{
        narrative: string;
        persona: string;
        priority: string;
        acceptance_criteria: string[];
        rationale: string;
        consolidation_info?: {
            merged_with?: string[];
            action: 'create_new' | 'merge_with_existing' | 'skip';
        };
    }>;
    stories_to_merge: Array<{
        generated_narrative: string;
        existing_story_id: string;
        existing_narrative: string;
        merged_narrative: string;
        reason: string;
    }>;
    stories_to_skip: Array<{
        narrative: string;
        duplicate_of: string;
        reason: string;
    }>;
    summary: {
        total_generated: number;
        new_stories: number;
        merges_suggested: number;
        duplicates_found: number;
    };
}

interface UserStoryColumnProps {
    projectId: string;
    userStories: UserStory[];
    selectedEpic: Epic | null;
    selectedFeature: Feature | null;
    selectedUserStoryId: string | null;
    loading: boolean;
    teamMembers?: TeamMember[];
    onSelectUserStory: (storyId: string | null) => void;
    onStoryCreated: () => void;
    onStoryUpdated?: () => void;
}

const personaConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    'member': { icon: <User className="w-3.5 h-3.5" />, label: 'Member', color: 'text-blue-400' },
    'admin': { icon: <Shield className="w-3.5 h-3.5" />, label: 'Admin', color: 'text-purple-400' },
    'staff': { icon: <Briefcase className="w-3.5 h-3.5" />, label: 'Staff', color: 'text-green-400' },
    'business': { icon: <Briefcase className="w-3.5 h-3.5" />, label: 'Business', color: 'text-orange-400' },
    'guest': { icon: <Users className="w-3.5 h-3.5" />, label: 'Guest', color: 'text-gray-400' },
};

const priorityColors: Record<string, string> = {
    'P0': 'bg-red-600 text-white',
    'P1': 'bg-yellow-500 text-black',
    'P2': 'bg-gray-500 text-white',
};

const statusColors: Record<string, string> = {
    'Not Started': 'bg-gray-600',
    'In Progress': 'bg-blue-600',
    'Testing': 'bg-purple-600',
    'Done': 'bg-green-600',
    'Blocked': 'bg-red-600',
    'On Hold': 'bg-yellow-600',
};

export function UserStoryColumn({
    projectId,
    userStories,
    selectedEpic,
    selectedFeature,
    selectedUserStoryId,
    loading,
    teamMembers = [],
    onSelectUserStory,
    onStoryCreated,
    onStoryUpdated,
}: UserStoryColumnProps) {
    // Filter team members to only show allowed ones
    const filteredTeamMembers = teamMembers.filter(m => ALLOWED_TEAM_MEMBERS.includes(m.name));

    // Bulk selection state
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // AI Generation state
    const [showAIGeneration, setShowAIGeneration] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isConsolidating, setIsConsolidating] = useState(false);
    const [generatedStories, setGeneratedStories] = useState<GeneratedStory[]>([]);
    const [selectedStories, setSelectedStories] = useState<Set<number>>(new Set());
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [consolidationResult, setConsolidationResult] = useState<ConsolidationResult | null>(null);
    const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());

    // Clear bulk selection when feature changes
    useEffect(() => {
        setBulkSelectedIds(new Set());
        setBulkMode(false);
    }, [selectedFeature?.id]);

    // Bulk action handlers
    const handleToggleBulkSelect = (storyId: string) => {
        setBulkSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(storyId)) {
                next.delete(storyId);
            } else {
                next.add(storyId);
            }
            return next;
        });
    };

    const handleSelectAllBulk = () => {
        setBulkSelectedIds(new Set(userStories.map(s => s.id)));
    };

    const handleDeselectAllBulk = () => {
        setBulkSelectedIds(new Set());
    };

    const handleBulkStatusChange = async (status: UserStory['status']) => {
        if (bulkSelectedIds.size === 0) return;
        setIsBulkUpdating(true);
        try {
            await bulkUpdateUserStories(Array.from(bulkSelectedIds), { status });
            setBulkSelectedIds(new Set());
            setBulkMode(false);
            onStoryUpdated?.();
        } catch (err) {
            console.error('Error bulk updating status:', err);
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handleBulkPriorityChange = async (priority: UserStory['priority']) => {
        if (bulkSelectedIds.size === 0) return;
        setIsBulkUpdating(true);
        try {
            await bulkUpdateUserStories(Array.from(bulkSelectedIds), { priority });
            setBulkSelectedIds(new Set());
            setBulkMode(false);
            onStoryUpdated?.();
        } catch (err) {
            console.error('Error bulk updating priority:', err);
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handleBulkDelete = async () => {
        if (bulkSelectedIds.size === 0) return;
        setIsBulkUpdating(true);
        try {
            await bulkDeleteUserStories(Array.from(bulkSelectedIds));
            setBulkSelectedIds(new Set());
            setBulkMode(false);
            setShowBulkDeleteConfirm(false);
            onStoryUpdated?.();
        } catch (err) {
            console.error('Error bulk deleting:', err);
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handleAIGenerate = async () => {
        if (!selectedFeature) return;

        setShowAIGeneration(true);
        setIsGenerating(true);
        setGenerationError(null);
        setGeneratedStories([]);
        setSelectedStories(new Set());
        setConsolidationResult(null);
        setSkippedIndices(new Set());

        try {
            const response = await fetch('/api/ai/generate-stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureId: selectedFeature.id }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate stories');
            }

            if (data.success && data.data?.stories) {
                const stories = data.data.stories as GeneratedStory[];
                setGeneratedStories(stories);
                setIsGenerating(false);

                // Run consolidation if there are existing stories
                if (userStories.length > 0 && stories.length > 0) {
                    setIsConsolidating(true);
                    try {
                        const consolidateResponse = await fetch('/api/ai/consolidate-stories', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                featureId: selectedFeature.id,
                                generatedStories: stories,
                            }),
                        });

                        const consolidateData = await consolidateResponse.json();

                        if (consolidateData.success && consolidateData.data) {
                            const result = consolidateData.data as ConsolidationResult;
                            setConsolidationResult(result);

                            // Determine which generated stories should be skipped (are duplicates)
                            const skipSet = new Set<number>();
                            result.stories_to_skip.forEach(skip => {
                                // Find the index of this story in the generated list
                                const idx = stories.findIndex(s =>
                                    s.narrative.toLowerCase() === skip.narrative.toLowerCase() ||
                                    s.narrative.includes(skip.narrative.substring(0, 50)) ||
                                    skip.narrative.includes(s.narrative.substring(0, 50))
                                );
                                if (idx !== -1) {
                                    skipSet.add(idx);
                                }
                            });
                            setSkippedIndices(skipSet);

                            // Select all stories EXCEPT the ones to skip
                            const selectableIndices = new Set(
                                stories.map((_, i) => i).filter(i => !skipSet.has(i))
                            );
                            setSelectedStories(selectableIndices);
                        } else {
                            // Consolidation failed, select all stories by default
                            setSelectedStories(new Set(stories.map((_, i) => i)));
                        }
                    } catch (consolErr) {
                        console.error('Error consolidating stories:', consolErr);
                        // On consolidation error, still allow selecting all stories
                        setSelectedStories(new Set(stories.map((_, i) => i)));
                    } finally {
                        setIsConsolidating(false);
                    }
                } else {
                    // No existing stories, select all by default
                    setSelectedStories(new Set(stories.map((_, i) => i)));
                }
            }
        } catch (err) {
            console.error('Error generating stories:', err);
            setGenerationError(err instanceof Error ? err.message : 'Failed to generate stories');
            setIsGenerating(false);
        }
    };

    const handleToggleStory = (index: number) => {
        setSelectedStories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        // Select all stories except skipped ones (duplicates)
        const selectableIndices = new Set(
            generatedStories.map((_, i) => i).filter(i => !skippedIndices.has(i))
        );
        setSelectedStories(selectableIndices);
    };

    const handleDeselectAll = () => {
        setSelectedStories(new Set());
    };

    const handleSaveSelectedStories = async () => {
        if (!selectedFeature || selectedStories.size === 0) return;

        setIsSaving(true);
        try {
            const storiesToSave = generatedStories.filter((_, i) => selectedStories.has(i));

            for (const story of storiesToSave) {
                await createUserStory({
                    project_id: projectId,
                    epic_id: selectedEpic?.id || null,
                    feature_id: selectedFeature.id,
                    narrative: story.narrative,
                    persona: story.persona,
                    feature_area: selectedFeature.name,
                    priority: story.priority,
                    status: 'Not Started',
                    acceptance_criteria: story.acceptance_criteria,
                    milestone_id: null,
                });
            }

            // Record AI generation metrics
            recordGeneration({
                storiesGenerated: generatedStories.length,
                storiesAccepted: storiesToSave.length,
            });

            setShowAIGeneration(false);
            setGeneratedStories([]);
            setSelectedStories(new Set());
            onStoryCreated();
        } catch (err) {
            console.error('Error saving stories:', err);
            setGenerationError('Failed to save stories');
        } finally {
            setIsSaving(false);
        }
    };

    // Determine header title based on selection
    const getHeaderTitle = () => {
        if (selectedFeature) {
            return (
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-white truncate">{selectedFeature.name}</span>
                </div>
            );
        }
        if (selectedEpic) {
            return (
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white truncate">{selectedEpic.name}</span>
                    <span className="text-xs text-gray-500">All Stories</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-400">User Stories</span>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        {getHeaderTitle()}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 mr-2">
                            {userStories.length}
                        </span>
                        {/* Bulk Mode Toggle */}
                        {userStories.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setBulkMode(!bulkMode);
                                    if (bulkMode) {
                                        setBulkSelectedIds(new Set());
                                    }
                                }}
                                className={cn(
                                    "h-7 px-2",
                                    bulkMode
                                        ? "text-blue-400 bg-blue-500/20"
                                        : "text-gray-400 hover:text-white"
                                )}
                                title="Bulk select mode"
                            >
                                <CheckSquare className="w-4 h-4" />
                            </Button>
                        )}
                        {(selectedEpic || selectedFeature) && !bulkMode && (
                            <CreateStoryDialog
                                projectId={projectId}
                                epicId={selectedEpic?.id || null}
                                featureId={selectedFeature?.id || null}
                                onStoryCreated={onStoryCreated}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Bulk Action Toolbar */}
            {bulkMode && (
                <div className="px-3 py-2 bg-blue-950/30 border-b border-blue-800/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-blue-300 font-medium">
                                {bulkSelectedIds.size} selected
                            </span>
                            {bulkSelectedIds.size < userStories.length ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSelectAllBulk}
                                    className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                                >
                                    Select all
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDeselectAllBulk}
                                    className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                                >
                                    Deselect all
                                </Button>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setBulkMode(false);
                                setBulkSelectedIds(new Set());
                            }}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                            <XCircle className="w-4 h-4" />
                        </Button>
                    </div>

                    {bulkSelectedIds.size > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Status Change */}
                            <Select
                                onValueChange={(v) => handleBulkStatusChange(v as UserStory['status'])}
                                disabled={isBulkUpdating}
                            >
                                <SelectTrigger className="h-7 w-32 bg-gray-800 border-gray-700 text-xs">
                                    <SelectValue placeholder="Set status..." />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                    {USER_STORY_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s} className="text-xs">
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Priority Change */}
                            <Select
                                onValueChange={(v) => handleBulkPriorityChange(v as UserStory['priority'])}
                                disabled={isBulkUpdating}
                            >
                                <SelectTrigger className="h-7 w-24 bg-gray-800 border-gray-700 text-xs">
                                    <SelectValue placeholder="Priority..." />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                    <SelectItem value="P0" className="text-xs">P0</SelectItem>
                                    <SelectItem value="P1" className="text-xs">P1</SelectItem>
                                    <SelectItem value="P2" className="text-xs">P2</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Delete */}
                            {!showBulkDeleteConfirm ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowBulkDeleteConfirm(true)}
                                    disabled={isBulkUpdating}
                                    className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    Delete
                                </Button>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleBulkDelete}
                                        disabled={isBulkUpdating}
                                        className="h-7 px-2 bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {isBulkUpdating ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <>Confirm ({bulkSelectedIds.size})</>
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowBulkDeleteConfirm(false)}
                                        className="h-7 px-2 text-gray-400"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* User Stories List */}
            <div className="flex-1 overflow-y-auto">
                {!selectedEpic && !selectedFeature ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <BookOpen className="w-10 h-10 text-gray-700 mb-3" />
                        <p className="text-sm text-gray-500">Select an Epic or Feature</p>
                        <p className="text-xs text-gray-600 mt-1">to see user stories</p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    </div>
                ) : userStories.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        <p className="text-sm text-gray-500">No user stories yet</p>
                        <p className="text-xs text-gray-600 mt-1">Create one or use AI to generate</p>
                        {selectedFeature && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAIGenerate}
                                disabled={isGenerating}
                                className="mt-4 gap-1 text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                )}
                                {isGenerating ? 'Generating...' : 'AI Generate'}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="py-1">
                        {userStories.map(story => (
                            <UserStoryCard
                                key={story.id}
                                story={story}
                                isSelected={selectedUserStoryId === story.id}
                                teamMembers={filteredTeamMembers}
                                bulkMode={bulkMode}
                                bulkSelected={bulkSelectedIds.has(story.id)}
                                onBulkToggle={() => handleToggleBulkSelect(story.id)}
                                onSelect={() => onSelectUserStory(story.id)}
                                onUpdated={() => onStoryUpdated?.()}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* AI Generation Dialog */}
            <Dialog open={showAIGeneration} onOpenChange={setShowAIGeneration}>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-white text-xl flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            Generate User Stories
                        </DialogTitle>
                    </DialogHeader>

                    {selectedFeature && (
                        <div className="space-y-4 mt-4">
                            {/* Feature Context */}
                            <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-medium text-blue-300">Feature</span>
                                </div>
                                <p className="text-white font-medium">{selectedFeature.name}</p>
                                {selectedFeature.description && (
                                    <p className="text-sm text-gray-400 mt-1">{selectedFeature.description}</p>
                                )}
                            </div>

                            {/* Loading State */}
                            {isGenerating && (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                                    <p className="text-gray-400">Generating user stories with AI...</p>
                                    <p className="text-sm text-gray-500">This may take 10-15 seconds</p>
                                </div>
                            )}

                            {/* Consolidating State */}
                            {isConsolidating && !isGenerating && (
                                <div className="flex flex-col items-center justify-center py-8 gap-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                    <p className="text-gray-400">Checking for duplicate stories...</p>
                                </div>
                            )}

                            {/* Error State */}
                            {generationError && (
                                <div className="flex items-center gap-2 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p>{generationError}</p>
                                </div>
                            )}

                            {/* Consolidation Warning */}
                            {consolidationResult && (consolidationResult.stories_to_skip.length > 0 || consolidationResult.stories_to_merge.length > 0) && (
                                <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="w-4 h-4 text-amber-400" />
                                        <span className="text-sm font-medium text-amber-300">Duplicate Detection</span>
                                    </div>
                                    <p className="text-sm text-amber-200 mb-2">
                                        Found {consolidationResult.summary.duplicates_found} duplicate{consolidationResult.summary.duplicates_found !== 1 ? 's' : ''}
                                        {consolidationResult.summary.merges_suggested > 0 && ` and ${consolidationResult.summary.merges_suggested} merge suggestion${consolidationResult.summary.merges_suggested !== 1 ? 's' : ''}`}.
                                        Duplicate stories have been auto-deselected.
                                    </p>

                                    {/* Stories to skip */}
                                    {consolidationResult.stories_to_skip.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-amber-400 mb-2 font-medium">Duplicates (deselected):</p>
                                            <ul className="space-y-1.5">
                                                {consolidationResult.stories_to_skip.map((skip, i) => (
                                                    <li key={i} className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                                                        <span className="text-amber-400 line-through">{skip.narrative.slice(0, 80)}...</span>
                                                        <br />
                                                        <span className="text-gray-500 italic">Duplicate of: {skip.duplicate_of}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Stories to merge */}
                                    {consolidationResult.stories_to_merge.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs text-blue-400 mb-2 font-medium">Merge Suggestions:</p>
                                            <ul className="space-y-1.5">
                                                {consolidationResult.stories_to_merge.map((merge, i) => (
                                                    <li key={i} className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                                                        <span className="text-blue-300">{merge.generated_narrative.slice(0, 60)}...</span>
                                                        <br />
                                                        <span className="text-gray-500 italic">Could merge with existing: {merge.existing_narrative.slice(0, 60)}...</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Generated Stories */}
                            {!isGenerating && !isConsolidating && generatedStories.length > 0 && (
                                <>
                                    {/* Selection Controls */}
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-400">
                                            {selectedStories.size} of {generatedStories.length} stories selected
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleSelectAll}
                                                className="text-xs text-gray-400"
                                            >
                                                Select All
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleDeselectAll}
                                                className="text-xs text-gray-400"
                                            >
                                                Deselect All
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Stories List */}
                                    <div className="space-y-3">
                                        {generatedStories.map((story, index) => {
                                            const isSelected = selectedStories.has(index);
                                            const isSkipped = skippedIndices.has(index);
                                            const persona = personaConfig[story.persona] || personaConfig['member'];

                                            return (
                                                <div
                                                    key={index}
                                                    onClick={() => handleToggleStory(index)}
                                                    className={cn(
                                                        "p-4 rounded-lg border cursor-pointer transition-all relative",
                                                        isSkipped
                                                            ? "bg-amber-950/20 border-amber-700/50 opacity-60"
                                                            : isSelected
                                                                ? "bg-purple-900/30 border-purple-500"
                                                                : "bg-gray-800 border-gray-700 hover:border-gray-600"
                                                    )}
                                                >
                                                    {/* Duplicate Badge */}
                                                    {isSkipped && (
                                                        <div className="absolute top-2 right-2">
                                                            <Badge className="bg-amber-600/80 text-amber-100 text-[10px]">
                                                                Duplicate
                                                            </Badge>
                                                        </div>
                                                    )}

                                                    <div className="flex items-start gap-3">
                                                        {/* Checkbox */}
                                                        <div className={cn(
                                                            "w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors",
                                                            isSkipped
                                                                ? "border-amber-600/50 bg-transparent"
                                                                : isSelected
                                                                    ? "bg-purple-600 border-purple-600"
                                                                    : "border-gray-600"
                                                        )}>
                                                            {isSelected && !isSkipped && <Check className="w-3 h-3 text-white" />}
                                                            {isSkipped && <X className="w-3 h-3 text-amber-500" />}
                                                        </div>

                                                        {/* Story Content */}
                                                        <div className="flex-1 space-y-2">
                                                            {/* Header */}
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <div className={cn("flex items-center gap-1", isSkipped ? "text-gray-500" : persona.color)}>
                                                                    {persona.icon}
                                                                    <span className="text-xs font-medium">{persona.label}</span>
                                                                </div>
                                                                <Badge className={cn("text-[10px]", isSkipped ? "bg-gray-600 text-gray-400" : priorityColors[story.priority])}>
                                                                    {story.priority}
                                                                </Badge>
                                                            </div>

                                                            {/* Narrative */}
                                                            <p className={cn("text-sm", isSkipped ? "text-gray-500 line-through" : "text-white")}>
                                                                {story.narrative}
                                                            </p>

                                                            {/* Rationale */}
                                                            {story.rationale && !isSkipped && (
                                                                <p className="text-xs text-gray-500 italic">{story.rationale}</p>
                                                            )}

                                                            {/* Acceptance Criteria */}
                                                            {story.acceptance_criteria && story.acceptance_criteria.length > 0 && !isSkipped && (
                                                                <div className="mt-2">
                                                                    <p className="text-xs text-gray-500 mb-1">Acceptance Criteria:</p>
                                                                    <ul className="text-xs text-gray-400 space-y-0.5">
                                                                        {story.acceptance_criteria.slice(0, 3).map((ac, i) => (
                                                                            <li key={i} className="flex items-start gap-1">
                                                                                <span className="text-green-500">✓</span>
                                                                                {ac}
                                                                            </li>
                                                                        ))}
                                                                        {story.acceptance_criteria.length > 3 && (
                                                                            <li className="text-gray-500">
                                                                                +{story.acceptance_criteria.length - 3} more...
                                                                            </li>
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    {!isGenerating && !isConsolidating && generatedStories.length > 0 && (
                        <DialogFooter className="mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowAIGeneration(false)}
                                className="border-gray-700"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveSelectedStories}
                                disabled={selectedStories.size === 0 || isSaving}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Save {selectedStories.size} {selectedStories.size === 1 ? 'Story' : 'Stories'}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

const USER_STORY_STATUSES: UserStory['status'][] = ['Not Started', 'In Progress', 'Testing', 'Done', 'Blocked'];

// User Story Card
function UserStoryCard({
    story,
    isSelected,
    teamMembers,
    bulkMode = false,
    bulkSelected = false,
    onBulkToggle,
    onSelect,
    onUpdated,
}: {
    story: UserStory;
    isSelected: boolean;
    teamMembers: TeamMember[];
    bulkMode?: boolean;
    bulkSelected?: boolean;
    onBulkToggle?: () => void;
    onSelect: () => void;
    onUpdated: () => void;
}) {
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
    const persona = personaConfig[story.persona] || personaConfig['member'];

    const handleStatusChange = async (newStatus: UserStory['status']) => {
        if (newStatus === story.status) return;
        setIsUpdatingStatus(true);
        try {
            await updateUserStory(story.id, { status: newStatus });
            onUpdated();
        } catch (err) {
            console.error('Error updating status:', err);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleAssigneeChange = async (ownerId: string | null) => {
        if (ownerId === story.owner_id) return;
        setIsUpdatingAssignee(true);
        try {
            await updateUserStory(story.id, { owner_id: ownerId });
            onUpdated();
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

    const handleCardClick = (e: React.MouseEvent) => {
        // In bulk mode, clicking the card toggles selection
        if (bulkMode) {
            onBulkToggle?.();
            return;
        }
        // Check if the click originated from within the dropdowns panel
        const target = e.target as HTMLElement;
        const isDropdownClick = target.closest('[data-dropdown-panel]');
        if (!isDropdownClick) {
            onSelect();
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className={cn(
                "px-3 py-2.5 cursor-pointer border-l-2 transition-colors group",
                bulkMode && bulkSelected
                    ? "bg-blue-500/20 border-blue-500"
                    : isSelected
                        ? "bg-blue-500/15 border-blue-500"
                        : "hover:bg-gray-800/50 border-transparent"
            )}
        >
            {/* Header with persona and priority */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {/* Bulk Selection Checkbox */}
                    {bulkMode && (
                        <div
                            className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                bulkSelected
                                    ? "bg-blue-500 border-blue-500"
                                    : "border-gray-500 hover:border-blue-400"
                            )}
                        >
                            {bulkSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                    )}
                    <div className={cn("flex items-center gap-1.5", persona.color)}>
                        {persona.icon}
                        <span className="text-xs font-medium">{persona.label}</span>
                    </div>
                </div>
                <Badge className={cn("text-[10px] px-1.5 py-0", priorityColors[story.priority])}>
                    {story.priority}
                </Badge>
            </div>

            {/* Status and Assignee Row */}
            <div
                data-dropdown-panel
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-3 mb-2 p-2 bg-gray-800/30 rounded-md border border-gray-700/50"
            >
                {/* Status Dropdown */}
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Status</div>
                    <Select
                        value={story.status}
                        onValueChange={(v) => handleStatusChange(v as UserStory['status'])}
                        disabled={isUpdatingStatus}
                    >
                        <SelectTrigger
                            className={cn(
                                "h-7 w-full px-2 text-[11px] font-medium border-0 rounded",
                                "bg-gray-700/50 hover:bg-gray-700 focus:ring-1 focus:ring-blue-500"
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", statusColors[story.status])} />
                                <span className="truncate text-white">
                                    {isUpdatingStatus ? 'Saving...' : story.status}
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-gray-900 border-gray-700 min-w-[140px] z-[100]">
                            {USER_STORY_STATUSES.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs py-2 cursor-pointer">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("w-2 h-2 rounded-full", statusColors[s])} />
                                        <span className="text-white">{s}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Assignee Dropdown */}
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Assigned To</div>
                    <Select
                        value={story.owner_id || 'unassigned'}
                        onValueChange={(v) => handleAssigneeChange(v === 'unassigned' ? null : v)}
                        disabled={isUpdatingAssignee}
                    >
                        <SelectTrigger
                            className={cn(
                                "h-7 w-full px-2 text-[11px] font-medium border-0 rounded",
                                "bg-gray-700/50 hover:bg-gray-700 focus:ring-1 focus:ring-blue-500"
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="truncate text-white">
                                    {isUpdatingAssignee ? 'Saving...' : getAssigneeName(story.owner_id)}
                                </span>
                            </div>
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-gray-900 border-gray-700 min-w-[140px] z-[100]">
                            <SelectItem value="unassigned" className="text-xs py-2 cursor-pointer">
                                <span className="text-gray-400">Unassigned</span>
                            </SelectItem>
                            {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id} className="text-xs py-2 cursor-pointer">
                                    <span className="text-white">{member.name}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Narrative */}
            <p className={cn(
                "text-sm leading-snug line-clamp-2",
                isSelected ? "text-white" : "text-gray-300"
            )}>
                {story.narrative}
            </p>


            {/* Acceptance criteria count */}
            {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
                <div className="mt-1.5 text-[10px] text-gray-600">
                    {story.acceptance_criteria.length} acceptance criteria
                </div>
            )}
        </div>
    );
}

// Create Story Dialog
function CreateStoryDialog({
    projectId,
    epicId,
    featureId,
    onStoryCreated,
}: {
    projectId: string;
    epicId: string | null;
    featureId: string | null;
    onStoryCreated: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [narrative, setNarrative] = useState('');
    const [persona, setPersona] = useState<UserStory['persona']>('member');
    const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');

    // Feature selection state
    const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);
    const [loadingFeatures, setLoadingFeatures] = useState(false);
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(featureId);

    // Create new feature state
    const [isCreatingNewFeature, setIsCreatingNewFeature] = useState(false);
    const [newFeatureName, setNewFeatureName] = useState('');
    const [isCreatingFeature, setIsCreatingFeature] = useState(false);

    // Load features when epic is provided and dialog opens
    const loadFeatures = async () => {
        if (!epicId) return;
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

    // Reset selectedFeatureId when featureId prop changes
    useEffect(() => {
        setSelectedFeatureId(featureId);
    }, [featureId]);

    // Load features when dialog opens
    useEffect(() => {
        if (open && epicId) {
            loadFeatures();
        }
    }, [open, epicId]);

    const resetForm = () => {
        setNarrative('');
        setPersona('member');
        setPriority('P1');
        setSelectedFeatureId(featureId);
        setIsCreatingNewFeature(false);
        setNewFeatureName('');
        setError(null);
    };

    const handleCreateNewFeature = async () => {
        if (!epicId || !newFeatureName.trim()) return;

        setIsCreatingFeature(true);
        try {
            const newFeature = await createFeature({
                project_id: projectId,
                epic_id: epicId,
                name: newFeatureName.trim(),
                priority: 'P1',
            });
            setAvailableFeatures(prev => [...prev, newFeature]);
            setSelectedFeatureId(newFeature.id);
            setIsCreatingNewFeature(false);
            setNewFeatureName('');
        } catch (err) {
            console.error('Error creating feature:', err);
            setError('Failed to create new feature');
        } finally {
            setIsCreatingFeature(false);
        }
    };

    const handleSubmit = async () => {
        if (!narrative.trim()) {
            setError('Narrative is required');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        // Get feature name for feature_area field
        const selectedFeature = availableFeatures.find(f => f.id === selectedFeatureId);
        const featureArea = selectedFeature?.name || 'general';

        try {
            await createUserStory({
                project_id: projectId,
                epic_id: epicId,
                feature_id: selectedFeatureId,
                narrative: narrative.trim(),
                persona,
                feature_area: featureArea,
                priority,
                status: 'Not Started',
                acceptance_criteria: null,
                milestone_id: null,
            });

            resetForm();
            setOpen(false);
            onStoryCreated();
        } catch (err) {
            console.error('Error creating story:', err);
            setError('Failed to create story');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                        Create User Story
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm text-gray-300">
                            Narrative <span className="text-red-400">*</span>
                        </label>
                        <Textarea
                            value={narrative}
                            onChange={(e) => setNarrative(e.target.value)}
                            placeholder="As a [persona], I want to [action] so that [benefit]..."
                            className="bg-gray-800 border-gray-700"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-300">Persona</label>
                            <Select value={persona} onValueChange={(v) => setPersona(v as UserStory['persona'])}>
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

                        <div className="space-y-2">
                            <label className="text-sm text-gray-300">Priority</label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as 'P0' | 'P1' | 'P2')}>
                                <SelectTrigger className="bg-gray-800 border-gray-700">
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

                    {/* Feature Selector */}
                    {epicId && (
                        <div className="space-y-2">
                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                <Package className="w-4 h-4 text-indigo-400" />
                                Feature
                            </label>

                            {isCreatingNewFeature ? (
                                <div className="flex gap-2">
                                    <Input
                                        value={newFeatureName}
                                        onChange={(e) => setNewFeatureName(e.target.value)}
                                        placeholder="New feature name..."
                                        className="bg-gray-800 border-gray-700 flex-1"
                                        autoFocus
                                    />
                                    <Button
                                        size="sm"
                                        onClick={handleCreateNewFeature}
                                        disabled={!newFeatureName.trim() || isCreatingFeature}
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {isCreatingFeature ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            'Add'
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setIsCreatingNewFeature(false);
                                            setNewFeatureName('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <Select
                                    value={selectedFeatureId || 'none'}
                                    onValueChange={(v) => {
                                        if (v === 'create_new') {
                                            setIsCreatingNewFeature(true);
                                        } else {
                                            setSelectedFeatureId(v === 'none' ? null : v);
                                        }
                                    }}
                                    disabled={loadingFeatures}
                                >
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue placeholder={loadingFeatures ? 'Loading...' : 'Select a feature...'} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-700">
                                        <SelectItem value="none">
                                            <span className="text-gray-400">No feature (unassigned)</span>
                                        </SelectItem>
                                        {availableFeatures.map((f) => (
                                            <SelectItem key={f.id} value={f.id}>
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-3 h-3 text-indigo-400" />
                                                    {f.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="create_new" className="text-indigo-400 border-t border-gray-700 mt-1 pt-1">
                                            <div className="flex items-center gap-2">
                                                <Plus className="w-3 h-3" />
                                                Create New Feature
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                            <p className="text-xs text-gray-500">
                                Assign this story to a feature for better organization.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!narrative.trim() || isSubmitting}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Story
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
