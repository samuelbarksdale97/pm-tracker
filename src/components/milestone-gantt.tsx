'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, ChevronDown, ChevronRight, Trash2, Edit2, User, Shield, Briefcase, Building2, Users } from 'lucide-react';
import {
    UserStory,
    Milestone,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    updateUserStoryMilestone
} from '@/lib/supabase';

interface MilestoneGanttProps {
    projectId: string;
    milestones: Milestone[];
    userStories: UserStory[];
    onRefresh: () => void;
}

const MILESTONE_COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // amber
    '#EF4444', // red
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
];

const personaIcons: Record<string, typeof User> = {
    'member': User,
    'admin': Shield,
    'staff': Briefcase,
    'business': Building2,
    'guest': Users,
};

const personaColors: Record<string, string> = {
    'member': 'text-blue-400',
    'admin': 'text-purple-400',
    'staff': 'text-green-400',
    'business': 'text-orange-400',
    'guest': 'text-gray-400',
};

type ZoomLevel = 4 | 8 | 12;

export function MilestoneGantt({ projectId, milestones, userStories, onRefresh }: MilestoneGanttProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(8);
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    const [editName, setEditName] = useState('');
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');

    const today = useMemo(() => new Date(), []);

    // Generate weeks based on zoom level
    const weeks = useMemo(() => {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday

        return Array.from({ length: zoomLevel }, (_, i) => {
            const weekStart = new Date(startOfWeek);
            weekStart.setDate(startOfWeek.getDate() + (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return {
                weekNum: i + 1,
                startDate: weekStart,
                endDate: weekEnd,
                label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
        });
    }, [today, zoomLevel]);

    // Calculate today's position as percentage across the timeline
    const todayPosition = useMemo(() => {
        const firstWeekStart = weeks[0].startDate;
        const lastWeekEnd = weeks[weeks.length - 1].endDate;
        const totalDuration = lastWeekEnd.getTime() - firstWeekStart.getTime();
        const todayOffset = today.getTime() - firstWeekStart.getTime();
        const percentage = (todayOffset / totalDuration) * 100;
        return Math.max(0, Math.min(100, percentage));
    }, [weeks, today]);

    const firstWeekStart = weeks[0].startDate;
    const lastWeekEnd = weeks[weeks.length - 1].endDate;

    // Group user stories by milestone
    const storiesByMilestone = useMemo(() => {
        const grouped: Record<string, UserStory[]> = {};
        milestones.forEach(m => { grouped[m.id] = []; });

        userStories.forEach(us => {
            if (us.milestone_id && grouped[us.milestone_id]) {
                grouped[us.milestone_id].push(us);
            }
        });
        return grouped;
    }, [milestones, userStories]);

    // Available (unassigned) user stories
    const availableStories = useMemo(() => {
        return userStories.filter(us => !us.milestone_id);
    }, [userStories]);

    // Calculate bar position (which week columns it spans)
    const getBarPosition = (milestone: Milestone) => {
        const startDate = new Date(milestone.start_date || milestone.target_date);
        const endDate = new Date(milestone.target_date);

        // Calculate week indices based on zoom level
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const startWeek = Math.max(0, Math.floor((startDate.getTime() - firstWeekStart.getTime()) / msPerWeek));
        const endWeek = Math.min(zoomLevel - 1, Math.ceil((endDate.getTime() - firstWeekStart.getTime()) / msPerWeek));

        return {
            start: Math.max(0, startWeek),
            end: Math.min(zoomLevel, endWeek + 1),
            isVisible: endWeek >= 0 && startWeek <= zoomLevel - 1,
            extendsBeyond: endDate.getTime() > lastWeekEnd.getTime()
        };
    };

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

    const handleDeleteMilestone = async (id: string) => {
        if (!confirm('Delete this milestone? Stories will become unassigned.')) return;
        try {
            await deleteMilestone(id);
            onRefresh();
        } catch (err) {
            console.error('Error deleting milestone:', err);
        }
    };

    const handleEditMilestone = async () => {
        if (!editingMilestone || !editName.trim() || !editStartDate || !editEndDate) return;
        setIsSubmitting(true);
        try {
            await updateMilestone(editingMilestone.id, {
                name: editName,
                start_date: editStartDate,
                target_date: editEndDate
            });
            setEditingMilestone(null);
            onRefresh();
        } catch (err) {
            console.error('Error updating milestone:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddStoryToMilestone = async (storyId: string, milestoneId: string) => {
        try {
            await updateUserStoryMilestone(storyId, milestoneId);
            onRefresh();
        } catch (err) {
            console.error('Error adding story:', err);
        }
    };

    const handleRemoveStoryFromMilestone = async (storyId: string) => {
        try {
            await updateUserStoryMilestone(storyId, null);
            onRefresh();
        } catch (err) {
            console.error('Error removing story:', err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Key Project Milestone Tracker</h2>
                    <p className="text-gray-400 text-sm">Click milestones to assign user stories</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                        {([4, 8, 12] as ZoomLevel[]).map((level) => (
                            <button
                                key={level}
                                onClick={() => setZoomLevel(level)}
                                className={`px-3 py-1 text-sm rounded transition-colors ${zoomLevel === level
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                    }`}
                            >
                                {level}w
                            </button>
                        ))}
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

                    {/* Edit Milestone Dialog */}
                    <Dialog open={!!editingMilestone} onOpenChange={(open) => !open && setEditingMilestone(null)}>
                        <DialogContent className="bg-gray-900 border-gray-800">
                            <DialogHeader>
                                <DialogTitle className="text-white">Edit Milestone</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Name</label>
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="e.g., MVP Complete"
                                        className="bg-gray-800 border-gray-700"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Start Date</label>
                                        <Input
                                            type="date"
                                            value={editStartDate}
                                            onChange={(e) => setEditStartDate(e.target.value)}
                                            className="bg-gray-800 border-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">End Date</label>
                                        <Input
                                            type="date"
                                            value={editEndDate}
                                            onChange={(e) => setEditEndDate(e.target.value)}
                                            className="bg-gray-800 border-gray-700"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" onClick={() => setEditingMilestone(null)}>Cancel</Button>
                                    <Button onClick={handleEditMilestone} disabled={isSubmitting || !editName || !editStartDate || !editEndDate}>
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Timeline Grid */}
            <Card className="bg-gray-900 border-gray-800 overflow-hidden relative">
                {/* Today Marker - positioned within the timeline area (right of 200px sidebar) */}
                {todayPosition >= 0 && todayPosition <= 100 && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                        style={{
                            left: `calc(200px + (100% - 200px) * ${todayPosition / 100})`
                        }}
                    >
                        <div className="absolute -top-0 -left-3 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-b font-medium">
                            Today
                        </div>
                    </div>
                )}
                {/* Week Headers with Day Tickers */}
                <div className="grid border-b border-gray-800" style={{ gridTemplateColumns: `200px repeat(${zoomLevel}, 1fr)` }}>
                    <div className="p-3 border-r border-gray-800 bg-gray-950">
                        <span className="text-sm font-medium text-gray-400">Milestones</span>
                    </div>
                    {weeks.map((week) => {
                        // Generate 7 days for this week
                        const days = Array.from({ length: 7 }, (_, i) => {
                            const day = new Date(week.startDate);
                            day.setDate(week.startDate.getDate() + i);
                            const isToday = day.toDateString() === today.toDateString();
                            const isFirstOfMonth = day.getDate() === 1;
                            const monthName = day.toLocaleDateString('en-US', { month: 'short' });
                            return { date: day, dayNum: day.getDate(), isToday, isFirstOfMonth, monthName };
                        });

                        // Determine month(s) shown in this week for the header
                        const startMonth = week.startDate.toLocaleDateString('en-US', { month: 'short' });
                        const endDate = new Date(week.startDate);
                        endDate.setDate(week.startDate.getDate() + 6);
                        const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
                        const monthLabel = startMonth === endMonth ? startMonth : `${startMonth}/${endMonth}`;

                        return (
                            <div key={week.weekNum} className="border-r border-gray-800 last:border-r-0 bg-gray-950">
                                {/* Week label with month */}
                                <div className="px-2 py-1 text-center border-b border-gray-800/50">
                                    <span className="text-xs font-medium text-gray-300">{monthLabel}</span>
                                    <span className="text-xs text-gray-500 ml-2">W{week.weekNum}</span>
                                </div>
                                {/* Day tickers */}
                                <div className="grid grid-cols-7 gap-0">
                                    {days.map((day, i) => (
                                        <div
                                            key={i}
                                            className={`py-1 text-center text-[10px] border-r border-gray-800/30 last:border-r-0 ${day.isToday
                                                    ? 'bg-red-500/20 text-red-400 font-bold'
                                                    : day.isFirstOfMonth
                                                        ? 'bg-blue-500/10 text-blue-400'
                                                        : 'text-gray-500'
                                                }`}
                                        >
                                            <div className="text-[9px] text-gray-600">
                                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}
                                            </div>
                                            <div className={day.isFirstOfMonth ? 'font-semibold' : ''}>
                                                {day.isFirstOfMonth ? day.monthName.charAt(0) + day.dayNum : day.dayNum}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Milestone Rows */}
                <div className="divide-y divide-gray-800">
                    {milestones.map((milestone, index) => {
                        const pos = getBarPosition(milestone);
                        const isExpanded = expandedMilestone === milestone.id;
                        const stories = storiesByMilestone[milestone.id] || [];

                        return (
                            <div key={milestone.id}>
                                {/* Milestone Row */}
                                <div
                                    className="grid hover:bg-gray-800/50 transition-colors cursor-pointer"
                                    style={{ gridTemplateColumns: `200px repeat(${zoomLevel}, 1fr)` }}
                                    onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                                >
                                    {/* Milestone Name */}
                                    <div className="p-3 border-r border-gray-800 flex items-center gap-2">
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        )}
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: milestone.color || MILESTONE_COLORS[index % MILESTONE_COLORS.length] }}
                                        />
                                        <span className="text-sm font-medium text-white truncate">{milestone.name}</span>
                                        <Badge variant="outline" className="text-xs text-gray-500 ml-auto">
                                            {stories.length}
                                        </Badge>
                                    </div>

                                    {/* Timeline Bar Area */}
                                    <div
                                        className="relative p-2"
                                        style={{ gridColumn: `span ${zoomLevel}` }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {pos.isVisible && (
                                            <div
                                                className="absolute top-2 bottom-2 rounded-md flex items-center px-3 text-xs font-medium text-white shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                style={{
                                                    backgroundColor: milestone.color || MILESTONE_COLORS[index % MILESTONE_COLORS.length],
                                                    left: `${(pos.start / zoomLevel) * 100}%`,
                                                    width: `${((pos.end - pos.start) / zoomLevel) * 100}%`,
                                                    minWidth: '60px'
                                                }}
                                                onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                                            >
                                                <span className="truncate">{milestone.name}</span>
                                                {pos.extendsBeyond && <span className="ml-1">→</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Panel */}
                                {isExpanded && (
                                    <div className="bg-gray-950 border-t border-gray-800 p-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Assigned Stories */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-sm font-medium text-gray-300">Assigned Stories ({stories.length})</h4>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-blue-400 hover:text-blue-300 h-7"
                                                            onClick={() => {
                                                                setEditingMilestone(milestone);
                                                                setEditName(milestone.name);
                                                                setEditStartDate(milestone.start_date || '');
                                                                setEditEndDate(milestone.target_date);
                                                            }}
                                                        >
                                                            <Edit2 className="w-3 h-3 mr-1" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-400 hover:text-red-300 h-7"
                                                            onClick={() => handleDeleteMilestone(milestone.id)}
                                                        >
                                                            <Trash2 className="w-3 h-3 mr-1" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    {stories.length === 0 ? (
                                                        <p className="text-gray-600 text-sm">No stories assigned yet</p>
                                                    ) : (
                                                        stories.map(story => {
                                                            const PersonaIcon = personaIcons[story.persona] || User;
                                                            return (
                                                                <div
                                                                    key={story.id}
                                                                    className="flex items-center justify-between bg-gray-800 rounded p-2 group"
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <PersonaIcon className={`w-3 h-3 flex-shrink-0 ${personaColors[story.persona]}`} />
                                                                        <span className="text-xs font-mono text-gray-500">{story.id}</span>
                                                                        <span className="text-sm text-gray-300 truncate">{story.narrative}</span>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                                                                        onClick={() => handleRemoveStoryFromMilestone(story.id)}
                                                                    >
                                                                        ×
                                                                    </Button>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>

                                            {/* Add from Available */}
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-300 mb-3">Add from Available ({availableStories.length})</h4>
                                                {availableStories.length === 0 ? (
                                                    <p className="text-gray-600 text-sm">All stories assigned!</p>
                                                ) : (
                                                    <Select onValueChange={(storyId) => handleAddStoryToMilestone(storyId, milestone.id)}>
                                                        <SelectTrigger className="bg-gray-800 border-gray-700">
                                                            <SelectValue placeholder="Select a story to add..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-gray-900 border-gray-800 max-h-48">
                                                            {availableStories.map(story => (
                                                                <SelectItem key={story.id} value={story.id} className="text-sm">
                                                                    <span className="font-mono text-gray-500 mr-2">{story.id}</span>
                                                                    {story.narrative.substring(0, 50)}...
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {milestones.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No milestones yet. Click "Add Milestone" to create one.
                        </div>
                    )}
                </div>
            </Card>

            {/* Available Stories Pool */}
            <Card className="bg-gray-900 border-gray-800 border-dashed p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-300">
                        Available User Stories
                        <span className="text-gray-500 font-normal ml-2">({availableStories.length} unassigned)</span>
                    </h3>
                </div>
                {availableStories.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">🎉 All user stories are assigned to milestones!</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {availableStories.map(story => {
                            const PersonaIcon = personaIcons[story.persona] || User;
                            return (
                                <div
                                    key={story.id}
                                    className="flex items-center gap-2 bg-gray-800 rounded p-2 text-sm"
                                >
                                    <PersonaIcon className={`w-3 h-3 flex-shrink-0 ${personaColors[story.persona]}`} />
                                    <span className="font-mono text-gray-500 text-xs">{story.id}</span>
                                    <span className="text-gray-400 truncate">{story.narrative}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}
