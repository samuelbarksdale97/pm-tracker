'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Gantt, Task, ViewMode } from '@rsagiev/gantt-task-react-19';
import '@rsagiev/gantt-task-react-19/dist/index.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
import {
    UserStory,
    Milestone,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    resetAllMilestoneAssignments,
} from '@/lib/supabase';

interface MilestoneGanttR19Props {
    projectId: string;
    milestones: Milestone[];
    userStories: UserStory[];
    onRefresh: () => void;
}

const MILESTONE_COLORS = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
    '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];

export function MilestoneGanttR19({ projectId, milestones, userStories, onRefresh }: MilestoneGanttR19Props) {
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [newName, setNewName] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);

    // Local state for milestones - enables optimistic updates
    const [localMilestones, setLocalMilestones] = useState<Milestone[]>(milestones);

    // Sync local state when props change (e.g., after create/delete)
    useEffect(() => {
        setLocalMilestones(milestones);
    }, [milestones]);

    // Convert milestones to Gantt Task format
    const tasks: Task[] = useMemo(() => {
        return localMilestones.map((m, index) => {
            const stories = userStories.filter(us => us.milestone_id === m.id);
            const doneCount = stories.filter(s => s.status === 'Done').length;
            const progress = stories.length > 0 ? Math.round((doneCount / stories.length) * 100) : 0;

            const startDate = new Date(m.start_date || m.target_date);
            const endDate = new Date(m.target_date);

            // Ensure end date is after start date
            if (endDate <= startDate) {
                endDate.setDate(startDate.getDate() + 1);
            }

            return {
                id: m.id,
                name: m.name,
                start: startDate,
                end: endDate,
                progress,
                type: 'task' as const,
                isDisabled: false,
                styles: {
                    backgroundColor: m.color || MILESTONE_COLORS[index % MILESTONE_COLORS.length],
                    backgroundSelectedColor: m.color || MILESTONE_COLORS[index % MILESTONE_COLORS.length],
                    progressColor: '#22c55e',
                    progressSelectedColor: '#16a34a',
                }
            };
        });
    }, [localMilestones, userStories]);

    const handleCreateMilestone = async () => {
        if (!newName.trim() || !newStartDate || !newEndDate) return;
        setIsSubmitting(true);
        try {
            const colorIndex = milestones.length % MILESTONE_COLORS.length;
            await createMilestone({
                project_id: projectId,
                name: newName,
                start_date: newStartDate,
                target_date: newEndDate,
                color: MILESTONE_COLORS[colorIndex]
            });
            setNewName('');
            setNewStartDate('');
            setNewEndDate('');
            setIsCreating(false);
            onRefresh();
        } catch (err) {
            console.error('Error creating milestone:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditMilestone = async () => {
        if (!editingMilestone || !newName.trim() || !newStartDate || !newEndDate) return;
        setIsSubmitting(true);
        try {
            await updateMilestone(editingMilestone.id, {
                name: newName,
                start_date: newStartDate,
                target_date: newEndDate
            });
            setEditingMilestone(null);
            setIsEditing(false);
            onRefresh();
        } catch (err) {
            console.error('Error updating milestone:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMilestone = async (id: string) => {
        if (!confirm('Delete this milestone? Stories will become unassigned.')) return;
        try {
            await deleteMilestone(id);
            onRefresh();
        } catch (err) {
            console.error('Error deleting milestone:', err);
        }
    };

    const handleResetAll = async () => {
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
    };

    const openEditDialog = (milestone: Milestone) => {
        setEditingMilestone(milestone);
        setNewName(milestone.name);
        setNewStartDate(milestone.start_date || '');
        setNewEndDate(milestone.target_date);
        setIsEditing(true);
    };

    // Handle task date changes from drag - OPTIMISTIC UPDATE
    const handleTaskChange = useCallback(async (task: Task) => {
        const newStartDate = task.start.toISOString().split('T')[0];
        const newEndDate = task.end.toISOString().split('T')[0];

        // 1. Immediately update local state (optimistic)
        setLocalMilestones(prev => prev.map(m =>
            m.id === task.id
                ? { ...m, start_date: newStartDate, target_date: newEndDate }
                : m
        ));

        // 2. Persist to database in background (no refresh needed)
        try {
            await updateMilestone(task.id, {
                start_date: newStartDate,
                target_date: newEndDate
            });
            // Success - no refresh needed, local state already updated
        } catch (err) {
            console.error('Error updating milestone dates:', err);
            // Rollback on error - restore from props
            setLocalMilestones(milestones);
        }
    }, [milestones]);

    // Available (unassigned) user stories
    const availableStories = useMemo(() => {
        return userStories.filter(us => !us.milestone_id);
    }, [userStories]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Key Project Milestone Tracker</h2>
                    <p className="text-gray-400 text-sm">Visual timeline of project milestones • Drag bars to adjust dates</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Mode Controls */}
                    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                        <Button
                            size="sm"
                            variant={viewMode === ViewMode.Day ? 'default' : 'ghost'}
                            onClick={() => setViewMode(ViewMode.Day)}
                            className="text-xs h-7"
                        >
                            Day
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === ViewMode.Week ? 'default' : 'ghost'}
                            onClick={() => setViewMode(ViewMode.Week)}
                            className="text-xs h-7"
                        >
                            Week
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === ViewMode.Month ? 'default' : 'ghost'}
                            onClick={() => setViewMode(ViewMode.Month)}
                            className="text-xs h-7"
                        >
                            Month
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        className="gap-2 bg-gray-800 border-gray-700 text-red-400 hover:text-red-300 hover:border-red-700"
                        onClick={handleResetAll}
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset All
                    </Button>

                    <Dialog open={isCreating} onOpenChange={setIsCreating}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4" />
                                Add Milestone
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900 border-gray-800">
                            <DialogHeader>
                                <DialogTitle className="text-white">Create Milestone</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Name</label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g., MVP Complete"
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Start Date</label>
                                        <Input
                                            type="date"
                                            value={newStartDate}
                                            onChange={(e) => setNewStartDate(e.target.value)}
                                            className="bg-gray-800 border-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">End Date</label>
                                        <Input
                                            type="date"
                                            value={newEndDate}
                                            onChange={(e) => setNewEndDate(e.target.value)}
                                            className="bg-gray-800 border-gray-700"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                    <Button onClick={handleCreateMilestone} disabled={isSubmitting || !newName || !newStartDate || !newEndDate}>
                                        {isSubmitting ? 'Creating...' : 'Create'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Dialog */}
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                        <DialogContent className="bg-gray-900 border-gray-800">
                            <DialogHeader>
                                <DialogTitle className="text-white">Edit Milestone</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Name</label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g., MVP Complete"
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Start Date</label>
                                        <Input
                                            type="date"
                                            value={newStartDate}
                                            onChange={(e) => setNewStartDate(e.target.value)}
                                            className="bg-gray-800 border-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">End Date</label>
                                        <Input
                                            type="date"
                                            value={newEndDate}
                                            onChange={(e) => setNewEndDate(e.target.value)}
                                            className="bg-gray-800 border-gray-700"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    <Button onClick={handleEditMilestone} disabled={isSubmitting || !newName || !newStartDate || !newEndDate}>
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Month Context Bar - Always visible */}
            <div className="bg-gray-800 rounded-lg p-2 flex items-center gap-4">
                <span className="text-gray-400 text-sm">Current View:</span>
                <span className="text-white font-medium">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                {viewMode === ViewMode.Day && (
                    <span className="text-gray-500 text-xs ml-auto">
                        Scroll horizontally to see more dates → Dec 2024 / Jan 2025
                    </span>
                )}
            </div>

            {/* Gantt Chart */}
            <Card className="bg-gray-900 border-gray-800 overflow-hidden rounded-xl gantt-dark-mode">
                <style jsx global>{`
                    .gantt-dark-mode .gantt-chart {
                        background: #111827 !important;
                    }
                    .gantt-dark-mode .calendar-header {
                        background: #1f2937 !important;
                        border-bottom: 1px solid #374151 !important;
                    }
                    .gantt-dark-mode .calendar-header-text {
                        color: #9ca3af !important;
                    }
                    .gantt-dark-mode .grid-row {
                        background: #111827 !important;
                    }
                    .gantt-dark-mode .grid-row:nth-child(even) {
                        background: #1f2937 !important;
                    }
                    .gantt-dark-mode .grid-row-line {
                        stroke: #374151 !important;
                    }
                    .gantt-dark-mode .today-line {
                        stroke: #ef4444 !important;
                        stroke-width: 2px !important;
                    }
                    .gantt-dark-mode text {
                        fill: #d1d5db !important;
                    }
                    .gantt-dark-mode .bar-wrapper text {
                        fill: #ffffff !important;
                    }
                `}</style>
                <div className="p-4" style={{ minHeight: '400px' }}>
                    {tasks.length > 0 ? (
                        <Gantt
                            tasks={tasks}
                            viewMode={viewMode}
                            onDateChange={handleTaskChange}
                            onProgressChange={handleTaskChange}
                            listCellWidth=""
                            columnWidth={viewMode === ViewMode.Day ? 60 : viewMode === ViewMode.Week ? 250 : 300}
                            headerHeight={50}
                            rowHeight={50}
                            barCornerRadius={4}
                            barProgressColor="#22c55e"
                            barProgressSelectedColor="#16a34a"
                            todayColor="rgba(239, 68, 68, 0.3)"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-500">
                            No milestones yet. Click "Add Milestone" to create one.
                        </div>
                    )}
                </div>
            </Card>

            {/* Milestone List for Quick Editing */}
            <Card className="bg-gray-900 border-gray-800 p-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Manage Milestones</h3>
                <div className="space-y-2">
                    {localMilestones.map((m, idx) => {
                        const stories = userStories.filter(us => us.milestone_id === m.id);
                        const doneCount = stories.filter(s => s.status === 'Done').length;
                        return (
                            <div key={m.id} className="flex items-center justify-between bg-gray-800 rounded p-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: m.color || MILESTONE_COLORS[idx % MILESTONE_COLORS.length] }}
                                    />
                                    <div>
                                        <p className="text-white font-medium">{m.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {m.start_date} → {m.target_date} • {doneCount}/{stories.length} done
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-400 hover:text-blue-300"
                                        onClick={() => openEditDialog(m)}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300"
                                        onClick={() => handleDeleteMilestone(m.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Available Stories Pool */}
            <Card className="bg-gray-900 border-gray-800 border-dashed p-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">
                    Available User Stories
                    <span className="text-gray-500 font-normal ml-2">({availableStories.length} unassigned)</span>
                </h3>
                {availableStories.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">🎉 All user stories are assigned to milestones!</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                        {availableStories.slice(0, 6).map(story => (
                            <div key={story.id} className="flex items-center gap-2 bg-gray-800 rounded p-2 text-sm">
                                <span className="font-mono text-gray-500 text-xs">{story.id}</span>
                                <span className="text-gray-400 truncate">{story.narrative}</span>
                            </div>
                        ))}
                        {availableStories.length > 6 && (
                            <p className="text-gray-500 text-xs col-span-2">+{availableStories.length - 6} more...</p>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
