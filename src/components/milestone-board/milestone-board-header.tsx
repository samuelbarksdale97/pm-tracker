'use client';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, CheckSquare, RotateCcw } from 'lucide-react';
import { CreateStoryDialog } from '../create-story-dialog';
import { MilestoneBoardHeaderProps } from './types';

export function MilestoneBoardHeader({
    bulkMode,
    selectedCount,
    milestones,
    projectId,
    onBulkAssign,
    onCancelBulkMode,
    onEnableBulkMode,
    onResetAll,
    onRefresh,
    onUserStoryCreated,
    onOpenCreateDialog,
}: MilestoneBoardHeaderProps) {
    return (
        <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
                <h2 className="text-xl font-bold text-white">Milestone Board</h2>
                <p className="text-gray-400 text-sm">
                    {bulkMode
                        ? `${selectedCount} stories selected`
                        : 'Assign stories to milestones'
                    }
                </p>
            </div>
            <div className="flex items-center gap-2">
                {bulkMode ? (
                    <>
                        <Select onValueChange={(val) => onBulkAssign(val === 'backlog' ? null : val)}>
                            <SelectTrigger className="w-40 bg-gray-800 border-gray-700">
                                <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-800">
                                <SelectItem value="backlog">Backlog</SelectItem>
                                {milestones.filter(m => !m.is_locked).map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" onClick={onCancelBulkMode}>
                            Cancel
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            className="gap-2 bg-gray-800 border-gray-700 text-red-400 hover:text-red-300 hover:border-red-700"
                            onClick={onResetAll}
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset All
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 bg-gray-800 border-gray-700"
                            onClick={onEnableBulkMode}
                        >
                            <CheckSquare className="w-4 h-4" />
                            Bulk Select
                        </Button>
                        <CreateStoryDialog
                            projectId={projectId}
                            onUserStoryCreated={(userStory) => {
                                onRefresh();
                                onUserStoryCreated?.(userStory);
                            }}
                        />
                        <Button className="gap-2" variant="outline" onClick={onOpenCreateDialog}>
                            <Plus className="w-4 h-4" />
                            New Milestone
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
