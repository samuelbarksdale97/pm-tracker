'use client';

import { useState } from 'react';
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
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ChevronRight,
    ChevronDown,
    Layers,
    Package,
    Plus,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { Epic, Feature, createEpic } from '@/lib/supabase';
import type { FeatureWithStories } from './miller-layout';

interface EpicNavColumnProps {
    projectId: string;
    epics: Epic[];
    features: FeatureWithStories[];
    selectedEpicId: string | null;
    selectedFeatureId: string | null;
    expandedEpics: Set<string>;
    loading: boolean;
    loadingFeatures: boolean;
    onSelectEpic: (epicId: string | null) => void;
    onSelectFeature: (featureId: string | null) => void;
    onToggleEpicExpand: (epicId: string) => void;
    onEpicCreated: (epic: Epic) => void;
    onEpicUpdated: (epic: Epic) => void;
    onEpicDeleted: (epicId: string) => void;
    onFeatureCreated: () => void;
}

const PRIORITIES = [
    { value: 'P0', label: 'P0 - Critical', color: 'bg-red-600' },
    { value: 'P1', label: 'P1 - High', color: 'bg-yellow-500' },
    { value: 'P2', label: 'P2 - Normal', color: 'bg-gray-500' },
];

const priorityColors: Record<string, string> = {
    'P0': 'bg-red-600',
    'P1': 'bg-yellow-500',
    'P2': 'bg-gray-500',
};

const statusColors: Record<string, string> = {
    'Not Started': 'bg-gray-500',
    'In Progress': 'bg-blue-500',
    'Done': 'bg-green-500',
    'On Hold': 'bg-yellow-500',
};

