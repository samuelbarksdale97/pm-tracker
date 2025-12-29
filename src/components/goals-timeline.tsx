'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
    Target,
    Plus,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Circle,
    Layers,
    MoreHorizontal,
    Edit2,
    Trash2,
    MoveRight,
    GripVertical,
    CalendarDays,
    Trophy,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import {
    Goal,
    Feature,
    TimeHorizon,
    GoalStatus,
    GoalThemeColor,
    GoalHealthStatus,
    getGoalsByHorizon,
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    moveGoalToHorizon,
    getGoalWithFeatures,
    getUnassignedFeatures,
    assignFeatureToGoal,
    calculateGoalHealth,
} from '@/lib/supabase';
import { analyzeGoalCapacity } from '@/lib/capacity-utils';
import { CapacityIndicator } from '@/components/capacity-indicator';

interface GoalsTimelineProps {
    projectId: string;
    onRefresh?: () => void;
}

// Color palette for goals
const THEME_COLORS: Record<GoalThemeColor, { bg: string; border: string; text: string; progress: string }> = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', progress: 'bg-blue-500' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', progress: 'bg-green-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', progress: 'bg-purple-500' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', progress: 'bg-orange-500' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', progress: 'bg-red-500' },
    gray: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400', progress: 'bg-gray-500' },
};

// Status icons and colors
const STATUS_CONFIG: Record<GoalStatus, { icon: typeof Circle; color: string; label: string }> = {
    not_started: { icon: Circle, color: 'text-gray-400', label: 'Not Started' },
    in_progress: { icon: Clock, color: 'text-blue-400', label: 'In Progress' },
    completed: { icon: CheckCircle2, color: 'text-green-400', label: 'Completed' },
    at_risk: { icon: AlertTriangle, color: 'text-amber-400', label: 'At Risk' },
};

// Horizon labels
const HORIZON_CONFIG: Record<TimeHorizon, { label: string; description: string; color: string }> = {
    now: { label: 'Now', description: 'Currently in progress', color: 'text-green-400' },
    next: { label: 'Next', description: 'Coming up soon', color: 'text-blue-400' },
    later: { label: 'Later', description: 'Future planning', color: 'text-gray-400' },
};

