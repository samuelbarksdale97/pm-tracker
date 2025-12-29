'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CheckSquare, Square, Layers, GripVertical, BookOpen, CheckCircle2 } from 'lucide-react';
import { Feature, Milestone } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
    feature: Feature;
    milestones: Milestone[];
    onMove?: (featureId: string, milestoneId: string | null) => void;
    bulkMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    disabled?: boolean;
}

const priorityConfig: Record<string, { badge: string; border: string }> = {
    'P0': { badge: 'bg-red-600 text-white', border: 'border-l-red-500' },
    'P1': { badge: 'bg-yellow-500 text-black', border: 'border-l-yellow-500' },
    'P2': { badge: 'bg-gray-500 text-white', border: 'border-l-gray-500' },
};

const statusConfig: Record<string, { color: string; label: string }> = {
    'Not Started': { color: 'bg-gray-500', label: 'Not Started' },
    'In Progress': { color: 'bg-blue-500', label: 'In Progress' },
    'Done': { color: 'bg-green-500', label: 'Done' },
    'On Hold': { color: 'bg-amber-500', label: 'On Hold' },
};

export function FeatureCard({
    feature,
    milestones,
    onMove,
    bulkMode,
    isSelected,
    onToggleSelect,
    disabled
}: FeatureCardProps) {
    const handleDragStart = (e: React.DragEvent) => {
        if (disabled || bulkMode) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: 'feature',
            id: feature.id,
        }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const priorityStyle = priorityConfig[feature.priority] || priorityConfig['P2'];
    const statusStyle = statusConfig[feature.status] || statusConfig['Not Started'];

    const storyCount = feature.user_story_count || 0;
    const completedCount = feature.completed_story_count || 0;
    const progressPercent = storyCount > 0 ? (completedCount / storyCount) * 100 : 0;

    return (
        <Card
            draggable={!disabled && !bulkMode}
            onDragStart={handleDragStart}
            className={cn(
                'bg-gray-800/80 border-gray-700 border-l-4 p-4 transition-all group',
                priorityStyle.border,
                disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-800 hover:border-gray-600 cursor-grab active:cursor-grabbing',
                isSelected && 'ring-2 ring-blue-500 bg-gray-800',
            )}
            onClick={bulkMode ? onToggleSelect : undefined}
        >
            {/* Header - ID, Priority, Status */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    {bulkMode && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelect?.();
                            }}
                            className="flex-shrink-0"
                        >
                            {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-400" />
                            ) : (
                                <Square className="w-4 h-4 text-gray-500" />
                            )}
                        </button>
                    )}
                    {!bulkMode && !disabled && (
                        <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    )}
                    <Layers className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-gray-500">FEAT-{feature.id.slice(-7)}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-xs px-2 py-0.5 font-semibold ${priorityStyle.badge}`}>
                        {feature.priority}
                    </Badge>
                    <div className={`w-2.5 h-2.5 rounded-full ${statusStyle.color}`} title={statusStyle.label} />
                </div>
            </div>

            {/* Title */}
            <h4 className="text-sm font-semibold text-white mb-2 line-clamp-2 leading-snug">
                {feature.name}
            </h4>

            {/* Description */}
            {feature.description && (
                <p className="text-xs text-gray-400 mb-3 line-clamp-1 leading-relaxed">
                    {feature.description}
                </p>
            )}

            {/* Progress Bar (if has stories) */}
            {storyCount > 0 && (
                <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Stories
                        </span>
                        <span className="font-medium">
                            {completedCount}/{storyCount}
                            {progressPercent === 100 && <CheckCircle2 className="w-3 h-3 text-green-500 inline ml-1" />}
                        </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
                            )}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer - Epic & Milestone Selector */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-700/50">
                <div className="flex items-center gap-2 min-w-0">
                    {feature.epic && (
                        <Badge variant="outline" className="text-xs text-gray-400 border-gray-600 bg-gray-700/30 truncate max-w-[140px]">
                            {feature.epic.name}
                        </Badge>
                    )}
                </div>
                {!bulkMode && onMove && !disabled && (
                    <Select
                        value={feature.milestone_id || 'backlog'}
                        onValueChange={(value) => onMove(feature.id, value === 'backlog' ? null : value)}
                    >
                        <SelectTrigger className="h-7 w-28 text-xs bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800">
                            <SelectItem value="backlog" className="text-xs">Backlog</SelectItem>
                            {milestones.map(m => (
                                <SelectItem key={m.id} value={m.id} className="text-xs">
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </Card>
    );
}