export function EpicNavColumn({
    projectId,
    epics,
    features,
    selectedEpicId,
    selectedFeatureId,
    expandedEpics,
    loading,
    loadingFeatures,
    onSelectEpic,
    onSelectFeature,
    onToggleEpicExpand,
    onEpicCreated,
    onEpicUpdated,
    onEpicDeleted,
    onFeatureCreated,
}: EpicNavColumnProps) {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-white">Epics</span>
                        <span className="text-xs text-gray-500">({epics.length})</span>
                    </div>
                    <CreateEpicDialog projectId={projectId} onEpicCreated={onEpicCreated} />
                </div>
            </div>

            {/* Epic Tree */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    </div>
                ) : epics.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <Layers className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        <p className="text-sm text-gray-500">No epics yet</p>
                        <p className="text-xs text-gray-600 mt-1">Create an epic to get started</p>
                    </div>
                ) : (
                    <div className="py-1">
                        {epics.map(epic => (
                            <EpicTreeItem
                                key={epic.id}
                                epic={epic}
                                features={selectedEpicId === epic.id ? features : []}
                                isSelected={selectedEpicId === epic.id}
                                isExpanded={expandedEpics.has(epic.id)}
                                selectedFeatureId={selectedFeatureId}
                                loadingFeatures={loadingFeatures && selectedEpicId === epic.id}
                                onSelect={() => onSelectEpic(epic.id)}
                                onToggleExpand={() => onToggleEpicExpand(epic.id)}
                                onSelectFeature={onSelectFeature}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Epic Tree Item with expandable features
function EpicTreeItem({
    epic,
    features,
    isSelected,
    isExpanded,
    selectedFeatureId,
    loadingFeatures,
    onSelect,
    onToggleExpand,
    onSelectFeature,
}: {
    epic: Epic;
    features: FeatureWithStories[];
    isSelected: boolean;
    isExpanded: boolean;
    selectedFeatureId: string | null;
    loadingFeatures: boolean;
    onSelect: () => void;
    onToggleExpand: () => void;
    onSelectFeature: (featureId: string | null) => void;
}) {
    const progress = epic.user_story_count && epic.user_story_count > 0
        ? Math.round(((epic.completed_story_count || 0) / epic.user_story_count) * 100)
        : 0;

    return (
        <div>
            {/* Epic Row */}
            <div
                className={cn(
                    "flex items-center gap-1 px-2 py-1.5 cursor-pointer group",
                    isSelected
                        ? "bg-purple-500/20 border-l-2 border-purple-500"
                        : "hover:bg-gray-800/50 border-l-2 border-transparent"
                )}
            >
                {/* Expand/Collapse */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand();
                    }}
                    className="p-0.5 hover:bg-gray-700 rounded"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                </button>

                {/* Epic Content */}
                <div
                    className="flex-1 min-w-0 flex items-center gap-2"
                    onClick={() => {
                        onSelect();
                        if (!isExpanded) onToggleExpand();
                    }}
                >
                    <Layers className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className={cn(
                                "text-sm font-medium truncate",
                                isSelected ? "text-white" : "text-gray-300"
                            )}>
                                {epic.name}
                            </span>
                            <Badge className={cn("text-[10px] px-1 py-0", priorityColors[epic.priority])}>
                                {epic.priority}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500">
                                {epic.completed_story_count || 0}/{epic.user_story_count || 0} stories
                            </span>
                            {progress > 0 && (
                                <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full transition-all",
                                            progress === 100 ? "bg-green-500" : "bg-blue-500"
                                        )}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Features (when expanded) */}
            {isExpanded && isSelected && (
                <div className="ml-6 border-l border-gray-800">
                    {loadingFeatures ? (
                        <div className="py-2 pl-3">
                            <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                        </div>
                    ) : features.length === 0 ? (
                        <div className="py-2 pl-3 text-xs text-gray-600">
                            No features
                        </div>
                    ) : (
                        features.map(feature => (
                            <FeatureTreeItem
                                key={feature.id}
                                feature={feature}
                                isSelected={selectedFeatureId === feature.id}
                                onSelect={() => onSelectFeature(feature.id)}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// Feature Tree Item
function FeatureTreeItem({
    feature,
    isSelected,
    onSelect,
}: {
    feature: FeatureWithStories;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const storyCount = feature.stories.length;
    const doneCount = feature.stories.filter(s => s.status === 'Done').length;
    const progress = storyCount > 0 ? Math.round((doneCount / storyCount) * 100) : 0;

    return (
        <div
            onClick={onSelect}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 cursor-pointer",
                isSelected
                    ? "bg-indigo-500/20 border-l-2 border-indigo-500 -ml-px"
                    : "hover:bg-gray-800/50 border-l-2 border-transparent -ml-px"
            )}
        >
            <Package className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <span className={cn(
                    "text-sm truncate block",
                    isSelected ? "text-white" : "text-gray-400"
                )}>
                    {feature.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-600">
                        {doneCount}/{storyCount}
                    </span>
                    {progress > 0 && (
                        <div className="w-10 h-0.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full",
                                    progress === 100 ? "bg-green-500" : "bg-indigo-500"
                                )}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Create Epic Dialog
function CreateEpicDialog({
    projectId,
    onEpicCreated,
}: {
    projectId: string;
    onEpicCreated: (epic: Epic) => void;
}) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');

    const resetForm = () => {
        setName('');
        setDescription('');
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
                priority,
            });

            resetForm();
            setOpen(false);
            onEpicCreated(epic);
        } catch (err) {
            console.error('Error creating epic:', err);
            setError('Failed to create epic');
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
                        <Layers className="w-5 h-5 text-purple-400" />
                        Create Epic
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
                            Name <span className="text-red-400">*</span>
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., User Authentication"
                            className="bg-gray-800 border-gray-700"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-300">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What this epic aims to achieve..."
                            className="bg-gray-800 border-gray-700"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-300">Priority</label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as 'P0' | 'P1' | 'P2')}>
                            <SelectTrigger className="bg-gray-800 border-gray-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITIES.map(p => (
                                    <SelectItem key={p.value} value={p.value}>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("w-2 h-2 rounded-full", p.color)} />
                                            {p.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

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
                            disabled={!name.trim() || isSubmitting}
                            className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
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
