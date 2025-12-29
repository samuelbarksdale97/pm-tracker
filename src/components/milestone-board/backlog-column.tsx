'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartyPopper } from 'lucide-react';
import { StoryCard } from './story-card';
import { FeatureCard } from './feature-card';
import { BacklogColumnProps } from './types';
import { cn } from '@/lib/utils';

export function BacklogColumn({
    stories,
    features,
    milestones,
    bulkMode,
    selectedItems,
    onToggleItemSelect,
    onSelectAllInMilestone,
    onMoveStory,
    onMoveFeature,
    allItemsAssigned,
    mode,
    onDrop,
    isDragOver,
}: BacklogColumnProps) {
    const [localDragOver, setLocalDragOver] = useState(false);
    const unlockedMilestones = milestones.filter(m => !m.is_locked);
    const items = mode === 'features' ? features : stories;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setLocalDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setLocalDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setLocalDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'feature') {
                onMoveFeature(data.id, null);
            } else if (data.type === 'story') {
                onMoveStory(data.id, null);
            }
        } catch (err) {
            console.error('Error parsing drop data:', err);
        }
    };

    return (
        <Card
            className={cn(
                'bg-gray-900 border-gray-800 border-dashed min-w-[320px] max-w-[320px] flex-shrink-0 transition-all',
                (isDragOver || localDragOver) && 'border-blue-500 bg-blue-500/5'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="p-4 border-b border-gray-800 min-h-[88px]">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-600 border-2 border-dashed border-gray-500" />
                        <span className="font-medium text-gray-400">Backlog</span>
                    </div>
                    {bulkMode && items.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => onSelectAllInMilestone('backlog')}
                        >
                            Select all
                        </Button>
                    )}
                </div>
                <p className="text-xs text-gray-500">{items.length} {mode === 'features' ? 'features' : 'stories'}</p>
            </div>
            <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                {mode === 'features' ? (
                    features.map(feature => (
                        <FeatureCard
                            key={feature.id}
                            feature={feature}
                            milestones={unlockedMilestones}
                            onMove={onMoveFeature}
                            bulkMode={bulkMode}
                            isSelected={selectedItems.has(feature.id)}
                            onToggleSelect={() => onToggleItemSelect(feature.id)}
                        />
                    ))
                ) : (
                    stories.map(story => (
                        <StoryCard
                            key={story.id}
                            story={story}
                            milestones={unlockedMilestones}
                            onMove={onMoveStory}
                            bulkMode={bulkMode}
                            isSelected={selectedItems.has(story.id)}
                            onToggleSelect={() => onToggleItemSelect(story.id)}
                        />
                    ))
                )}
                {items.length === 0 && (
                    <div className="text-center py-8">
                        {allItemsAssigned ? (
                            <div className="space-y-2">
                                <PartyPopper className="w-8 h-8 mx-auto text-yellow-400" />
                                <p className="text-green-400 font-medium">All {mode === 'features' ? 'features' : 'stories'} assigned!</p>
                            </div>
                        ) : (
                            <p className="text-gray-600 text-sm">No matching {mode === 'features' ? 'features' : 'stories'}</p>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
