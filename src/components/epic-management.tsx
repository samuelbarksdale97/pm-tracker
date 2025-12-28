'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Plus,
    Loader2,
    Layers,
    Target,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Edit2,
    Trash2,
    X,
    CheckCircle,
    AlertCircle,
    Link2,
    Check,
    Sparkles,
    Package,
    MoveHorizontal,
    Wand2,
    AlertTriangle,
    MoreHorizontal,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Epic,
    UserStory,
    Feature,
    createEpic,
    updateEpic,
    deleteEpic,
    getEpicsWithCounts,
    getUserStoriesForEpic,
    getUnassignedUserStories,
    assignUserStoryToEpic,
    bulkAssignStoriesToEpic,
    // Feature CRUD
    getFeaturesWithCounts,
    createFeature,
    updateFeature,
    deleteFeature,
    getUserStoriesForFeature,
    getUnassignedStoriesForEpic,
    assignUserStoryToFeature,
    bulkCreateUserStories,
    moveFeature,
    bulkMoveStoriesToFeature,
} from '@/lib/supabase';
import { GeneratedStory } from '@/lib/ai/story-generator';
import { GeneratedFeature } from '@/lib/ai/feature-generator';
import { CoverageAnalysisResult, FeatureCoverage } from '@/lib/ai/coverage-analyzer';
import { BulkConsolidationResult } from '@/lib/ai/story-consolidator';

interface EpicManagementProps {
    projectId: string;
    onEpicCreated?: (epic: Epic) => void;
    onEpicUpdated?: (epic: Epic) => void;
    onEpicDeleted?: (epicId: string) => void;
}

const FEATURE_AREAS = [
    'auth',
    'events',
    'reservations',
    'analytics',
    'communications',
    'member_management',
    'billing',
    'integrations',
    'settings',
    'other',
];

const PRIORITIES = [
    { value: 'P0', label: 'P0 - Critical', color: 'bg-red-600' },
    { value: 'P1', label: 'P1 - High', color: 'bg-yellow-500' },
    { value: 'P2', label: 'P2 - Normal', color: 'bg-gray-500' },
];

const STATUSES = [
    { value: 'Not Started', color: 'bg-gray-500' },
    { value: 'In Progress', color: 'bg-blue-500' },
    { value: 'Done', color: 'bg-green-500' },
    { value: 'On Hold', color: 'bg-yellow-500' },
];

// Feature Area Grouping Types and Helpers
interface FeatureAreaGroup {
    featureArea: string;
    displayName: string;
    stories: UserStory[];
    completedCount: number;
    totalCount: number;
    progressPercent: number;
}

