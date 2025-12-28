'use client';

import { useMemo, useState } from 'react';
import { Gantt } from 'wx-react-gantt';
import 'wx-react-gantt/dist/gantt.css';
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
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
    UserStory,
    Milestone,
    createMilestone,
    updateMilestone,
    deleteMilestone,
} from '@/lib/supabase';

interface MilestoneGanttLibProps {
    projectId: string;
    milestones: Milestone[];
    userStories: UserStory[];
    onRefresh: () => void;
}

const MILESTONE_COLORS = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
    '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
];

export function MilestoneGanttLib({ projectId, milestones, userStories, onRefresh }: MilestoneGanttLibProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [newName, setNewName] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Convert milestones to Gantt task format
    const tasks = useMemo(() => {
        return milestones.map((m, index) => {
            const stories = userStories.filter(us => us.milestone_id === m.id);
            const doneCount = stories.filter(s => s.status === 'Done').length;
            const progress = stories.length > 0 ? Math.round((doneCount / stories.length) * 100) : 0;

            return {
                id: m.id,
                text: m.name,
                start: new Date(m.start_date || m.target_date),
                end: new Date(m.target_date),
                progress,
                type: 'task' as const,
                // Store color for custom styling
                $custom: {
                    color: m.color || MILESTONE_COLORS[index % MILESTONE_COLORS.length],
                    storiesCount: stories.length,
                }
            };
        });
    }, [milestones, userStories]);

    // Links between milestones (dependencies) - empty for now
    const links: { id: string; source: string; target: string; type: string }[] = [];

    // Scales configuration
    const scales = [
        { unit: 'month' as const, step: 1, format: 'MMMM yyyy' },
        { unit: 'week' as const, step: 1, format: 'wo' },
        { unit: 'day' as const, step: 1, format: 'd' },
    ];

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

    const openEditDialog = (milestone: Milestone) => {
        setEditingMilestone(milestone);
        setNewName(milestone.name);
        setNewStartDate(milestone.start_date || '');
        setNewEndDate(milestone.target_date);
        setIsEditing(true);
    };

    // Available (unassigned) user stories
    const availableStories = useMemo(() => {
        return userStories.filter(us => !us.milestone_id);
    }, [userStories]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Key Project Milestone Tracker</h2>
                    <p className="text-gray-400 text-sm">Visual timeline of project milestones</p>
                </div>
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

            {/* Gantt Chart */}
            <Card className="bg-gray-900 border-gray-800 overflow-hidden">
                <div className="h-[500px]">
                    {tasks.length > 0 ? (
                        <Gantt
                            tasks={tasks}
                            links={links}
                            scales={scales}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            No milestones yet. Click "Add Milestone" to create one.
                        </div>
                    )}
                </div>
            </Card>

            {/* Milestone List for Editing */}
            <Card className="bg-gray-900 border-gray-800 p-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Manage Milestones</h3>
                <div className="space-y-2">
                    {milestones.map((m, idx) => {
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
