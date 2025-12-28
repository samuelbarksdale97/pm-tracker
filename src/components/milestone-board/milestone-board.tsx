'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    UserStory,
    Milestone,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    updateUserStoryMilestone,
    bulkAssignStories,
    lockMilestone,
    duplicateMilestone,
    resetAllMilestoneAssignments
} from '@/lib/supabase';
import { MilestoneBoardHeader } from './milestone-board-header';
import { MilestoneBoardFilters } from './milestone-board-filters';
import { MilestoneColumn } from './milestone-column';
import { BacklogColumn } from './backlog-column';
import { CreateMilestoneDialog } from './create-milestone-dialog';
import { EmptyState } from './empty-state';
import { MilestoneBoardProps } from './types';

export function MilestoneBoard({
    projectId,
    milestones,
    userStories,
    onRefresh,
    onUserStoryCreated
}: MilestoneBoardProps) {
    // Dialog state
    const [isCreating, setIsCreating] = useState(false);

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtering state
    const [searchQuery, setSearchQuery] = useState('');
    const [workstreamFilter, setWorkstreamFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');

    // Bulk selection state
    const [selectedStories, setSelectedStories] = useState<Set<string>>(new Set());
    const [bulkMode, setBulkMode] = useState(false);

    // Get unique workstreams from stories
    const workstreams = useMemo(() => {
        const areas = new Set(userStories.map(s => s.feature_area));
        return Array.from(areas).sort();
    }, [userStories]);

    // Filter stories based on search and filters
    const filteredStories = useMemo(() => {
        return userStories.filter(story => {
            const matchesSearch = searchQuery === '' ||
                story.narrative.toLowerCase().includes(searchQuery.toLowerCase()) ||
                story.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesWorkstream = workstreamFilter === 'all' || story.feature_area === workstreamFilter;
            const matchesPriority = priorityFilter === 'all' || story.priority === priorityFilter;
            return matchesSearch && matchesWorkstream && matchesPriority;
        });
    }, [userStories, searchQuery, workstreamFilter, priorityFilter]);

    // Group user stories by milestone
    const storiesByMilestone = useMemo(() => {
        const grouped: Record<string, UserStory[]> = { backlog: [] };
        milestones.forEach(m => { grouped[m.id] = []; });

        filteredStories.forEach(us => {
            if (us.milestone_id && grouped[us.milestone_id]) {
                grouped[us.milestone_id].push(us);
            } else {
                grouped.backlog.push(us);
            }
        });
        return grouped;
    }, [milestones, filteredStories]);

    const allStoriesAssigned = storiesByMilestone.backlog.length === 0;
    const hasActiveFilters = searchQuery !== '' || workstreamFilter !== 'all' || priorityFilter !== 'all';

    // Handlers
    const handleCreateMilestone = useCallback(async (name: string, startDate: string, endDate: string) => {
        setIsSubmitting(true);
        try {
            await createMilestone({
                project_id: projectId,
                name,
                start_date: startDate || endDate,
                target_date: endDate,
            });
            setIsCreating(false);
            onRefresh();
        } catch (err) {
            console.error('Error creating milestone:', err);
        } finally {
            setIsSubmitting(false);
        }
    }, [projectId, onRefresh]);

    const handleUpdateMilestone = useCallback(async (id: string, name: string, startDate: string, endDate: string) => {
        if (!name.trim() || !endDate) return;
        setIsSubmitting(true);
        try {
            await updateMilestone(id, {
                name,
                start_date: startDate || endDate,
                target_date: endDate
            });
            setEditingId(null);
            onRefresh();
        } catch (err) {
            console.error('Error updating milestone:', err);
        } finally {
            setIsSubmitting(false);
        }
    }, [onRefresh]);

    const handleDeleteMilestone = useCallback(async (id: string) => {
        const stories = storiesByMilestone[id] || [];
        if (!confirm(`Delete this milestone? ${stories.length} stories will be moved to Backlog.`)) return;
        try {
            await deleteMilestone(id);
            onRefresh();
        } catch (err) {
            console.error('Error deleting milestone:', err);
        }
    }, [storiesByMilestone, onRefresh]);

    const handleLockMilestone = useCallback(async (id: string, lock: boolean) => {
        try {
            await lockMilestone(id, lock);
            onRefresh();
        } catch (err) {
            console.error('Error locking milestone:', err);
        }
    }, [onRefresh]);

    const handleDuplicateMilestone = useCallback(async (id: string) => {
        try {
            await duplicateMilestone(id);
            onRefresh();
        } catch (err) {
            console.error('Error duplicating milestone:', err);
        }
    }, [onRefresh]);

    const handleMoveStory = useCallback(async (storyId: string, newMilestoneId: string | null) => {
        try {
            await updateUserStoryMilestone(storyId, newMilestoneId);
            onRefresh();
        } catch (err) {
            console.error('Error moving story:', err);
        }
    }, [onRefresh]);

    const handleBulkAssign = useCallback(async (milestoneId: string | null) => {
        if (selectedStories.size === 0) return;
        try {
            await bulkAssignStories(Array.from(selectedStories), milestoneId);
            setSelectedStories(new Set());
            setBulkMode(false);
            onRefresh();
        } catch (err) {
            console.error('Error bulk assigning:', err);
        }
    }, [selectedStories, onRefresh]);

    const handleResetAll = useCallback(async () => {
        const assignedCount = userStories.filter(s => s.milestone_id).length;
        if (assignedCount === 0) {
            alert('No stories are assigned to milestones.');
            return;
        }
        if (!confirm(`Reset all milestone assignments? This will move ${assignedCount} stories back to the Backlog.`)) return;
        try {
            await resetAllMilestoneAssignments(projectId);
            onRefresh();
        } catch (err) {
            console.error('Error resetting assignments:', err);
        }
    }, [projectId, userStories, onRefresh]);

    const toggleStorySelection = useCallback((storyId: string) => {
        setSelectedStories(prev => {
            const next = new Set(prev);
            if (next.has(storyId)) {
                next.delete(storyId);
            } else {
                next.add(storyId);
            }
            return next;
        });
    }, []);

    const selectAllInMilestone = useCallback((milestoneId: string) => {
        const stories = storiesByMilestone[milestoneId] || [];
        setSelectedStories(prev => {
            const next = new Set(prev);
            stories.forEach(s => next.add(s.id));
            return next;
        });
    }, [storiesByMilestone]);

    const startEditing = useCallback((milestone: Milestone) => {
        setEditingId(milestone.id);
    }, []);

    const cancelEditing = useCallback(() => {
        setEditingId(null);
    }, []);

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setWorkstreamFilter('all');
        setPriorityFilter('all');
    }, []);

    const cancelBulkMode = useCallback(() => {
        setSelectedStories(new Set());
        setBulkMode(false);
    }, []);

    return (
        <div className="space-y-6">
            <MilestoneBoardHeader
                bulkMode={bulkMode}
                selectedCount={selectedStories.size}
                milestones={milestones}
                projectId={projectId}
                onBulkAssign={handleBulkAssign}
                onCancelBulkMode={cancelBulkMode}
                onEnableBulkMode={() => setBulkMode(true)}
                onResetAll={handleResetAll}
                onRefresh={onRefresh}
                onUserStoryCreated={onUserStoryCreated}
                onOpenCreateDialog={() => setIsCreating(true)}
            />

            <MilestoneBoardFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                workstreamFilter={workstreamFilter}
                onWorkstreamChange={setWorkstreamFilter}
                priorityFilter={priorityFilter}
                onPriorityChange={setPriorityFilter}
                workstreams={workstreams}
                onClearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
            />

            {/* Board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                <BacklogColumn
                    stories={storiesByMilestone.backlog}
                    milestones={milestones}
                    bulkMode={bulkMode}
                    selectedStories={selectedStories}
                    onToggleStorySelect={toggleStorySelection}
                    onSelectAllInMilestone={selectAllInMilestone}
                    onMoveStory={handleMoveStory}
                    allStoriesAssigned={allStoriesAssigned}
                />

                {milestones.map(milestone => (
                    <MilestoneColumn
                        key={milestone.id}
                        milestone={milestone}
                        stories={storiesByMilestone[milestone.id] || []}
                        allMilestones={milestones}
                        bulkMode={bulkMode}
                        selectedStories={selectedStories}
                        onToggleStorySelect={toggleStorySelection}
                        onSelectAllInMilestone={selectAllInMilestone}
                        onMoveStory={handleMoveStory}
                        onStartEditing={startEditing}
                        onUpdateMilestone={handleUpdateMilestone}
                        onDeleteMilestone={handleDeleteMilestone}
                        onLockMilestone={handleLockMilestone}
                        onDuplicateMilestone={handleDuplicateMilestone}
                        editingId={editingId}
                        onCancelEditing={cancelEditing}
                        isSubmitting={isSubmitting}
                    />
                ))}

                {milestones.length === 0 && (
                    <EmptyState onCreateClick={() => setIsCreating(true)} />
                )}
            </div>

            <CreateMilestoneDialog
                open={isCreating}
                onOpenChange={setIsCreating}
                onCreate={handleCreateMilestone}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