// Health status colors and icons
const HEALTH_CONFIG: Record<GoalHealthStatus, { color: string; bgColor: string; borderColor: string }> = {
    on_track: { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
    at_risk: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
    overdue: { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
    no_date: { color: 'text-gray-500', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' },
};

// Helper to parse date strings as local dates (not UTC)
function parseLocalDate(dateStr: string): Date {
    // Handle YYYY-MM-DD format as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    // For ISO strings with time component, parse normally
    return new Date(dateStr);
}

// Goal Card Component
function GoalCard({
    goal,
    onEdit,
    onDelete,
    onMoveHorizon,
    onExpand,
    showArchiveOptions = false,
}: {
    goal: Goal;
    onEdit: () => void;
    onDelete: () => void;
    onMoveHorizon: (horizon: TimeHorizon) => void;
    onExpand: () => void;
    showArchiveOptions?: boolean;
}) {
    const theme = THEME_COLORS[goal.theme_color || 'blue'];
    const status = STATUS_CONFIG[goal.status];
    const StatusIcon = status.icon;

    const progressPercent = goal.progress_percentage || 0;
    const featureCount = goal.feature_count || 0;
    const completedFeatures = goal.completed_feature_count || 0;

    // Calculate health status
    const health = calculateGoalHealth(goal);
    const healthConfig = HEALTH_CONFIG[health.status];

    // Calculate capacity analysis
    const capacityAnalysis = analyzeGoalCapacity(goal);

    return (
        <div
            className={cn(
                'relative group rounded-lg border p-4 transition-all duration-200',
                'hover:shadow-lg hover:shadow-black/20',
                theme.bg,
                theme.border
            )}
        >
            {/* Drag handle */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab">
                <GripVertical className="w-4 h-4 text-gray-500" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between mb-3 pl-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <StatusIcon className={cn('w-4 h-4 flex-shrink-0', status.color)} />
                        <h3 className="font-medium text-white truncate">{goal.name}</h3>
                    </div>
                    {goal.description && (
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{goal.description}</p>
                    )}
                </div>

                {/* Menu */}
                <div className="relative">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none"
                            >
                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-gray-800 border-gray-700 text-gray-300 z-50">
                            <DropdownMenuItem
                                onClick={onEdit}
                                className="cursor-pointer focus:bg-gray-700 focus:text-white"
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit Goal
                            </DropdownMenuItem>

                            {!showArchiveOptions && goal.time_horizon !== 'now' && (
                                <DropdownMenuItem
                                    onClick={() => onMoveHorizon('now')}
                                    className="cursor-pointer focus:bg-gray-700 focus:text-white"
                                >
                                    <MoveRight className="w-4 h-4 mr-2" />
                                    Move to Now
                                </DropdownMenuItem>
                            )}
                            {!showArchiveOptions && goal.time_horizon !== 'next' && (
                                <DropdownMenuItem
                                    onClick={() => onMoveHorizon('next')}
                                    className="cursor-pointer focus:bg-gray-700 focus:text-white"
                                >
                                    <MoveRight className="w-4 h-4 mr-2" />
                                    Move to Next
                                </DropdownMenuItem>
                            )}
                            {!showArchiveOptions && goal.time_horizon !== 'later' && (
                                <DropdownMenuItem
                                    onClick={() => onMoveHorizon('later')}
                                    className="cursor-pointer focus:bg-gray-700 focus:text-white"
                                >
                                    <MoveRight className="w-4 h-4 mr-2" />
                                    Move to Later
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-gray-700" />

                            <DropdownMenuItem
                                onClick={onDelete}
                                className="cursor-pointer text-red-400 focus:bg-gray-700 focus:text-red-300"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Goal
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Target Date & Health Indicator */}
            {goal.target_date && (
                <div className="mb-3 pl-4">
                    <div
                        className={cn(
                            'inline-flex items-center gap-2 px-2 py-1 rounded text-xs',
                            healthConfig.bgColor,
                            healthConfig.borderColor,
                            'border'
                        )}
                    >
                        <CalendarDays className={cn('w-3 h-3', healthConfig.color)} />
                        <span className={healthConfig.color}>
                            {format(parseLocalDate(goal.target_date), 'MMM d, yyyy')}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className={healthConfig.color}>{health.message}</span>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div className="mb-3 pl-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>{completedFeatures} of {featureCount} features</span>
                    <span>{progressPercent}%</span>
                </div>
                <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                        className={cn('h-full rounded-full transition-all duration-500', theme.progress)}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Capacity Warning (only show if tight or overloaded) */}
            {goal.target_date && (capacityAnalysis.status === 'tight' || capacityAnalysis.status === 'overloaded') && (
                <div className="mb-3 pl-4">
                    <CapacityIndicator analysis={capacityAnalysis} compact />
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pl-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    {goal.total_story_count !== undefined && goal.total_story_count > 0 && (
                        <span>{goal.completed_story_count}/{goal.total_story_count} stories</span>
                    )}
                    {goal.completed_at && (
                        <span className="text-green-500">
                            Completed {format(parseLocalDate(goal.completed_at), 'MMM d')}
                        </span>
                    )}
                </div>
                <button
                    onClick={onExpand}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                >
                    View Details
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

// Horizon Column Component
function HorizonColumn({
    horizon,
    goals,
    onCreateGoal,
    onEditGoal,
    onDeleteGoal,
    onMoveGoal,
    onExpandGoal,
}: {
    horizon: TimeHorizon;
    goals: Goal[];
    onCreateGoal: (horizon: TimeHorizon) => void;
    onEditGoal: (goal: Goal) => void;
    onDeleteGoal: (goal: Goal) => void;
    onMoveGoal: (goal: Goal, horizon: TimeHorizon) => void;
    onExpandGoal: (goal: Goal) => void;
}) {
    const config = HORIZON_CONFIG[horizon];

    return (
        <div className="flex-1 min-w-[320px] flex flex-col">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <div>
                    <h3 className={cn('text-lg font-semibold', config.color)}>{config.label}</h3>
                    <p className="text-xs text-gray-500">{config.description}</p>
                </div>
                <button
                    onClick={() => onCreateGoal(horizon)}
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Goals List */}
            <div className="flex-1 space-y-3">
                {goals.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-700 rounded-lg">
                        No goals in this phase
                    </div>
                ) : (
                    goals.map(goal => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            onEdit={() => onEditGoal(goal)}
                            onDelete={() => onDeleteGoal(goal)}
                            onMoveHorizon={(h) => onMoveGoal(goal, h)}
                            onExpand={() => onExpandGoal(goal)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// Goal Detail Panel (for expanded view)
function GoalDetailPanel({
    goal,
    unassignedFeatures,
    onClose,
    onAssignFeature,
    onUnassignFeature,
    onUpdateGoal,
}: {
    goal: Goal;
    unassignedFeatures: Feature[];
    onClose: () => void;
    onAssignFeature: (featureId: string) => void;
    onUnassignFeature: (featureId: string) => void;
    onUpdateGoal: (updates: Partial<Goal>) => void;
}) {
    const theme = THEME_COLORS[goal.theme_color || 'blue'];
    const features = goal.features || [];
    const capacityAnalysis = analyzeGoalCapacity(goal);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className={cn('p-6 border-b border-gray-700', theme.bg)}>
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-white">{goal.name}</h2>
                            {goal.description && (
                                <p className="text-gray-400 mt-1">{goal.description}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                        >
                            ×
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-400">Overall Progress</span>
                            <span className={theme.text}>{goal.progress_percentage || 0}%</span>
                        </div>
                        <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                            <div
                                className={cn('h-full rounded-full transition-all duration-500', theme.progress)}
                                style={{ width: `${goal.progress_percentage || 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Capacity Analysis */}
                    {goal.target_date && capacityAnalysis.status !== 'unknown' && (
                        <div className="mt-4">
                            <CapacityIndicator analysis={capacityAnalysis} showDetails />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    {/* Assigned Features */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            Assigned Features ({features.length})
                        </h3>
                        {features.length === 0 ? (
                            <p className="text-gray-500 text-sm">No features assigned to this goal yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {features.map(feature => (
                                    <div
                                        key={feature.id}
                                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-white truncate">{feature.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {feature.completed_story_count || 0}/{feature.user_story_count || 0} stories complete
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{
                                                        width: `${feature.user_story_count ? Math.round((feature.completed_story_count || 0) / feature.user_story_count * 100) : 0}%`
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => onUnassignFeature(feature.id)}
                                                className="text-gray-500 hover:text-red-400 p-1"
                                                title="Remove from goal"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Unassigned Features */}
                    {unassignedFeatures.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-300 mb-3">
                                Available Features ({unassignedFeatures.length})
                            </h3>
                            <div className="space-y-2">
                                {unassignedFeatures.map(feature => (
                                    <div
                                        key={feature.id}
                                        className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-dashed border-gray-700"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-300 truncate">{feature.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {feature.user_story_count || 0} stories
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onAssignFeature(feature.id)}
                                            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                                        >
                                            Add to Goal
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Create/Edit Goal Modal
function GoalFormModal({
    goal,
    horizon,
    onSave,
    onClose,
}: {
    goal?: Goal;
    horizon: TimeHorizon;
    projectId: string;
    onSave: (data: Partial<Goal>) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(goal?.name || '');
    const [description, setDescription] = useState(goal?.description || '');

    // Parse date string as local date (not UTC) to avoid timezone shifts
    const parseLocalDate = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const [targetDate, setTargetDate] = useState<Date | null>(
        goal?.target_date ? parseLocalDate(goal.target_date) : null
    );
    const [themeColor, setThemeColor] = useState<GoalThemeColor>(goal?.theme_color || 'blue');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        // Format date in local timezone to avoid off-by-one errors
        // Using manual formatting to get YYYY-MM-DD in local time
        const formatLocalDate = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        onSave({
            name: name.trim(),
            description: description.trim() || null,
            target_date: targetDate ? formatLocalDate(targetDate) : null,
            theme_color: themeColor,
            time_horizon: goal?.time_horizon || horizon,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-lg font-semibold text-white">
                            {goal ? 'Edit Goal' : 'Create Goal'}
                        </h2>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Goal Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Member Registration v1"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What does this goal aim to achieve?"
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Target Date
                            </label>
                            <DatePicker
                                value={targetDate}
                                onChange={setTargetDate}
                                placeholder="Select target date"
                                minDate={new Date()}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                When should this goal be completed?
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Theme Color
                            </label>
                            <div className="flex gap-2">
                                {(Object.keys(THEME_COLORS) as GoalThemeColor[]).map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setThemeColor(color)}
                                        className={cn(
                                            'w-8 h-8 rounded-full transition-all',
                                            THEME_COLORS[color].progress,
                                            themeColor === color ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                        >
                            {goal ? 'Save Changes' : 'Create Goal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Completed Goals Archive Section
function CompletedGoalsSection({
    goals,
    onEditGoal,
    onDeleteGoal,
    onExpandGoal,
}: {
    goals: Goal[];
    onEditGoal: (goal: Goal) => void;
    onDeleteGoal: (goal: Goal) => void;
    onExpandGoal: (goal: Goal) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (goals.length === 0) return null;

    // Sort by completed_at descending (most recent first)
    const sortedGoals = [...goals].sort((a, b) => {
        if (!a.completed_at || !b.completed_at) return 0;
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
    });

    // Calculate total stats
    const totalFeatures = goals.reduce((sum, g) => sum + (g.feature_count || 0), 0);
    const totalStories = goals.reduce((sum, g) => sum + (g.total_story_count || 0), 0);

    return (
        <div className="mt-8 border-t border-gray-700 pt-6">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between mb-4 group"
            >
                <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Completed Goals</h3>
                    <span className="text-sm text-gray-500">
                        {goals.length} {goals.length === 1 ? 'goal' : 'goals'} • {totalFeatures} features • {totalStories} stories
                    </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 group-hover:text-white transition-colors">
                    <span className="text-sm">{isExpanded ? 'Hide' : 'Show'}</span>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </div>
            </button>

            {/* Collapsed summary */}
            {!isExpanded && (
                <div className="flex gap-2 flex-wrap">
                    {sortedGoals.slice(0, 5).map(goal => (
                        <div
                            key={goal.id}
                            className={cn(
                                'px-3 py-1.5 rounded-full text-sm border',
                                THEME_COLORS[goal.theme_color || 'blue'].bg,
                                THEME_COLORS[goal.theme_color || 'blue'].border,
                                THEME_COLORS[goal.theme_color || 'blue'].text
                            )}
                        >
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            {goal.name}
                        </div>
                    ))}
                    {goals.length > 5 && (
                        <span className="px-3 py-1.5 text-sm text-gray-500">
                            +{goals.length - 5} more
                        </span>
                    )}
                </div>
            )}

            {/* Expanded view */}
            {isExpanded && (
                <div className="space-y-3">
                    {sortedGoals.map(goal => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            onEdit={() => onEditGoal(goal)}
                            onDelete={() => onDeleteGoal(goal)}
                            onMoveHorizon={() => {}} // No-op for completed goals
                            onExpand={() => onExpandGoal(goal)}
                            showArchiveOptions
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Main Component
export function GoalsTimeline({ projectId, onRefresh }: GoalsTimelineProps) {
    const [goals, setGoals] = useState<{ now: Goal[]; next: Goal[]; later: Goal[] }>({
        now: [],
        next: [],
        later: [],
    });
    const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState<TimeHorizon | null>(null);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [expandedGoal, setExpandedGoal] = useState<Goal | null>(null);
    const [unassignedFeatures, setUnassignedFeatures] = useState<Feature[]>([]);

    // Load goals
    const loadGoals = useCallback(async () => {
        try {
            setLoading(true);
            // Get goals by horizon (active goals)
            const data = await getGoalsByHorizon(projectId);
            setGoals(data);

            // Get all goals to filter completed ones
            const allGoals = await getGoals(projectId);
            const completed = allGoals.filter(g => g.status === 'completed');
            setCompletedGoals(completed);

            setError(null);
        } catch (err) {
            console.error('Error loading goals:', err);
            setError('Failed to load goals');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // Load unassigned features when expanding a goal
    const loadUnassignedFeatures = useCallback(async () => {
        try {
            const features = await getUnassignedFeatures(projectId);
            setUnassignedFeatures(features);
        } catch (err) {
            console.error('Error loading unassigned features:', err);
        }
    }, [projectId]);

    // Initial load
    useEffect(() => {
        loadGoals();
    }, [loadGoals]);

    // Handle create goal
    const handleCreateGoal = async (data: Partial<Goal>) => {
        if (!showCreateModal) return;

        try {
            await createGoal({
                project_id: projectId,
                name: data.name!,
                description: data.description,
                time_horizon: data.time_horizon || showCreateModal,
                target_date: data.target_date,
                theme_color: data.theme_color,
            });
            setShowCreateModal(null);
            loadGoals();
            onRefresh?.();
        } catch (err) {
            console.error('Error creating goal:', err);
        }
    };

    // Handle edit goal
    const handleEditGoal = async (data: Partial<Goal>) => {
        if (!editingGoal) return;

        try {
            await updateGoal(editingGoal.id, data);
            setEditingGoal(null);
            loadGoals();
            onRefresh?.();
        } catch (err) {
            console.error('Error updating goal:', err);
        }
    };

    // Handle delete goal
    const handleDeleteGoal = async (goal: Goal) => {
        if (!confirm(`Delete "${goal.name}"? Features will be unassigned but not deleted.`)) return;

        try {
            await deleteGoal(goal.id);
            loadGoals();
            onRefresh?.();
        } catch (err) {
            console.error('Error deleting goal:', err);
        }
    };

    // Handle move goal
    const handleMoveGoal = async (goal: Goal, horizon: TimeHorizon) => {
        try {
            await moveGoalToHorizon(goal.id, horizon);
            loadGoals();
            onRefresh?.();
        } catch (err) {
            console.error('Error moving goal:', err);
        }
    };

    // Handle expand goal
    const handleExpandGoal = async (goal: Goal) => {
        try {
            const fullGoal = await getGoalWithFeatures(goal.id);
            if (fullGoal) {
                setExpandedGoal(fullGoal);
                loadUnassignedFeatures();
            }
        } catch (err) {
            console.error('Error loading goal details:', err);
        }
    };

    // Handle assign feature
    const handleAssignFeature = async (featureId: string) => {
        if (!expandedGoal) return;

        try {
            await assignFeatureToGoal(featureId, expandedGoal.id);
            // Refresh expanded goal
            const fullGoal = await getGoalWithFeatures(expandedGoal.id);
            if (fullGoal) setExpandedGoal(fullGoal);
            loadUnassignedFeatures();
            loadGoals();
        } catch (err) {
            console.error('Error assigning feature:', err);
        }
    };

    // Handle unassign feature
    const handleUnassignFeature = async (featureId: string) => {
        if (!expandedGoal) return;

        try {
            await assignFeatureToGoal(featureId, null);
            // Refresh expanded goal
            const fullGoal = await getGoalWithFeatures(expandedGoal.id);
            if (fullGoal) setExpandedGoal(fullGoal);
            loadUnassignedFeatures();
            loadGoals();
        } catch (err) {
            console.error('Error unassigning feature:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-400">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
                <button
                    onClick={loadGoals}
                    className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const totalGoals = goals.now.length + goals.next.length + goals.later.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-semibold text-white">Goals & Releases</h2>
                    <span className="text-sm text-gray-500">
                        {totalGoals} {totalGoals === 1 ? 'goal' : 'goals'}
                    </span>
                </div>
            </div>

            {/* Now / Next / Later Columns */}
            <div className="flex gap-6 overflow-x-auto pb-4">
                <HorizonColumn
                    horizon="now"
                    goals={goals.now}
                    onCreateGoal={setShowCreateModal}
                    onEditGoal={setEditingGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onMoveGoal={handleMoveGoal}
                    onExpandGoal={handleExpandGoal}
                />
                <HorizonColumn
                    horizon="next"
                    goals={goals.next}
                    onCreateGoal={setShowCreateModal}
                    onEditGoal={setEditingGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onMoveGoal={handleMoveGoal}
                    onExpandGoal={handleExpandGoal}
                />
                <HorizonColumn
                    horizon="later"
                    goals={goals.later}
                    onCreateGoal={setShowCreateModal}
                    onEditGoal={setEditingGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onMoveGoal={handleMoveGoal}
                    onExpandGoal={handleExpandGoal}
                />
            </div>

            {/* Empty State */}
            {totalGoals === 0 && completedGoals.length === 0 && (
                <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
                    <Target className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No Goals Yet</h3>
                    <p className="text-gray-500 mb-4">
                        Create goals to track your feature releases and milestones.
                    </p>
                    <button
                        onClick={() => setShowCreateModal('next')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 mx-auto"
                    >
                        <Plus className="w-4 h-4" />
                        Create Your First Goal
                    </button>
                </div>
            )}

            {/* Completed Goals Archive */}
            <CompletedGoalsSection
                goals={completedGoals}
                onEditGoal={setEditingGoal}
                onDeleteGoal={handleDeleteGoal}
                onExpandGoal={handleExpandGoal}
            />

            {/* Create Modal */}
            {showCreateModal && (
                <GoalFormModal
                    horizon={showCreateModal}
                    projectId={projectId}
                    onSave={handleCreateGoal}
                    onClose={() => setShowCreateModal(null)}
                />
            )}

            {/* Edit Modal */}
            {editingGoal && (
                <GoalFormModal
                    goal={editingGoal}
                    horizon={editingGoal.time_horizon}
                    projectId={projectId}
                    onSave={handleEditGoal}
                    onClose={() => setEditingGoal(null)}
                />
            )}

            {/* Detail Panel */}
            {expandedGoal && (
                <GoalDetailPanel
                    goal={expandedGoal}
                    unassignedFeatures={unassignedFeatures}
                    onClose={() => setExpandedGoal(null)}
                    onAssignFeature={handleAssignFeature}
                    onUnassignFeature={handleUnassignFeature}
                    onUpdateGoal={(updates) => {
                        updateGoal(expandedGoal.id, updates).then(() => {
                            loadGoals();
                            handleExpandGoal(expandedGoal);
                        });
                    }}
                />
            )}
        </div>
    );
}
