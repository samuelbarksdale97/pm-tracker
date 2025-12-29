'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    UserStory,
    Milestone,
    Feature,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    updateUserStoryMilestone,
    bulkAssignStories,
    lockMilestone,
    duplicateMilestone,
    resetAllMilestoneAssignments,
    updateFeatureMilestone,
    bulkAssignFeatures,
    resetAllFeatureMilestoneAssignments
} from '@/lib/supabase';
import { MilestoneBoardHeader } from './milestone-board-header';
import { MilestoneBoardFilters } from './milestone-board-filters';
import { MilestoneColumn } from './milestone-column';
import { BacklogColumn } from './backlog-column';
import { CreateMilestoneDialog } from './create-milestone-dialog';
import { EmptyState } from './empty-state';
import { MilestoneBoardProps, MilestoneBoardMode } from './types';

export function MilestoneBoard({
    projectId,
    milestones,
    userStories,
    features,
    onRefresh,
    onUserStoryCreated
}: MilestoneBoardProps) {
    // Dialog state
    const [isCreating, setIsCreating] = useState(false);

    // Mode state (features or stories)
    const [mode, setMode] = useState<MilestoneBoardMode>('features');

    // Editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtering state
    const [searchQuery, setSearchQuery] = useState('');
    const [workstreamFilter, setWorkstreamFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');

    // Bulk selection state
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [bulkMode, setBulkMode] = useState(false);

    // Get unique workstreams from stories or epics from features
    const workstreams = useMemo(() => {
        if (mode === 'features') {
            const epics = new Set(features.map(f => f.epic?.name).filter(Boolean));
            return Array.from(epics).sort() as string[];
        } else {
            const areas = new Set(userStories.map(s => s.feature_area));
            return Array.from(areas).sort();
        }
    }, [mode, features, userStories]);

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

    // Filter features based on search and filters
    const filteredFeatures = useMemo(() => {
        return features.filter(feature => {
            const matchesSearch = searchQuery === '' ||
                feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                feature.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (feature.description && feature.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesWorkstream = workstreamFilter === 'all' || feature.epic?.name === workstreamFilter;
            const matchesPriority = priorityFilter === 'all' || feature.priority === priorityFilter;
            return matchesSearch && matchesWorkstream && matchesPriority;
        });
    }, [features, searchQuery, workstreamFilter, priorityFilter]);

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

    // Group features by milestone
    const featuresByMilestone = useMemo(() => {
        const grouped: Record<string, Feature[]> = { backlog: [] };
        milestones.forEach(m => { grouped[m.id] = []; });

        filteredFeatures.forEach(f => {
            if (f.milestone_id && grouped[f.milestone_id]) {
                grouped[f.milestone_id].push(f);
            } else {
                grouped.backlog.push(f);
            }
        });
        return grouped;
    }, [milestones, filteredFeatures]);

    const allItemsAssigned = mode === 'features'
        ? featuresByMilestone.backlog.length === 0
        : storiesByMilestone.backlog.length === 0;
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
        const feats = featuresByMilestone[id] || [];
        const itemCount = mode === 'features' ? feats.length : stories.length;
        const itemType = mode === 'features' ? 'features' : 'stories';
        if (!confirm(`Delete this milestone? ${itemCount} ${itemType} will be moved to Backlog.`)) return;
        try {
            await deleteMilestone(id);
            onRefresh();
        } catch (err) {
            console.error('Error deleting milestone:', err);
        }
    }, [storiesByMilestone, featuresByMilestone, mode, onRefresh]);

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

    const handleMoveFeature = useCallback(async (featureId: string, newMilestoneId: string | null) => {
        try {
            await updateFeatureMilestone(featureId, newMilestoneId);
            onRefresh();
        } catch (err) {
            console.error('Error moving feature:', err);
        }
    }, [onRefresh]);

    const handleBulkAssign = useCallback(async (milestoneId: string | null) => {
        if (selectedItems.size === 0) return;
        try {
            if (mode === 'features') {
                await bulkAssignFeatures(Array.from(selectedItems), milestoneId);
            } else {
                await bulkAssignStories(Array.from(selectedItems), milestoneId);
            }
            setSelectedItems(new Set());
            setBulkMode(false);
            onRefresh();
        } catch (err) {
            console.error('Error bulk assigning:', err);
        }
    }, [selectedItems, mode, onRefresh]);

    const handleResetAll = useCallback(async () => {
        const assignedCount = mode === 'features'
            ? features.filter(f => f.milestone_id).length
            : userStories.filter(s => s.milestone_id).length;
        const itemType = mode === 'features' ? 'features' : 'stories';

        if (assignedCount === 0) {
            alert(`No ${itemType} are assigned to milestones.`);
            return;
        }
        if (!confirm(`Reset all milestone assignments? This will move ${assignedCount} ${itemType} back to the Backlog.`)) return;
        try {
            if (mode === 'features') {
                await resetAllFeatureMilestoneAssignments(projectId);
            } else {
                await resetAllMilestoneAssignments(projectId);
            }
            onRefresh();
        } catch (err) {
            console.error('Error resetting assignments:', err);
        }
    }, [projectId, mode, features, userStories, onRefresh]);

    const toggleItemSelection = useCallback((itemId: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    }, []);

    const selectAllInMilestone = useCallback((milestoneId: string) => {
        const items = mode === 'features'
            ? featuresByMilestone[milestoneId] || []
            : storiesByMilestone[milestoneId] || [];
        setSelectedItems(prev => {
            const next = new Set(prev);
            items.forEach(item => next.add(item.id));
            return next;
        });
    }, [mode, featuresByMilestone, storiesByMilestone]);

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
        setSelectedItems(new Set());
        setBulkMode(false);
    }, []);

    const handleModeChange = useCallback((newMode: MilestoneBoardMode) => {
        setMode(newMode);
        setSelectedItems(new Set());
        setBulkMode(false);
        // Reset filters when switching modes since workstreams differ
        setWorkstreamFilter('all');
    }, []);

    const handleDrop = useCallback((milestoneId: string | null) => {
        // This is handled in the column components via drag/drop events
    }, []);

    return (
        <div className="space-y-6">
            <MilestoneBoardHeader
                bulkMode={bulkMode}
                selectedCount={selectedItems.size}
                milestones={milestones}
                projectId={projectId}
                onBulkAssign={handleBulkAssign}
                onCancelBulkMode={cancelBulkMode}
                onEnableBulkMode={() => setBulkMode(true)}
                onResetAll={handleResetAll}
                onRefresh={onRefresh}
                onUserStoryCreated={onUserStoryCreated}
                onOpenCreateDialog={() => setIsCreating(true)}
                mode={mode}
                onModeChange={handleModeChange}
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
                    features={featuresByMilestone.backlog}
                    milestones={milestones}
                    bulkMode={bulkMode}
                    selectedItems={selectedItems}
                    onToggleItemSelect={toggleItemSelection}
                    onSelectAllInMilestone={selectAllInMilestone}
                    onMoveStory={handleMoveStory}
                    onMoveFeature={handleMoveFeature}
                    allItemsAssigned={allItemsAssigned}
                    mode={mode}
                    onDrop={handleDrop}
                />

                {milestones.map(milestone => (
                    <MilestoneColumn
                        key={milestone.id}
                        milestone={milestone}
                        stories={storiesByMilestone[milestone.id] || []}
                        features={featuresByMilestone[milestone.id] || []}
                        allMilestones={milestones}
                        bulkMode={bulkMode}
                        selectedItems={selectedItems}
                        onToggleItemSelect={toggleItemSelection}
                        onSelectAllInMilestone={selectAllInMilestone}
                        onMoveStory={handleMoveStory}
                        onMoveFeature={handleMoveFeature}
                        onStartEditing={startEditing}
                        onUpdateMilestone={handleUpdateMilestone}
                        onDeleteMilestone={handleDeleteMilestone}
                        onLockMilestone={handleLockMilestone}
                        onDuplicateMilestone={handleDuplicateMilestone}
                        editingId={editingId}
                        onCancelEditing={cancelEditing}
                        isSubmitting={isSubmitting}
                        mode={mode}
                        onDrop={handleDrop}
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
