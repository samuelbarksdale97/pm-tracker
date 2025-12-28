'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartyPopper } from 'lucide-react';
import { StoryCard } from './story-card';
import { BacklogColumnProps } from './types';

export function BacklogColumn({
    stories,
    milestones,
    bulkMode,
    selectedStories,
    onToggleStorySelect,
    onSelectAllInMilestone,
    onMoveStory,
    allStoriesAssigned,
}: BacklogColumnProps) {
    const unlockedMilestones = milestones.filter(m => !m.is_locked);

    return (
        <Card className="bg-gray-900 border-gray-800 border-dashed min-w-[320px] max-w-[320px] flex-shrink-0">
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-600 border-2 border-dashed border-gray-500" />
                        <span className="font-medium text-gray-400">Backlog</span>
                    </div>
                    {bulkMode && stories.length > 0 && (
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
                <p className="text-xs text-gray-500">{stories.length} stories</p>
            </div>
            <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                {stories.map(story => (
                    <StoryCard
                        key={story.id}
                        story={story}
                        milestones={unlockedMilestones}
                        onMove={onMoveStory}
                        bulkMode={bulkMode}
                        isSelected={selectedStories.has(story.id)}
                        onToggleSelect={() => onToggleStorySelect(story.id)}
                    />
                ))}
                {stories.length === 0 && (
                    <div className="text-center py-8">
                        {allStoriesAssigned ? (
                            <div className="space-y-2">
                                <PartyPopper className="w-8 h-8 mx-auto text-yellow-400" />
                                <p className="text-green-400 font-medium">All stories assigned!</p>
                            </div>
                        ) : (
                            <p className="text-gray-600 text-sm">No matching stories</p>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