function formatFeatureAreaName(area: string): string {
    if (area === 'other') return 'Other';
    return area
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function groupStoriesByFeatureArea(stories: UserStory[]): FeatureAreaGroup[] {
    // Group stories by their feature_area
    const groupMap = new Map<string, UserStory[]>();

    stories.forEach(story => {
        const area = story.feature_area || 'other';
        if (!groupMap.has(area)) {
            groupMap.set(area, []);
        }
        groupMap.get(area)!.push(story);
    });

    // Build result array with progress calculations
    const result: FeatureAreaGroup[] = [];

    groupMap.forEach((groupStories, featureArea) => {
        const completedCount = groupStories.filter(s => s.status === 'Done').length;
        result.push({
            featureArea,
            displayName: formatFeatureAreaName(featureArea),
            stories: groupStories,
            completedCount,
            totalCount: groupStories.length,
            progressPercent: groupStories.length > 0
                ? Math.round((completedCount / groupStories.length) * 100)
                : 0
        });
    });

    // Sort: known feature areas first (by FEATURE_AREAS order), then "other" last
    return result.sort((a, b) => {
        const aIndex = FEATURE_AREAS.indexOf(a.featureArea);
        const bIndex = FEATURE_AREAS.indexOf(b.featureArea);

        // Both in FEATURE_AREAS: sort by order
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        // Only a in FEATURE_AREAS: a comes first
        if (aIndex !== -1) return -1;
        // Only b in FEATURE_AREAS: b comes first
        if (bIndex !== -1) return 1;
        // Neither in FEATURE_AREAS: sort alphabetically
        return a.displayName.localeCompare(b.displayName);
    });
}

// Create Epic Dialog
export function CreateEpicDialog({
    projectId,
    onEpicCreated,
}: {
    projectId: string;
    onEpicCreated?: (epic: Epic) => void;
}) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [businessObjectives, setBusinessObjectives] = useState('');
    const [userValue, setUserValue] = useState('');
    const [technicalContext, setTechnicalContext] = useState('');
    const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');

    const resetForm = () => {
        setName('');
        setDescription('');
        setBusinessObjectives('');
        setUserValue('');
        setTechnicalContext('');
        setPriority('P1');
        setError(null);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Epic name is required');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const epic = await createEpic({
                project_id: projectId,
                name: name.trim(),
                description: description.trim() || null,
                feature_areas: [], // Features are now created separately via AI or manual
                business_objectives: businessObjectives.trim()
                    ? businessObjectives.split('\n').filter(line => line.trim())
                    : null,
                user_value: userValue.trim() || null,
                technical_context: technicalContext.trim() || null,
                priority,
            });

            resetForm();
            setOpen(false);
            onEpicCreated?.(epic);
        } catch (err) {
            console.error('Error creating epic:', err);
            setError('Failed to create epic. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                    <Layers className="w-4 h-4" />
                    Create Epic
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-400" />
                        Create Epic
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Epic Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Epic Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Member Authentication & Onboarding"
                            className="bg-gray-800 border-gray-700"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Description
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="High-level description of what this epic achieves..."
                            className="bg-gray-800 border-gray-700 min-h-[80px]"
                        />
                    </div>

                    {/* User Value */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            User Value
                        </label>
                        <Textarea
                            value={userValue}
                            onChange={(e) => setUserValue(e.target.value)}
                            placeholder="What value does this epic deliver to users? e.g., 'Members can securely access their accounts and manage their profiles'"
                            className="bg-gray-800 border-gray-700 min-h-[60px]"
                        />
                    </div>

                    {/* Business Objectives */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Business Objectives
                        </label>
                        <Textarea
                            value={businessObjectives}
                            onChange={(e) => setBusinessObjectives(e.target.value)}
                            placeholder="One objective per line:&#10;- Reduce support tickets by 30%&#10;- Increase member retention"
                            className="bg-gray-800 border-gray-700 min-h-[80px]"
                        />
                    </div>

                    {/* Technical Context */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Technical Context
                        </label>
                        <Textarea
                            value={technicalContext}
                            onChange={(e) => setTechnicalContext(e.target.value)}
                            placeholder="Architecture notes, constraints, patterns to follow... e.g., 'Use Supabase Auth, implement MFA with TOTP'"
                            className="bg-gray-800 border-gray-700 min-h-[80px]"
                        />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Priority</label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as 'P0' | 'P1' | 'P2')}>
                            <SelectTrigger className="bg-gray-800 border-gray-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITIES.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${p.color}`} />
                                            {p.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!name.trim() || isSubmitting}
                            className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Epic
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Epic Card Component
function EpicCard({
    epic,
    onClick,
}: {
    epic: Epic;
    onClick: () => void;
}) {
    const priorityColor = PRIORITIES.find(p => p.value === epic.priority)?.color || 'bg-gray-500';
    const statusColor = STATUSES.find(s => s.value === epic.status)?.color || 'bg-gray-500';
    const progress = epic.user_story_count && epic.user_story_count > 0
        ? Math.round(((epic.completed_story_count || 0) / epic.user_story_count) * 100)
        : 0;

    return (
        <div
            onClick={onClick}
            className="relative bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500/50 cursor-pointer transition-all group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {epic.name}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className={priorityColor}>{epic.priority}</Badge>
                    <Badge className={statusColor}>{epic.status}</Badge>
                </div>
            </div>

            {epic.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {epic.description}
                </p>
            )}

            {epic.feature_areas.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {epic.feature_areas.map((area) => (
                        <span
                            key={area}
                            className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded"
                        >
                            {area.replace('_', ' ')}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-gray-400">
                    <span>{epic.user_story_count || 0} stories</span>
                    <span>{epic.completed_story_count || 0} done</span>
                </div>
                {epic.user_story_count && epic.user_story_count > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500 transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-gray-400 text-xs">{progress}%</span>
                    </div>
                )}
            </div>

            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100" />
        </div>
    );
}

// Feature Area Section Component (collapsible section for grouped stories)
function FeatureAreaSection({
    group,
    isExpanded,
    onToggle,
    onUserStoryClick,
    onUnassignStory,
}: {
    group: FeatureAreaGroup;
    isExpanded: boolean;
    onToggle: () => void;
    onUserStoryClick?: (story: UserStory) => void;
    onUnassignStory: (storyId: string) => void;
}) {
    const statusColor = group.progressPercent === 100
        ? 'bg-green-500'
        : group.progressPercent > 0
            ? 'bg-blue-500'
            : 'bg-gray-600';

    return (
        <div className="border-b border-gray-700/50 last:border-0">
            {/* Collapsible Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 transition-colors text-left"
            >
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}

                <span className="font-medium text-white flex-1">
                    {group.displayName}
                </span>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${statusColor} transition-all`}
                            style={{ width: `${group.progressPercent}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">
                        {group.completedCount}/{group.totalCount} done
                    </span>
                </div>
            </button>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                    {group.stories.map((story) => (
                        <div
                            key={story.id}
                            className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group/story"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p
                                    onClick={() => onUserStoryClick?.(story)}
                                    className="text-white text-sm flex-1 cursor-pointer hover:text-purple-300"
                                >
                                    {story.narrative}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        className={
                                            story.status === 'Done'
                                                ? 'bg-green-500'
                                                : story.status === 'In Progress'
                                                    ? 'bg-blue-500'
                                                    : story.status === 'Blocked'
                                                        ? 'bg-red-500'
                                                        : 'bg-gray-500'
                                        }
                                    >
                                        {story.status}
                                    </Badge>
                                    <button
                                        onClick={() => onUnassignStory(story.id)}
                                        className="opacity-0 group-hover/story:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                                        title="Remove from epic"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <span className="capitalize">{story.persona}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Feature Card Component (collapsible feature with stories and AI generation)
function FeatureCard({
    feature,
    isExpanded,
    onToggle,
    onUserStoryClick,
    onUnassignStory,
    onGenerateStories,
    onEditFeature,
    onDeleteFeature,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
    isGenerating,
    // Bulk move props
    bulkMoveMode,
    selectedStoriesForMove,
    onToggleStoryForMove,
}: {
    feature: Feature & { stories: UserStory[] };
    isExpanded: boolean;
    onToggle: () => void;
    onUserStoryClick?: (story: UserStory) => void;
    onUnassignStory: (storyId: string) => void;
    onGenerateStories: (featureId: string) => void;
    onEditFeature: (feature: Feature) => void;
    onDeleteFeature: (featureId: string) => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isFirst?: boolean;
    isLast?: boolean;
    isGenerating?: boolean;
    // Bulk move props
    bulkMoveMode?: boolean;
    selectedStoriesForMove?: Set<string>;
    onToggleStoryForMove?: (storyId: string) => void;
}) {
    const progress = feature.stories.length > 0
        ? Math.round((feature.stories.filter(s => s.status === 'Done').length / feature.stories.length) * 100)
        : 0;
    const completedCount = feature.stories.filter(s => s.status === 'Done').length;

    const statusColor = progress === 100
        ? 'bg-green-500'
        : progress > 0
            ? 'bg-blue-500'
            : 'bg-gray-600';

    return (
        <div className="border-b border-gray-700/50 last:border-0">
            {/* Collapsible Header */}
            <div className="flex items-center gap-2 p-3 hover:bg-gray-800/50 transition-colors">
                <button
                    onClick={onToggle}
                    className="flex items-center gap-3 flex-1 text-left"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <Package className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="font-medium text-white flex-1">
                        {feature.name}
                    </span>
                </button>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${statusColor} transition-all`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right">
                        {completedCount}/{feature.stories.length}
                    </span>
                </div>

                {/* Primary Action: Generate Stories with AI */}
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                        e.stopPropagation();
                        onGenerateStories(feature.id);
                    }}
                    disabled={isGenerating}
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 gap-1"
                    title="Generate user stories with AI"
                >
                    {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs hidden sm:inline">AI</span>
                        </>
                    )}
                </Button>

                {/* Secondary Actions: Contextual Dropdown Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 h-7 w-7"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-700">
                        <DropdownMenuItem
                            onClick={() => onEditFeature(feature)}
                            className="text-gray-300 focus:text-white focus:bg-gray-800"
                        >
                            <Edit2 className="w-4 h-4 mr-2 text-indigo-400" />
                            Edit Feature
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem
                            onClick={() => onMoveUp?.()}
                            disabled={isFirst}
                            className="text-gray-300 focus:text-white focus:bg-gray-800"
                        >
                            <ArrowUp className="w-4 h-4 mr-2" />
                            Move Up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onMoveDown?.()}
                            disabled={isLast}
                            className="text-gray-300 focus:text-white focus:bg-gray-800"
                        >
                            <ArrowDown className="w-4 h-4 mr-2" />
                            Move Down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem
                            onClick={() => onDeleteFeature(feature.id)}
                            className="text-red-400 focus:text-red-300 focus:bg-red-900/20"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Feature
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Feature Description (if has one) */}
            {isExpanded && feature.description && (
                <div className="px-10 pb-2">
                    <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
            )}

            {/* Collapsible Content - User Stories */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                    {feature.stories.length === 0 ? (
                        <p className="text-sm text-gray-500 italic pl-7 py-2">
                            No user stories yet. Click <Sparkles className="w-3 h-3 inline" /> to generate some.
                        </p>
                    ) : (
                        feature.stories.map((story) => {
                            const isSelected = bulkMoveMode && selectedStoriesForMove?.has(story.id);
                            return (
                                <div
                                    key={story.id}
                                    onClick={bulkMoveMode ? () => onToggleStoryForMove?.(story.id) : undefined}
                                    className={`p-3 rounded-lg transition-colors group/story ml-7 ${
                                        bulkMoveMode
                                            ? isSelected
                                                ? 'bg-orange-900/40 border border-orange-500 cursor-pointer'
                                                : 'bg-gray-800 border border-transparent hover:border-orange-500/50 cursor-pointer'
                                            : 'bg-gray-800 hover:bg-gray-700'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        {/* Checkbox in bulk move mode */}
                                        {bulkMoveMode && (
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${
                                                isSelected
                                                    ? 'bg-orange-600 border-orange-600'
                                                    : 'border-gray-600'
                                            }`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                        )}
                                        <p
                                            onClick={bulkMoveMode ? undefined : () => onUserStoryClick?.(story)}
                                            className={`text-sm flex-1 ${
                                                bulkMoveMode
                                                    ? 'text-white'
                                                    : 'text-white cursor-pointer hover:text-purple-300'
                                            }`}
                                        >
                                            {story.narrative}
                                        </p>
                                        {!bulkMoveMode && (
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    className={
                                                        story.status === 'Done'
                                                            ? 'bg-green-500'
                                                            : story.status === 'In Progress'
                                                                ? 'bg-blue-500'
                                                                : story.status === 'Blocked'
                                                                    ? 'bg-red-500'
                                                                    : 'bg-gray-500'
                                                    }
                                                >
                                                    {story.status}
                                                </Badge>
                                                <button
                                                    onClick={() => onUnassignStory(story.id)}
                                                    className="opacity-0 group-hover/story:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                                                    title="Remove from feature"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {!bulkMoveMode && (
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                            <span className="capitalize">{story.persona}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

// Create Feature Dialog
function CreateFeatureDialog({
    projectId,
    epicId,
    open,
    onOpenChange,
    onFeatureCreated,
}: {
    projectId: string;
    epicId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFeatureCreated: (feature: Feature) => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setName('');
        setDescription('');
        setPriority('P1');
        setError(null);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setError('Feature name is required');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const feature = await createFeature({
                project_id: projectId,
                epic_id: epicId,
                name: name.trim(),
                description: description.trim() || null,
                priority,
            });

            resetForm();
            onOpenChange(false);
            onFeatureCreated(feature);
        } catch (err) {
            console.error('Error creating feature:', err);
            setError('Failed to create feature. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white text-lg flex items-center gap-2">
                        <Package className="w-5 h-5 text-indigo-400" />
                        Create Feature
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Feature Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Feature Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Table Reservations"
                            className="bg-gray-800 border-gray-700"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Description
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What this feature enables for users..."
                            className="bg-gray-800 border-gray-700 min-h-[80px]"
                        />
                        <p className="text-xs text-gray-500">
                            This description helps AI generate relevant user stories.
                        </p>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Priority</label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as 'P0' | 'P1' | 'P2')}>
                            <SelectTrigger className="bg-gray-800 border-gray-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITIES.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${p.color}`} />
                                            {p.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!name.trim() || isSubmitting}
                            className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Feature
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Edit Feature Dialog
function EditFeatureDialog({
    feature,
    open,
    onOpenChange,
    onFeatureUpdated,
}: {
    feature: Feature | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFeatureUpdated: (feature: Feature) => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
    const [status, setStatus] = useState<Feature['status']>('Not Started');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form when feature changes
    useEffect(() => {
        if (feature) {
            setName(feature.name);
            setDescription(feature.description || '');
            setPriority(feature.priority);
            setStatus(feature.status);
            setError(null);
        }
    }, [feature]);

    const handleSubmit = async () => {
        if (!feature) return;
        if (!name.trim()) {
            setError('Feature name is required');
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const updated = await updateFeature(feature.id, {
                name: name.trim(),
                description: description.trim() || null,
                priority,
                status,
            });

            onOpenChange(false);
            onFeatureUpdated(updated);
        } catch (err) {
            console.error('Error updating feature:', err);
            setError('Failed to update feature. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!feature) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white text-lg flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-indigo-400" />
                        Edit Feature
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Feature Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Feature Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Table Reservations"
                            className="bg-gray-800 border-gray-700"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Description
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What this feature enables for users..."
                            className="bg-gray-800 border-gray-700 min-h-[80px]"
                        />
                    </div>

                    {/* Priority and Status in a row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Priority */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Priority</label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as 'P0' | 'P1' | 'P2')}>
                                <SelectTrigger className="bg-gray-800 border-gray-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${p.color}`} />
                                                {p.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Status</label>
                            <Select value={status} onValueChange={(v) => setStatus(v as Feature['status'])}>
                                <SelectTrigger className="bg-gray-800 border-gray-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                                                {s.value}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!name.trim() || isSubmitting}
                            className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Feature with stories type for UI
type FeatureWithStories = Feature & { stories: UserStory[] };

// Epic Detail Sheet
export function EpicDetailSheet({
    epic,
    open,
    onOpenChange,
    onEpicUpdated,
    onEpicDeleted,
    onUserStoryClick,
}: {
    epic: Epic | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEpicUpdated?: (epic: Epic) => void;
    onEpicDeleted?: (epicId: string) => void;
    onUserStoryClick?: (userStory: UserStory) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Features state (replaces old feature_area grouping)
    const [features, setFeatures] = useState<FeatureWithStories[]>([]);
    const [unassignedStories, setUnassignedStories] = useState<UserStory[]>([]);
    const [loadingFeatures, setLoadingFeatures] = useState(false);

    // Create feature dialog
    const [showCreateFeature, setShowCreateFeature] = useState(false);

    // Edit feature dialog
    const [showEditFeature, setShowEditFeature] = useState(false);
    const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

    // Unassigned stories for linking to epic (stories not in any epic)
    const [globalUnassignedStories, setGlobalUnassignedStories] = useState<UserStory[]>([]);
    const [loadingUnassigned, setLoadingUnassigned] = useState(false);
    const [showAssignPanel, setShowAssignPanel] = useState(false);
    const [selectedForAssignment, setSelectedForAssignment] = useState<Set<string>>(new Set());
    const [isAssigning, setIsAssigning] = useState(false);

    // Form state for editing
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editStatus, setEditStatus] = useState<Epic['status']>('Not Started');

    // Feature expansion state
    const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
    const [allExpanded, setAllExpanded] = useState(true);

    // AI generation state
    const [generatingForFeature, setGeneratingForFeature] = useState<string | null>(null);
    const [showStoryGeneration, setShowStoryGeneration] = useState(false);
    const [storyGenFeature, setStoryGenFeature] = useState<FeatureWithStories | null>(null);
    const [generatedStories, setGeneratedStories] = useState<GeneratedStory[]>([]);
    const [selectedGeneratedStories, setSelectedGeneratedStories] = useState<Set<number>>(new Set());
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isCreatingStories, setIsCreatingStories] = useState(false);
    // Diff-based generation info
    const [storyGenMode, setStoryGenMode] = useState<'full' | 'diff'>('full');
    const [existingStoryCoverage, setExistingStoryCoverage] = useState<{
        count: number;
        covered_areas: string[];
    } | null>(null);
    const [gapsFilled, setGapsFilled] = useState<string[]>([]);

    // Story Consolidation (Hybrid + Q) state
    const [consolidationResult, setConsolidationResult] = useState<BulkConsolidationResult | null>(null);
    const [isConsolidating, setIsConsolidating] = useState(false);
    const [showConsolidationWarning, setShowConsolidationWarning] = useState(false);

    // Bulk move state
    const [bulkMoveMode, setBulkMoveMode] = useState(false);
    const [selectedStoriesForMove, setSelectedStoriesForMove] = useState<Set<string>>(new Set());
    const [targetFeatureForMove, setTargetFeatureForMove] = useState<string | null>(null);
    const [isMovingStories, setIsMovingStories] = useState(false);

    // AI Feature Generation state
    const [showFeatureGeneration, setShowFeatureGeneration] = useState(false);
    const [isGeneratingFeatures, setIsGeneratingFeatures] = useState(false);
    const [generatedFeatures, setGeneratedFeatures] = useState<GeneratedFeature[]>([]);
    const [selectedGeneratedFeatures, setSelectedGeneratedFeatures] = useState<Set<number>>(new Set());
    const [featureGenerationError, setFeatureGenerationError] = useState<string | null>(null);
    const [featureGenerationReasoning, setFeatureGenerationReasoning] = useState<string | null>(null);
    const [usedFeatureFallback, setUsedFeatureFallback] = useState(false);
    const [isCreatingFeatures, setIsCreatingFeatures] = useState(false);

    // Coverage Analysis state
    const [coverageAnalysis, setCoverageAnalysis] = useState<CoverageAnalysisResult | null>(null);
    const [isAnalyzingCoverage, setIsAnalyzingCoverage] = useState(false);
    const [showCoverageDetails, setShowCoverageDetails] = useState(false);

    // Calculate overall progress from all stories
    const overallProgress = useMemo(() => {
        const allStories = [
            ...features.flatMap(f => f.stories),
            ...unassignedStories
        ];
        if (allStories.length === 0) return { done: 0, total: 0, percent: 0 };
        const done = allStories.filter(s => s.status === 'Done').length;
        return {
            done,
            total: allStories.length,
            percent: Math.round((done / allStories.length) * 100)
        };
    }, [features, unassignedStories]);

    // Toggle a single feature expansion
    const toggleFeatureExpansion = (featureId: string) => {
        setExpandedFeatures(prev => {
            const next = new Set(prev);
            if (next.has(featureId)) {
                next.delete(featureId);
            } else {
                next.add(featureId);
            }
            return next;
        });
    };

    // Toggle all features expanded/collapsed
    const toggleAllExpanded = () => {
        if (allExpanded) {
            setExpandedFeatures(new Set());
        } else {
            setExpandedFeatures(new Set(features.map(f => f.id)));
        }
        setAllExpanded(!allExpanded);
    };

    const loadFeaturesAndStories = async () => {
        if (!epic) return;
        setLoadingFeatures(true);
        try {
            // Load features with counts
            const featuresData = await getFeaturesWithCounts(epic.id);

            // Load stories for each feature
            const featuresWithStories: FeatureWithStories[] = await Promise.all(
                featuresData.map(async (feature) => {
                    const stories = await getUserStoriesForFeature(feature.id);
                    return { ...feature, stories };
                })
            );

            // Load unassigned stories (in epic but no feature)
            const unassigned = await getUnassignedStoriesForEpic(epic.id);

            setFeatures(featuresWithStories);
            setUnassignedStories(unassigned);
        } catch (err) {
            console.error('Error loading features:', err);
        } finally {
            setLoadingFeatures(false);
        }
    };

    const loadGlobalUnassignedStories = async () => {
        if (!epic) return;
        setLoadingUnassigned(true);
        try {
            const stories = await getUnassignedUserStories(epic.project_id);
            setGlobalUnassignedStories(stories);
        } catch (err) {
            console.error('Error loading unassigned stories:', err);
        } finally {
            setLoadingUnassigned(false);
        }
    };

    useEffect(() => {
        if (epic && open) {
            setEditName(epic.name);
            setEditDescription(epic.description || '');
            setEditStatus(epic.status);
            setShowAssignPanel(false);
            setSelectedForAssignment(new Set());
            loadFeaturesAndStories();
        }
    }, [epic, open]);

    // Initialize expanded features when loaded
    useEffect(() => {
        if (features.length > 0) {
            const shouldDefaultExpanded = features.length < 6;
            if (shouldDefaultExpanded) {
                setExpandedFeatures(new Set(features.map(f => f.id)));
                setAllExpanded(true);
            } else {
                setExpandedFeatures(new Set());
                setAllExpanded(false);
            }
        }
    }, [features.length]);

    const handleSave = async () => {
        if (!epic) return;

        try {
            const updated = await updateEpic(epic.id, {
                name: editName,
                description: editDescription || null,
                status: editStatus,
            });
            setIsEditing(false);
            onEpicUpdated?.(updated);
        } catch (err) {
            console.error('Error updating epic:', err);
        }
    };

    const handleDelete = async () => {
        if (!epic) return;

        setIsDeleting(true);
        try {
            await deleteEpic(epic.id);
            onOpenChange(false);
            onEpicDeleted?.(epic.id);
        } catch (err) {
            console.error('Error deleting epic:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFeatureCreated = (feature: Feature) => {
        setFeatures(prev => [...prev, { ...feature, stories: [] }]);
        setExpandedFeatures(prev => new Set([...prev, feature.id]));
    };

    const handleDeleteFeature = async (featureId: string) => {
        try {
            await deleteFeature(featureId);
            await loadFeaturesAndStories(); // Reload to get updated unassigned stories
        } catch (err) {
            console.error('Error deleting feature:', err);
        }
    };

    const handleEditFeature = (feature: Feature) => {
        setEditingFeature(feature);
        setShowEditFeature(true);
    };

    const handleFeatureUpdated = (updatedFeature: Feature) => {
        setFeatures(prev =>
            prev.map(f =>
                f.id === updatedFeature.id
                    ? { ...updatedFeature, stories: f.stories }
                    : f
            )
        );
    };

    const handleMoveFeature = async (featureId: string, direction: 'up' | 'down') => {
        if (!epic) return;
        try {
            const reorderedFeatures = await moveFeature(epic.id, featureId, direction);
            // Preserve stories for each feature
            setFeatures(prev => {
                const storiesMap = new Map(prev.map(f => [f.id, f.stories]));
                return reorderedFeatures.map(f => ({
                    ...f,
                    stories: storiesMap.get(f.id) || [],
                }));
            });
        } catch (err) {
            console.error('Error moving feature:', err);
        }
    };

    // Toggle story selection for bulk move
    const toggleStoryForMove = (storyId: string) => {
        setSelectedStoriesForMove(prev => {
            const next = new Set(prev);
            if (next.has(storyId)) {
                next.delete(storyId);
            } else {
                next.add(storyId);
            }
            return next;
        });
    };

    // Select all stories from a feature for bulk move
    const selectAllStoriesFromFeature = (featureId: string) => {
        const feature = features.find(f => f.id === featureId);
        if (!feature) return;
        setSelectedStoriesForMove(prev => {
            const next = new Set(prev);
            feature.stories.forEach(s => next.add(s.id));
            return next;
        });
    };

    // Cancel bulk move mode
    const cancelBulkMove = () => {
        setBulkMoveMode(false);
        setSelectedStoriesForMove(new Set());
        setTargetFeatureForMove(null);
    };

    // Execute bulk move
    const handleBulkMove = async () => {
        if (selectedStoriesForMove.size === 0) return;

        setIsMovingStories(true);
        try {
            await bulkMoveStoriesToFeature(
                Array.from(selectedStoriesForMove),
                targetFeatureForMove
            );
            await loadFeaturesAndStories();
            cancelBulkMove();
        } catch (err) {
            console.error('Error moving stories:', err);
        } finally {
            setIsMovingStories(false);
        }
    };

    // Generate features from epic using AI
    const handleGenerateFeaturesFromEpic = async () => {
        if (!epic) return;

        setIsGeneratingFeatures(true);
        setGeneratedFeatures([]);
        setSelectedGeneratedFeatures(new Set());
        setFeatureGenerationError(null);
        setFeatureGenerationReasoning(null);
        setUsedFeatureFallback(false);
        setCoverageAnalysis(null);
        setShowCoverageDetails(false);
        setShowFeatureGeneration(true);

        try {
            const response = await fetch('/api/ai/generate-features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ epicId: epic.id }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate features');
            }

            if (data.success && data.data?.features) {
                const features = data.data.features as GeneratedFeature[];
                setGeneratedFeatures(features);
                setFeatureGenerationReasoning(data.data.reasoning || null);
                setUsedFeatureFallback(data.data.used_fallback || false);
                // Select all features by default
                setSelectedGeneratedFeatures(new Set(features.map((_, i) => i)));

                // Now analyze coverage if there are existing stories
                if (unassignedStories.length > 0) {
                    analyzeCoverageForFeatures(features);
                }
            } else {
                throw new Error('Invalid response from AI');
            }
        } catch (err) {
            console.error('Error generating features:', err);
            setFeatureGenerationError(err instanceof Error ? err.message : 'Failed to generate features');
        } finally {
            setIsGeneratingFeatures(false);
        }
    };

    // Analyze coverage of generated features against existing stories
    const analyzeCoverageForFeatures = async (featuresForAnalysis: GeneratedFeature[]) => {
        if (!epic) return;

        setIsAnalyzingCoverage(true);
        try {
            const response = await fetch('/api/ai/analyze-coverage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    epicId: epic.id,
                    generatedFeatures: featuresForAnalysis.map(f => ({
                        name: f.name,
                        description: f.description,
                    })),
                }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                setCoverageAnalysis(data.data);
            }
        } catch (err) {
            console.error('Error analyzing coverage:', err);
            // Don't show error - coverage is optional enhancement
        } finally {
            setIsAnalyzingCoverage(false);
        }
    };

    // Toggle selection of a generated feature
    const toggleGeneratedFeatureSelection = (index: number) => {
        setSelectedGeneratedFeatures(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    // Accept selected generated features and create them
    const handleAcceptGeneratedFeatures = async () => {
        if (!epic || selectedGeneratedFeatures.size === 0) return;

        setIsCreatingFeatures(true);
        try {
            const featuresToCreate = generatedFeatures.filter((_, i) => selectedGeneratedFeatures.has(i));

            // Create features one by one
            for (const feature of featuresToCreate) {
                await createFeature({
                    project_id: epic.project_id,
                    epic_id: epic.id,
                    name: feature.name,
                    description: feature.description,
                    priority: feature.priority,
                });
            }

            // Refresh features list
            await loadFeaturesAndStories();

            // Close dialog
            setShowFeatureGeneration(false);
            setGeneratedFeatures([]);
            setSelectedGeneratedFeatures(new Set());
        } catch (err) {
            console.error('Error creating features:', err);
            setFeatureGenerationError(err instanceof Error ? err.message : 'Failed to create features');
        } finally {
            setIsCreatingFeatures(false);
        }
    };

    const handleGenerateStories = async (featureId: string) => {
        const feature = features.find(f => f.id === featureId);
        if (!feature) return;

        setGeneratingForFeature(featureId);
        setStoryGenFeature(feature);
        setGeneratedStories([]);
        setSelectedGeneratedStories(new Set());
        setGenerationError(null);
        setStoryGenMode('full');
        setExistingStoryCoverage(null);
        setGapsFilled([]);
        setConsolidationResult(null);
        setShowConsolidationWarning(false);
        setShowStoryGeneration(true);

        try {
            const response = await fetch('/api/ai/generate-stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate stories');
            }

            if (data.success && data.data?.stories) {
                const stories = data.data.stories;
                setGeneratedStories(stories);
                // Select all stories by default
                setSelectedGeneratedStories(new Set(stories.map((_: GeneratedStory, i: number) => i)));

                // Capture diff-based generation info
                if (data.metadata?.generation_mode === 'diff') {
                    setStoryGenMode('diff');
                    setExistingStoryCoverage(data.data.existing_coverage || {
                        count: data.metadata.existing_story_count,
                        covered_areas: [],
                    });
                    setGapsFilled(data.data.gaps_filled || []);
                }

                // Run consolidation check if there are existing stories
                if (feature.stories.length > 0 && stories.length > 0) {
                    setIsConsolidating(true);
                    try {
                        const consolidateResponse = await fetch('/api/ai/consolidate-stories', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                featureId,
                                generatedStories: stories.map((s: GeneratedStory) => ({
                                    narrative: s.narrative,
                                    persona: s.persona,
                                    priority: s.priority,
                                    acceptance_criteria: s.acceptance_criteria || [],
                                    rationale: s.rationale || '',
                                })),
                            }),
                        });

                        const consolidateData = await consolidateResponse.json();
                        if (consolidateData.success && consolidateData.data) {
                            setConsolidationResult(consolidateData.data);
                            // Show warning if there are duplicates or merge suggestions
                            if (consolidateData.data.stories_to_skip?.length > 0 ||
                                consolidateData.data.stories_to_merge?.length > 0) {
                                setShowConsolidationWarning(true);
                                // Auto-deselect stories that should be skipped
                                const skipNarratives = new Set(
                                    consolidateData.data.stories_to_skip?.map((s: { narrative: string }) => s.narrative) || []
                                );
                                setSelectedGeneratedStories(prev => {
                                    const next = new Set(prev);
                                    stories.forEach((story: GeneratedStory, idx: number) => {
                                        if (skipNarratives.has(story.narrative)) {
                                            next.delete(idx);
                                        }
                                    });
                                    return next;
                                });
                            }
                        }
                    } catch (consolidateError) {
                        console.error('Consolidation check failed:', consolidateError);
                        // Non-fatal: continue without consolidation info
                    } finally {
                        setIsConsolidating(false);
                    }
                }
            }
        } catch (error) {
            console.error('Error generating stories:', error);
            setGenerationError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setGeneratingForFeature(null);
        }
    };

    const handleAcceptGeneratedStories = async () => {
        if (!epic || !storyGenFeature || selectedGeneratedStories.size === 0) return;

        setIsCreatingStories(true);
        try {
            // Filter selected stories
            const selectedStories = generatedStories.filter((_, i) => selectedGeneratedStories.has(i));

            // Create user stories in bulk
            const storiesToCreate = selectedStories.map(story => ({
                project_id: epic.project_id,
                epic_id: epic.id,
                feature_id: storyGenFeature.id,
                narrative: story.narrative,
                persona: story.persona,
                feature_area: storyGenFeature.name.toLowerCase().replace(/\s+/g, '_'),
                priority: story.priority,
                status: 'Not Started' as const,
                acceptance_criteria: story.acceptance_criteria,
            }));

            await bulkCreateUserStories(storiesToCreate);

            // Refresh features and stories
            await loadFeaturesAndStories();

            // Close dialog
            setShowStoryGeneration(false);
            setStoryGenFeature(null);
            setGeneratedStories([]);
            setSelectedGeneratedStories(new Set());
        } catch (error) {
            console.error('Error creating stories:', error);
            setGenerationError('Failed to create stories. Please try again.');
        } finally {
            setIsCreatingStories(false);
        }
    };

    const toggleGeneratedStorySelection = (index: number) => {
        setSelectedGeneratedStories(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const handleUnassignStoryFromFeature = async (storyId: string) => {
        try {
            await assignUserStoryToFeature(storyId, null);
            await loadFeaturesAndStories();
        } catch (err) {
            console.error('Error unassigning story from feature:', err);
        }
    };

    const handleOpenAssignPanel = () => {
        setShowAssignPanel(true);
        loadGlobalUnassignedStories();
    };

    const toggleStorySelection = (storyId: string) => {
        setSelectedForAssignment(prev => {
            const next = new Set(prev);
            if (next.has(storyId)) {
                next.delete(storyId);
            } else {
                next.add(storyId);
            }
            return next;
        });
    };

    const handleAssignSelected = async () => {
        if (!epic || selectedForAssignment.size === 0) return;

        setIsAssigning(true);
        try {
            await bulkAssignStoriesToEpic(Array.from(selectedForAssignment), epic.id);
            // Refresh both lists
            await loadFeaturesAndStories();
            await loadGlobalUnassignedStories();
            setSelectedForAssignment(new Set());
            // Update epic counts
            onEpicUpdated?.({
                ...epic,
                user_story_count: (epic.user_story_count || 0) + selectedForAssignment.size,
            });
        } catch (err) {
            console.error('Error assigning stories:', err);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleUnassignStoryFromEpic = async (storyId: string) => {
        if (!epic) return;
        try {
            await assignUserStoryToEpic(storyId, null);
            await loadFeaturesAndStories();
            onEpicUpdated?.({
                ...epic,
                user_story_count: Math.max(0, (epic.user_story_count || 0) - 1),
            });
        } catch (err) {
            console.error('Error unassigning story:', err);
        }
    };

    if (!epic) return null;

    const priorityColor = PRIORITIES.find(p => p.value === epic.priority)?.color || 'bg-gray-500';

    return (
    <>
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="bg-gray-900 border-gray-700 w-[600px] sm:max-w-[600px] overflow-y-auto p-6">
                <SheetHeader className="mb-6">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-purple-400" />
                            {isEditing ? (
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-gray-800 border-gray-700"
                                />
                            ) : (
                                epic.name
                            )}
                        </SheetTitle>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSave}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Save
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Status & Priority */}
                    <div className="flex items-center gap-3">
                        <Badge className={priorityColor}>{epic.priority}</Badge>
                        {isEditing ? (
                            <Select value={editStatus} onValueChange={(v) => setEditStatus(v as Epic['status'])}>
                                <SelectTrigger className="w-40 bg-gray-800 border-gray-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge className={STATUSES.find(s => s.value === epic.status)?.color}>
                                {epic.status}
                            </Badge>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-400">Description</h4>
                        {isEditing ? (
                            <Textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="bg-gray-800 border-gray-700"
                            />
                        ) : (
                            <p className="text-gray-300">
                                {epic.description || 'No description provided'}
                            </p>
                        )}
                    </div>

                    {/* User Value */}
                    {epic.user_value && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                User Value
                            </h4>
                            <p className="text-gray-300">{epic.user_value}</p>
                        </div>
                    )}

                    {/* Business Objectives */}
                    {epic.business_objectives && epic.business_objectives.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-400">Business Objectives</h4>
                            <ul className="space-y-1">
                                {epic.business_objectives.map((obj, i) => (
                                    <li key={i} className="text-gray-300 flex items-start gap-2">
                                        <span className="text-purple-400">-</span>
                                        {obj}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Technical Context */}
                    {epic.technical_context && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-400">Technical Context</h4>
                            <p className="text-gray-300 text-sm bg-gray-800 p-3 rounded-lg font-mono">
                                {epic.technical_context}
                            </p>
                        </div>
                    )}

                    {/* Features Section - Primary organizational unit for user stories */}
                    <div className="space-y-4">
                        {/* Header with Overall Progress */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Features ({features.length})
                                </h4>
                                <div className="flex items-center gap-2">
                                    {/* Primary Action: AI Generate Features */}
                                    <Button
                                        size="sm"
                                        onClick={handleGenerateFeaturesFromEpic}
                                        disabled={isGeneratingFeatures}
                                        className="gap-1.5 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white"
                                    >
                                        {isGeneratingFeatures ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Wand2 className="w-4 h-4" />
                                        )}
                                        <span className="hidden sm:inline">AI Generate</span>
                                    </Button>

                                    {/* Secondary Action: Add Feature Manually */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowCreateFeature(true)}
                                        className="gap-1 text-indigo-400 border-indigo-600 hover:bg-indigo-600/20"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Add</span>
                                    </Button>

                                    {/* More Actions Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-gray-400 border-gray-600 hover:bg-gray-700 px-2"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 bg-gray-900 border-gray-700">
                                            <DropdownMenuItem
                                                onClick={handleOpenAssignPanel}
                                                className="text-gray-300 focus:text-white focus:bg-gray-800"
                                            >
                                                <Link2 className="w-4 h-4 mr-2 text-purple-400" />
                                                Assign Existing Stories
                                            </DropdownMenuItem>
                                            {features.length > 0 && (
                                                <>
                                                    <DropdownMenuItem
                                                        onClick={() => setBulkMoveMode(true)}
                                                        className="text-gray-300 focus:text-white focus:bg-gray-800"
                                                    >
                                                        <MoveHorizontal className="w-4 h-4 mr-2 text-orange-400" />
                                                        Bulk Move Stories
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-gray-700" />
                                                    <DropdownMenuItem
                                                        onClick={toggleAllExpanded}
                                                        className="text-gray-300 focus:text-white focus:bg-gray-800"
                                                    >
                                                        {allExpanded ? (
                                                            <>
                                                                <ChevronUp className="w-4 h-4 mr-2" />
                                                                Collapse All Features
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown className="w-4 h-4 mr-2" />
                                                                Expand All Features
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Bulk Move Mode Active Indicator */}
                                    {bulkMoveMode && (
                                        <Button
                                            size="sm"
                                            onClick={cancelBulkMove}
                                            className="gap-1 bg-orange-600 hover:bg-orange-700"
                                        >
                                            <X className="w-4 h-4" />
                                            Cancel Move
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Bulk Move Panel */}
                            {bulkMoveMode && (
                                <div className="bg-orange-950/30 border border-orange-700/50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MoveHorizontal className="w-4 h-4 text-orange-400" />
                                            <span className="text-sm font-medium text-orange-300">
                                                Bulk Move Mode
                                            </span>
                                            <span className="text-xs text-orange-400/70">
                                                ({selectedStoriesForMove.size} selected)
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={cancelBulkMove}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        Click on stories below to select them for moving.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <Select
                                            value={targetFeatureForMove || 'unassigned'}
                                            onValueChange={(v) => setTargetFeatureForMove(v === 'unassigned' ? null : v)}
                                        >
                                            <SelectTrigger className="bg-gray-800 border-gray-700 flex-1">
                                                <SelectValue placeholder="Move to feature..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unassigned">
                                                    <span className="text-gray-400">Unassigned (no feature)</span>
                                                </SelectItem>
                                                {features.map((f) => (
                                                    <SelectItem key={f.id} value={f.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Package className="w-3 h-3 text-indigo-400" />
                                                            {f.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            onClick={handleBulkMove}
                                            disabled={selectedStoriesForMove.size === 0 || isMovingStories}
                                            className="gap-1 bg-orange-600 hover:bg-orange-700"
                                        >
                                            {isMovingStories ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Moving...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    Move {selectedStoriesForMove.size} Stories
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Overall Progress Bar */}
                            {overallProgress.total > 0 && (
                                <div className="bg-gray-800 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-gray-400">Overall Progress</span>
                                        <span className="text-sm text-gray-300">
                                            {overallProgress.done}/{overallProgress.total} stories done ({overallProgress.percent}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${
                                                overallProgress.percent === 100
                                                    ? 'bg-green-500'
                                                    : overallProgress.percent > 0
                                                        ? 'bg-purple-500'
                                                        : 'bg-gray-600'
                                            }`}
                                            style={{ width: `${overallProgress.percent}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Features Content */}
                        {loadingFeatures ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                            </div>
                        ) : features.length === 0 && unassignedStories.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No features yet.</p>
                                <p className="text-xs mt-1">Create a feature to organize user stories, then use AI to generate stories.</p>
                            </div>
                        ) : (
                            <>
                                {/* Feature Cards */}
                                {features.length > 0 && (
                                    <div className="border border-gray-700 rounded-lg overflow-hidden">
                                        {features.map((feature, index) => (
                                            <FeatureCard
                                                key={feature.id}
                                                feature={feature}
                                                isExpanded={expandedFeatures.has(feature.id)}
                                                onToggle={() => toggleFeatureExpansion(feature.id)}
                                                onUserStoryClick={onUserStoryClick}
                                                onUnassignStory={handleUnassignStoryFromFeature}
                                                onGenerateStories={handleGenerateStories}
                                                onEditFeature={handleEditFeature}
                                                onDeleteFeature={handleDeleteFeature}
                                                onMoveUp={() => handleMoveFeature(feature.id, 'up')}
                                                onMoveDown={() => handleMoveFeature(feature.id, 'down')}
                                                isFirst={index === 0}
                                                isLast={index === features.length - 1}
                                                isGenerating={generatingForFeature === feature.id}
                                                bulkMoveMode={bulkMoveMode}
                                                selectedStoriesForMove={selectedStoriesForMove}
                                                onToggleStoryForMove={toggleStoryForMove}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Unassigned Stories (in epic but not in any feature) */}
                                {unassignedStories.length > 0 && (
                                    <div className="mt-4 bg-amber-950/20 border border-amber-700/30 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                <h5 className="text-sm font-medium text-amber-300">
                                                    Unassigned Stories ({unassignedStories.length})
                                                </h5>
                                            </div>
                                            {!bulkMoveMode && features.length > 0 && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setBulkMoveMode(true)}
                                                    className="gap-1 text-amber-400 border-amber-600 hover:bg-amber-600/20 text-xs"
                                                >
                                                    <MoveHorizontal className="w-3 h-3" />
                                                    Assign to Feature
                                                </Button>
                                            )}
                                            {bulkMoveMode && (
                                                <span className="text-purple-400 text-xs">
                                                    Click stories to select for move
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mb-3">
                                            These stories belong to this Epic but aren&apos;t assigned to any Feature yet.
                                        </p>
                                        <div className="space-y-2">
                                            {unassignedStories.map((story) => {
                                                const isSelected = selectedStoriesForMove.has(story.id);
                                                return (
                                                    <div
                                                        key={story.id}
                                                        onClick={bulkMoveMode ? () => toggleStoryForMove(story.id) : undefined}
                                                        className={`p-3 rounded-lg transition-colors group ${
                                                            bulkMoveMode
                                                                ? isSelected
                                                                    ? 'bg-purple-900/50 border border-purple-500 cursor-pointer'
                                                                    : 'bg-gray-800 hover:bg-gray-700 cursor-pointer'
                                                                : 'bg-gray-800 hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-start gap-2 flex-1">
                                                                {bulkMoveMode && (
                                                                    <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center ${
                                                                        isSelected
                                                                            ? 'bg-purple-500 border-purple-500'
                                                                            : 'border-gray-500'
                                                                    }`}>
                                                                        {isSelected && (
                                                                            <Check className="w-3 h-3 text-white" />
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <p
                                                                    onClick={(e) => {
                                                                        if (!bulkMoveMode) {
                                                                            e.stopPropagation();
                                                                            onUserStoryClick?.(story);
                                                                        }
                                                                    }}
                                                                    className={`text-white text-sm flex-1 ${
                                                                        !bulkMoveMode ? 'cursor-pointer hover:text-purple-300' : ''
                                                                    }`}
                                                                >
                                                                    {story.narrative}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    className={
                                                                        story.status === 'Done'
                                                                            ? 'bg-green-500'
                                                                            : story.status === 'In Progress'
                                                                                ? 'bg-blue-500'
                                                                                : story.status === 'Blocked'
                                                                                    ? 'bg-red-500'
                                                                                    : 'bg-gray-500'
                                                                    }
                                                                >
                                                                    {story.status}
                                                                </Badge>
                                                                {!bulkMoveMode && (
                                                                    <button
                                                                        onClick={() => handleUnassignStoryFromEpic(story.id)}
                                                                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                                                                        title="Remove from epic"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                            <span className="capitalize">{story.persona}</span>
                                                            {story.feature_area && (
                                                                <>
                                                                    <span>-</span>
                                                                    <span>{story.feature_area}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Create Feature Dialog */}
                    <CreateFeatureDialog
                        projectId={epic.project_id}
                        epicId={epic.id}
                        open={showCreateFeature}
                        onOpenChange={setShowCreateFeature}
                        onFeatureCreated={handleFeatureCreated}
                    />

                    {/* Edit Feature Dialog */}
                    <EditFeatureDialog
                        feature={editingFeature}
                        open={showEditFeature}
                        onOpenChange={setShowEditFeature}
                        onFeatureUpdated={handleFeatureUpdated}
                    />

                    {/* Assign Unassigned Stories Panel */}
                    {showAssignPanel && (
                        <div className="border-t border-gray-700 pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-purple-400" />
                                    Assign Unassigned Stories
                                </h4>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setShowAssignPanel(false);
                                        setSelectedForAssignment(new Set());
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {loadingUnassigned ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                </div>
                            ) : globalUnassignedStories.length === 0 ? (
                                <p className="text-gray-500 text-sm italic py-4">
                                    All user stories are already assigned to epics.
                                </p>
                            ) : (
                                <>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                                        {globalUnassignedStories.map((story) => (
                                            <div
                                                key={story.id}
                                                onClick={() => toggleStorySelection(story.id)}
                                                className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                                    selectedForAssignment.has(story.id)
                                                        ? 'bg-purple-900/30 border-purple-500'
                                                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                                                        selectedForAssignment.has(story.id)
                                                            ? 'bg-purple-600 border-purple-600'
                                                            : 'border-gray-600'
                                                    }`}>
                                                        {selectedForAssignment.has(story.id) && (
                                                            <Check className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-white text-sm">{story.narrative}</p>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                            <span className="capitalize">{story.persona}</span>
                                                            <span>-</span>
                                                            <span>{story.feature_area}</span>
                                                            <Badge className="bg-gray-600 text-xs">{story.status}</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedForAssignment.size > 0 && (
                                        <Button
                                            onClick={handleAssignSelected}
                                            disabled={isAssigning}
                                            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                                        >
                                            {isAssigning ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Assigning...
                                                </>
                                            ) : (
                                                <>
                                                    <Link2 className="w-4 h-4" />
                                                    Assign {selectedForAssignment.size} {selectedForAssignment.size === 1 ? 'Story' : 'Stories'} to Epic
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>

        {/* Story Generation Dialog */}
        <Dialog open={showStoryGeneration} onOpenChange={setShowStoryGeneration}>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Generate User Stories
                    </DialogTitle>
                </DialogHeader>

                {storyGenFeature && (
                    <div className="space-y-4 mt-4">
                        {/* Feature Context */}
                        <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Package className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-medium text-blue-300">Feature</span>
                            </div>
                            <p className="text-white font-medium">{storyGenFeature.name}</p>
                            {storyGenFeature.description && (
                                <p className="text-sm text-gray-400 mt-1">{storyGenFeature.description}</p>
                            )}
                        </div>

                        {/* Loading State */}
                        {generatingForFeature && (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                                <p className="text-gray-400">Generating user stories with AI...</p>
                                <p className="text-sm text-gray-500">This may take 10-15 seconds</p>
                            </div>
                        )}

                        {/* Error State */}
                        {generationError && (
                            <div className="flex items-center gap-2 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{generationError}</p>
                            </div>
                        )}

                        {/* Diff Mode Info */}
                        {!generatingForFeature && storyGenMode === 'diff' && existingStoryCoverage && (
                            <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm font-medium text-amber-300">Diff-Based Generation</span>
                                </div>
                                <p className="text-xs text-amber-200/70 mb-2">
                                    Analyzed {existingStoryCoverage.count} existing {existingStoryCoverage.count === 1 ? 'story' : 'stories'} and generated only what&apos;s missing.
                                </p>
                                {existingStoryCoverage.covered_areas.length > 0 && (
                                    <div className="mb-2">
                                        <p className="text-xs text-gray-400 mb-1">Already covered:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {existingStoryCoverage.covered_areas.slice(0, 4).map((area, i) => (
                                                <Badge key={i} className="bg-green-900/50 text-green-300 text-xs">{area}</Badge>
                                            ))}
                                            {existingStoryCoverage.covered_areas.length > 4 && (
                                                <Badge className="bg-gray-700 text-gray-400 text-xs">+{existingStoryCoverage.covered_areas.length - 4} more</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {gapsFilled.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Gaps being filled:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {gapsFilled.slice(0, 4).map((gap, i) => (
                                                <Badge key={i} className="bg-purple-900/50 text-purple-300 text-xs">{gap}</Badge>
                                            ))}
                                            {gapsFilled.length > 4 && (
                                                <Badge className="bg-gray-700 text-gray-400 text-xs">+{gapsFilled.length - 4} more</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Consolidation Warning */}
                        {showConsolidationWarning && consolidationResult && (
                            <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                    <h4 className="font-medium text-amber-300">Potential Duplicates Detected</h4>
                                </div>

                                {consolidationResult.stories_to_skip && consolidationResult.stories_to_skip.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-amber-200/80">
                                            {consolidationResult.stories_to_skip.length} {consolidationResult.stories_to_skip.length === 1 ? 'story appears' : 'stories appear'} to duplicate existing stories:
                                        </p>
                                        <div className="space-y-1.5 pl-2 border-l-2 border-amber-700/50">
                                            {consolidationResult.stories_to_skip.slice(0, 3).map((skip, i) => (
                                                <div key={i} className="text-xs">
                                                    <p className="text-gray-300 line-clamp-1">&quot;{skip.narrative}&quot;</p>
                                                    <p className="text-amber-400/70">↳ Duplicates: &quot;{skip.duplicate_of}&quot;</p>
                                                </div>
                                            ))}
                                            {consolidationResult.stories_to_skip.length > 3 && (
                                                <p className="text-xs text-gray-500">+{consolidationResult.stories_to_skip.length - 3} more duplicates</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {consolidationResult.stories_to_merge && consolidationResult.stories_to_merge.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-amber-200/80">
                                            {consolidationResult.stories_to_merge.length} {consolidationResult.stories_to_merge.length === 1 ? 'story could' : 'stories could'} be merged with existing ones:
                                        </p>
                                        <div className="space-y-2 pl-2 border-l-2 border-amber-700/50">
                                            {consolidationResult.stories_to_merge.slice(0, 2).map((merge, i) => (
                                                <div key={i} className="text-xs space-y-1">
                                                    <p className="text-gray-300 line-clamp-1">&quot;{merge.generated_narrative}&quot;</p>
                                                    <p className="text-amber-400/70">+ &quot;{merge.existing_narrative}&quot;</p>
                                                    <p className="text-green-400/70">= &quot;{merge.merged_narrative}&quot;</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-gray-400 italic">
                                    Duplicates have been auto-deselected. Review and adjust your selection below.
                                </p>
                            </div>
                        )}

                        {/* Consolidation Loading */}
                        {isConsolidating && (
                            <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Checking for potential duplicates...
                            </div>
                        )}

                        {/* Generated Stories */}
                        {!generatingForFeature && generatedStories.length > 0 && (
                            <>
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-300">
                                        Generated Stories ({selectedGeneratedStories.size}/{generatedStories.length} selected)
                                        {consolidationResult?.summary && consolidationResult.summary.duplicates_found > 0 && (
                                            <span className="ml-2 text-xs text-amber-400">
                                                ({consolidationResult.summary.duplicates_found} duplicate{consolidationResult.summary.duplicates_found !== 1 ? 's' : ''} detected)
                                            </span>
                                        )}
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (selectedGeneratedStories.size === generatedStories.length) {
                                                setSelectedGeneratedStories(new Set());
                                            } else {
                                                setSelectedGeneratedStories(new Set(generatedStories.map((_, i) => i)));
                                            }
                                        }}
                                        className="text-purple-400 hover:text-purple-300"
                                    >
                                        {selectedGeneratedStories.size === generatedStories.length ? 'Deselect All' : 'Select All'}
                                    </Button>
                                </div>

                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                    {generatedStories.map((story, index) => (
                                        <div
                                            key={index}
                                            onClick={() => toggleGeneratedStorySelection(index)}
                                            className={`p-4 rounded-lg cursor-pointer transition-colors border ${
                                                selectedGeneratedStories.has(index)
                                                    ? 'bg-purple-900/30 border-purple-500'
                                                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors flex-shrink-0 ${
                                                    selectedGeneratedStories.has(index)
                                                        ? 'bg-purple-600 border-purple-600'
                                                        : 'border-gray-600'
                                                }`}>
                                                    {selectedGeneratedStories.has(index) && (
                                                        <Check className="w-3 h-3 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm">{story.narrative}</p>
                                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                        <Badge className="capitalize text-xs bg-gray-700">{story.persona}</Badge>
                                                        <Badge className={`text-xs ${
                                                            story.priority === 'P0' ? 'bg-red-600' :
                                                            story.priority === 'P1' ? 'bg-yellow-500 text-black' :
                                                            'bg-gray-500'
                                                        }`}>{story.priority}</Badge>
                                                    </div>
                                                    {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
                                                        <div className="mt-2 text-xs text-gray-500">
                                                            <p className="text-gray-400 mb-1">Acceptance Criteria:</p>
                                                            <ul className="list-disc list-inside space-y-0.5">
                                                                {story.acceptance_criteria.slice(0, 3).map((ac, i) => (
                                                                    <li key={i}>{ac}</li>
                                                                ))}
                                                                {story.acceptance_criteria.length > 3 && (
                                                                    <li className="text-gray-600">+{story.acceptance_criteria.length - 3} more</li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {story.rationale && (
                                                        <p className="mt-2 text-xs text-purple-400 italic">{story.rationale}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t border-gray-700">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowStoryGeneration(false);
                                            setGeneratedStories([]);
                                            setSelectedGeneratedStories(new Set());
                                        }}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleAcceptGeneratedStories}
                                        disabled={selectedGeneratedStories.size === 0 || isCreatingStories}
                                        className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700"
                                    >
                                        {isCreatingStories ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4" />
                                                Accept {selectedGeneratedStories.size} {selectedGeneratedStories.size === 1 ? 'Story' : 'Stories'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Empty State after generation completes */}
                        {!generatingForFeature && generatedStories.length === 0 && !generationError && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No stories have been generated yet.</p>
                                <p className="text-sm mt-1">Click the Generate Stories button on a feature to start.</p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>

        {/* Feature Generation Dialog */}
        <Dialog open={showFeatureGeneration} onOpenChange={setShowFeatureGeneration}>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-cyan-400" />
                        Generate Features from Epic
                    </DialogTitle>
                </DialogHeader>

                {epic && (
                    <div className="space-y-4 mt-4">
                        {/* Epic Context */}
                        <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Layers className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm font-medium text-indigo-300">Epic</span>
                            </div>
                            <p className="text-white font-medium">{epic.name}</p>
                            {epic.description && (
                                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{epic.description}</p>
                            )}
                            {epic.feature_areas && epic.feature_areas.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Feature Checklist:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {epic.feature_areas.slice(0, 5).map((area, i) => (
                                            <Badge key={i} className="bg-indigo-900/50 text-indigo-300 text-xs">{area}</Badge>
                                        ))}
                                        {epic.feature_areas.length > 5 && (
                                            <Badge className="bg-gray-700 text-gray-400 text-xs">+{epic.feature_areas.length - 5} more</Badge>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Loading State */}
                        {isGeneratingFeatures && (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                                <p className="text-gray-400">Analyzing epic and generating features with AI...</p>
                                <p className="text-sm text-gray-500">This may take 5-10 seconds</p>
                            </div>
                        )}

                        {/* Error State */}
                        {featureGenerationError && (
                            <div className="flex items-center gap-2 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{featureGenerationError}</p>
                            </div>
                        )}

                        {/* Fallback Warning */}
                        {usedFeatureFallback && !isGeneratingFeatures && generatedFeatures.length > 0 && (
                            <div className="flex items-center gap-2 p-3 bg-yellow-950/30 border border-yellow-700/50 rounded-lg">
                                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                <p className="text-xs text-yellow-300">
                                    AI analysis unavailable. Features derived from feature checklist (less detailed descriptions).
                                </p>
                            </div>
                        )}

                        {/* AI Reasoning */}
                        {featureGenerationReasoning && !isGeneratingFeatures && (
                            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                <p className="text-xs text-gray-400">{featureGenerationReasoning}</p>
                            </div>
                        )}

                        {/* Coverage Analysis Report */}
                        {!isGeneratingFeatures && generatedFeatures.length > 0 && (isAnalyzingCoverage || coverageAnalysis) && (
                            <div className="bg-emerald-950/30 border border-emerald-700/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4 text-emerald-400" />
                                        <span className="text-sm font-medium text-emerald-300">Coverage Analysis</span>
                                        {isAnalyzingCoverage && (
                                            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                                        )}
                                    </div>
                                    {coverageAnalysis && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowCoverageDetails(!showCoverageDetails)}
                                            className="text-emerald-400 hover:text-emerald-300 h-6 text-xs"
                                        >
                                            {showCoverageDetails ? 'Hide Details' : 'Show Details'}
                                        </Button>
                                    )}
                                </div>

                                {isAnalyzingCoverage && (
                                    <p className="text-xs text-gray-400">Analyzing how existing stories align with generated features...</p>
                                )}

                                {coverageAnalysis && (
                                    <>
                                        {/* Summary Stats */}
                                        <div className="grid grid-cols-4 gap-2 mb-3">
                                            <div className="bg-green-900/30 rounded p-2 text-center">
                                                <p className="text-lg font-bold text-green-400">{coverageAnalysis.summary.well_covered}</p>
                                                <p className="text-xs text-green-300/70">Covered</p>
                                            </div>
                                            <div className="bg-yellow-900/30 rounded p-2 text-center">
                                                <p className="text-lg font-bold text-yellow-400">{coverageAnalysis.summary.partially_covered}</p>
                                                <p className="text-xs text-yellow-300/70">Partial</p>
                                            </div>
                                            <div className="bg-red-900/30 rounded p-2 text-center">
                                                <p className="text-lg font-bold text-red-400">{coverageAnalysis.summary.not_covered}</p>
                                                <p className="text-xs text-red-300/70">Gaps</p>
                                            </div>
                                            <div className="bg-gray-700/50 rounded p-2 text-center">
                                                <p className="text-lg font-bold text-gray-300">{coverageAnalysis.summary.orphan_stories}</p>
                                                <p className="text-xs text-gray-400">Orphans</p>
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-400 mb-2">
                                            {coverageAnalysis.summary.total_existing_stories} existing stories analyzed against {coverageAnalysis.summary.total_features} features
                                        </p>

                                        {/* Detailed Coverage (collapsible) */}
                                        {showCoverageDetails && (
                                            <div className="mt-4 space-y-3 border-t border-emerald-700/30 pt-3">
                                                {/* Feature Coverage Details */}
                                                <div className="space-y-2">
                                                    <p className="text-xs font-medium text-emerald-300">Feature Coverage:</p>
                                                    {coverageAnalysis.feature_coverage.map((fc, i) => (
                                                        <div key={i} className="bg-gray-800/50 rounded p-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`w-2 h-2 rounded-full ${
                                                                    fc.coverage_status === 'well_covered' ? 'bg-green-500' :
                                                                    fc.coverage_status === 'partially_covered' ? 'bg-yellow-500' :
                                                                    'bg-red-500'
                                                                }`} />
                                                                <span className="text-xs font-medium text-white">{fc.feature_name}</span>
                                                                <span className={`text-xs ${
                                                                    fc.coverage_status === 'well_covered' ? 'text-green-400' :
                                                                    fc.coverage_status === 'partially_covered' ? 'text-yellow-400' :
                                                                    'text-red-400'
                                                                }`}>
                                                                    ({fc.existing_stories.length} stories)
                                                                </span>
                                                            </div>
                                                            {fc.gaps.length > 0 && (
                                                                <div className="ml-4 mt-1">
                                                                    <p className="text-xs text-gray-500">Gaps:</p>
                                                                    <ul className="list-disc list-inside text-xs text-gray-400">
                                                                        {fc.gaps.slice(0, 2).map((gap, j) => (
                                                                            <li key={j}>{gap}</li>
                                                                        ))}
                                                                        {fc.gaps.length > 2 && (
                                                                            <li className="text-gray-500">+{fc.gaps.length - 2} more</li>
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Orphan Stories */}
                                                {coverageAnalysis.orphan_stories.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-medium text-gray-400">Orphan Stories (don&apos;t fit any feature):</p>
                                                        {coverageAnalysis.orphan_stories.slice(0, 3).map((os, i) => (
                                                            <div key={i} className="bg-gray-800/50 rounded p-2">
                                                                <p className="text-xs text-gray-300 line-clamp-1">{os.narrative}</p>
                                                                <p className="text-xs text-gray-500 mt-1">{os.suggestion}</p>
                                                            </div>
                                                        ))}
                                                        {coverageAnalysis.orphan_stories.length > 3 && (
                                                            <p className="text-xs text-gray-500">+{coverageAnalysis.orphan_stories.length - 3} more orphan stories</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Recommendations */}
                                                {coverageAnalysis.recommendations.length > 0 && (
                                                    <div className="bg-emerald-900/20 rounded p-2">
                                                        <p className="text-xs font-medium text-emerald-300 mb-1">Recommendations:</p>
                                                        <ul className="list-disc list-inside text-xs text-emerald-200/70 space-y-0.5">
                                                            {coverageAnalysis.recommendations.map((rec, i) => (
                                                                <li key={i}>{rec}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Generated Features */}
                        {!isGeneratingFeatures && generatedFeatures.length > 0 && (
                            <>
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-300">
                                        Generated Features ({selectedGeneratedFeatures.size}/{generatedFeatures.length} selected)
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (selectedGeneratedFeatures.size === generatedFeatures.length) {
                                                setSelectedGeneratedFeatures(new Set());
                                            } else {
                                                setSelectedGeneratedFeatures(new Set(generatedFeatures.map((_, i) => i)));
                                            }
                                        }}
                                        className="text-cyan-400 hover:text-cyan-300"
                                    >
                                        {selectedGeneratedFeatures.size === generatedFeatures.length ? 'Deselect All' : 'Select All'}
                                    </Button>
                                </div>

                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                    {generatedFeatures.map((feature, index) => (
                                        <div
                                            key={index}
                                            onClick={() => toggleGeneratedFeatureSelection(index)}
                                            className={`p-4 rounded-lg cursor-pointer transition-colors border ${
                                                selectedGeneratedFeatures.has(index)
                                                    ? 'bg-cyan-900/30 border-cyan-500'
                                                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors flex-shrink-0 ${
                                                    selectedGeneratedFeatures.has(index)
                                                        ? 'bg-cyan-600 border-cyan-600'
                                                        : 'border-gray-600'
                                                }`}>
                                                    {selectedGeneratedFeatures.has(index) && (
                                                        <Check className="w-3 h-3 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Package className="w-4 h-4 text-cyan-400" />
                                                        <p className="text-white font-medium">{feature.name}</p>
                                                        <Badge className={`text-xs ${
                                                            feature.priority === 'P0' ? 'bg-red-600' :
                                                            feature.priority === 'P1' ? 'bg-yellow-500 text-black' :
                                                            'bg-gray-500'
                                                        }`}>{feature.priority}</Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-400">{feature.description}</p>
                                                    {feature.rationale && (
                                                        <p className="mt-2 text-xs text-cyan-400/70 italic">{feature.rationale}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4 border-t border-gray-700">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowFeatureGeneration(false);
                                            setGeneratedFeatures([]);
                                            setSelectedGeneratedFeatures(new Set());
                                        }}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleAcceptGeneratedFeatures}
                                        disabled={selectedGeneratedFeatures.size === 0 || isCreatingFeatures}
                                        className="flex-1 gap-2 bg-cyan-600 hover:bg-cyan-700"
                                    >
                                        {isCreatingFeatures ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4" />
                                                Create {selectedGeneratedFeatures.size} {selectedGeneratedFeatures.size === 1 ? 'Feature' : 'Features'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Empty State after generation completes */}
                        {!isGeneratingFeatures && generatedFeatures.length === 0 && !featureGenerationError && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No features have been generated yet.</p>
                                <p className="text-sm mt-1">AI is analyzing the epic context...</p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </>
    );
}

// Epic List Component
export function EpicList({
    projectId,
    onUserStoryClick,
}: EpicManagementProps & { onUserStoryClick?: (userStory: UserStory) => void }) {
    const [epics, setEpics] = useState<Epic[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const loadEpics = async () => {
        try {
            const data = await getEpicsWithCounts(projectId);
            setEpics(data);
        } catch (err) {
            console.error('Error loading epics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEpics();
    }, [projectId]);

    const handleEpicCreated = (epic: Epic) => {
        setEpics(prev => [...prev, epic]);
    };

    const handleEpicUpdated = (updatedEpic: Epic) => {
        setEpics(prev => prev.map(e => e.id === updatedEpic.id ? updatedEpic : e));
        setSelectedEpic(updatedEpic);
    };

    const handleEpicDeleted = (epicId: string) => {
        setEpics(prev => prev.filter(e => e.id !== epicId));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-400" />
                    Epics ({epics.length})
                </h2>
                <CreateEpicDialog projectId={projectId} onEpicCreated={handleEpicCreated} />
            </div>

            {epics.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No epics created yet.</p>
                    <p className="text-sm mt-1">Create an epic to organize your user stories.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {epics.map((epic) => (
                        <EpicCard
                            key={epic.id}
                            epic={epic}
                            onClick={() => {
                                setSelectedEpic(epic);
                                setSheetOpen(true);
                            }}
                        />
                    ))}
                </div>
            )}

            <EpicDetailSheet
                epic={selectedEpic}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onEpicUpdated={handleEpicUpdated}
                onEpicDeleted={handleEpicDeleted}
                onUserStoryClick={onUserStoryClick}
            />
        </div>
    );
}

// Epic Selector for User Story assignment
export function EpicSelector({
    projectId,
    selectedEpicId,
    onSelect,
}: {
    projectId: string;
    selectedEpicId: string | null;
    onSelect: (epicId: string | null) => void;
}) {
    const [epics, setEpics] = useState<Epic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getEpicsWithCounts(projectId)
            .then(setEpics)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) {
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }

    return (
        <Select
            value={selectedEpicId || 'none'}
            onValueChange={(v) => onSelect(v === 'none' ? null : v)}
        >
            <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Select Epic (optional)" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">
                    <span className="text-gray-400">No Epic</span>
                </SelectItem>
                {epics.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-purple-400" />
                            {epic.name}
                            <span className="text-gray-500 text-xs">
                                ({epic.user_story_count || 0} stories)
                            </span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
