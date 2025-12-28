'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Package,
    Plus,
    Loader2,
    Layers,
} from 'lucide-react';
import { Feature, getAllFeaturesForProject } from '@/lib/supabase';

interface FeatureNavColumnProps {
    projectId: string;
    selectedFeatureId: string | null;
    onSelectFeature: (featureId: string | null) => void;
    onFeatureCreated?: () => void;
}

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

export function FeatureNavColumn({
    projectId,
    selectedFeatureId,
    onSelectFeature,
    onFeatureCreated,
}: FeatureNavColumnProps) {
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);

    const loadFeatures = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllFeaturesForProject(projectId);
            setFeatures(data);
        } catch (err) {
            console.error('Error loading features:', err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadFeatures();
    }, [loadFeatures]);

    // Reload when feature is created
    useEffect(() => {
        if (onFeatureCreated) {
            loadFeatures();
        }
    }, [onFeatureCreated, loadFeatures]);

    // Group features by epic for display
    const featuresByEpic = features.reduce((acc, feature) => {
        const epicName = (feature as Feature & { epic?: { name: string } }).epic?.name || 'Unassigned';
        if (!acc[epicName]) acc[epicName] = [];
        acc[epicName].push(feature);
        return acc;
    }, {} as Record<string, Feature[]>);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-medium text-white">Features</span>
                        <span className="text-xs text-gray-500">({features.length})</span>
                    </div>
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
                        <p className="text-sm text-gray-500">No features yet</p>
                        <p className="text-xs text-gray-600 mt-1">Create features in an Epic to get started</p>
                    </div>
                ) : (
                    <div className="py-1">
                        {Object.entries(featuresByEpic).map(([epicName, epicFeatures]) => (
                            <div key={epicName}>
                                {/* Epic Group Header */}
                                <div className="px-3 py-1.5 bg-gray-900/30 border-b border-gray-800/50 sticky top-0">
                                    <div className="flex items-center gap-1.5">
                                        <Layers className="w-3 h-3 text-purple-400/70" />
                                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                                            {epicName}
                                        </span>
                                    </div>
                                </div>

                                {/* Features in this Epic */}
                                {epicFeatures.map(feature => (
                                    <FeatureItem
                                        key={feature.id}
                                        feature={feature}
                                        isSelected={selectedFeatureId === feature.id}
                                        onSelect={() => onSelectFeature(feature.id)}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Feature Item Component
function FeatureItem({
    feature,
    isSelected,
    onSelect,
}: {
    feature: Feature;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const storyCount = feature.user_story_count || 0;
    const doneCount = feature.completed_story_count || 0;
    const progress = storyCount > 0 ? Math.round((doneCount / storyCount) * 100) : 0;

    return (
        <div
            onClick={onSelect}
            className={cn(
                "px-3 py-2 cursor-pointer border-l-2 transition-colors",
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
                            "text-sm font-medium truncate",
                            isSelected ? "text-white" : "text-gray-300"
                        )}>
                            {feature.name}
                        </span>
                        <Badge className={cn("text-[10px] px-1 py-0", priorityColors[feature.priority])}>
                            {feature.priority}
                        </Badge>
                    </div>

                    {/* Description preview */}
                    {feature.description && (
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {feature.description}
                        </p>
                    )}

                    {/* Progress */}
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
}
