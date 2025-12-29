import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { useProjectHealth, type DashboardMetrics, type TeamWorkload } from './use-project-health';
import { AIMetricsWidget } from './ai-metrics-widget';
import {
    AlertCircle,
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    Target,
    Users,
    Flag,
    Calendar,
    Zap,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateGoalHealth } from '@/lib/supabase';


// ==========================================
// Hero Health Panel - Primary Visual Element
// ==========================================

function HeroHealthPanel({ metrics }: { metrics: DashboardMetrics }) {
    const healthConfig = {
        on_track: {
            gradient: 'from-green-600/20 to-green-900/10',
            border: 'border-green-500/30',
            glow: 'shadow-green-500/10',
            icon: CheckCircle2,
            text: 'On Track',
            color: 'text-green-400',
            bg: 'bg-green-500',
        },
        at_risk: {
            gradient: 'from-amber-600/20 to-amber-900/10',
            border: 'border-amber-500/30',
            glow: 'shadow-amber-500/10',
            icon: AlertTriangle,
            text: 'At Risk',
            color: 'text-amber-400',
            bg: 'bg-amber-500',
        },
        off_track: {
            gradient: 'from-red-600/20 to-red-900/10',
            border: 'border-red-500/30',
            glow: 'shadow-red-500/10',
            icon: AlertCircle,
            text: 'Off Track',
            color: 'text-red-400',
            bg: 'bg-red-500',
        },
    };

    const config = healthConfig[metrics.health];
    const Icon = config.icon;

    return (
        <Card className={cn(
            "relative overflow-hidden bg-gradient-to-br p-6 border",
            config.gradient,
            config.border,
            "shadow-xl",
            config.glow
        )}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                }} />
            </div>

            <div className="relative flex items-center justify-between">
                {/* Left: Health Status */}
                <div className="flex items-center gap-6">
                    <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center", config.bg)}>
                        <Icon className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">{config.text}</h2>
                        <p className="text-gray-400">Project Health Status</p>
                    </div>
                </div>

                {/* Right: Key Metrics */}
                <div className="flex gap-8">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-white">{metrics.velocity}</div>
                        <div className="text-sm text-gray-400 mt-1">7-Day Velocity</div>
                    </div>
                    <div className="w-px bg-gray-700" />
                    <div className="text-center">
                        <div className="text-4xl font-bold text-white">{metrics.percentComplete}%</div>
                        <div className="text-sm text-gray-400 mt-1">Complete</div>
                    </div>
                    <div className="w-px bg-gray-700" />
                    <div className="text-center">
                        <div className={cn(
                            "text-4xl font-bold",
                            metrics.activeBlockers.length > 0 ? "text-red-400" : "text-white"
                        )}>
                            {metrics.activeBlockers.length}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">Blockers</div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

// ==========================================
// Goals Overview - Now/Next/Later Horizons
// ==========================================

function GoalsOverview({ metrics }: { metrics: DashboardMetrics }) {
    const horizonConfig = {
        now: { label: 'Now', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/30' },
        next: { label: 'Next', color: 'bg-blue-500', textColor: 'text-blue-400', borderColor: 'border-blue-500/30' },
        later: { label: 'Later', color: 'bg-purple-500', textColor: 'text-purple-400', borderColor: 'border-purple-500/30' },
    };

    const { goalsByHorizon, nearestGoalDeadline, goalsAtRisk } = metrics;
    const totalGoals = goalsByHorizon.now.length + goalsByHorizon.next.length + goalsByHorizon.later.length;

    return (
        <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Flag className="w-5 h-5 text-purple-400" />
                    Goals Overview
                </h3>
                {nearestGoalDeadline && (
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">Next deadline:</span>
                        <span className={cn(
                            "font-medium",
                            nearestGoalDeadline.daysRemaining <= 7 ? "text-amber-400" :
                                nearestGoalDeadline.daysRemaining <= 0 ? "text-red-400" : "text-white"
                        )}>
                            {nearestGoalDeadline.daysRemaining} days
                        </span>
                    </div>
                )}
            </div>

            {totalGoals === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Flag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No active goals defined</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-4">
                    {(['now', 'next', 'later'] as const).map((horizon) => {
                        const goals = goalsByHorizon[horizon];
                        const config = horizonConfig[horizon];

                        return (
                            <div
                                key={horizon}
                                className={cn(
                                    "rounded-xl p-4 border bg-gray-900/50",
                                    config.borderColor
                                )}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", config.color)} />
                                        <span className={cn("font-semibold text-sm", config.textColor)}>
                                            {config.label}
                                        </span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {goals.length}
                                    </Badge>
                                </div>

                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {goals.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic">No goals</p>
                                    ) : (
                                        goals.slice(0, 3).map((goal) => {
                                            const health = calculateGoalHealth(goal);
                                            const isAtRisk = health.status === 'at_risk' || health.status === 'overdue';

                                            return (
                                                <div
                                                    key={goal.id}
                                                    className={cn(
                                                        "flex items-center justify-between p-2 rounded-lg text-xs",
                                                        isAtRisk ? "bg-red-500/10 border border-red-500/20" : "bg-gray-800/50"
                                                    )}
                                                >
                                                    <span className="text-gray-200 truncate flex-1">{goal.name}</span>
                                                    {isAtRisk && (
                                                        <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 ml-2" />
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                    {goals.length > 3 && (
                                        <p className="text-xs text-gray-500 text-center">
                                            +{goals.length - 3} more
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* At-Risk Goals Alert */}
            {goalsAtRisk.length > 0 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        {goalsAtRisk.length} goal{goalsAtRisk.length > 1 ? 's' : ''} at risk
                    </div>
                </div>
            )}
        </Card>
    );
}

// ==========================================
// Team Workload Visualization
// ==========================================

function TeamWorkloadPanel({ workload, unassignedTasks }: { workload: TeamWorkload[]; unassignedTasks: number }) {
    const avatarColors = [
        'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-pink-600',
        'bg-indigo-600', 'bg-teal-600', 'bg-orange-600', 'bg-cyan-600',
    ];

    const getAvatarColor = (name: string) => {
        const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarColors.length;
        return avatarColors[index];
    };

    const maxTasks = Math.max(...workload.map(w => w.totalTasks), 1);

    return (
        <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Team Workload
                </h3>
                {unassignedTasks > 0 && (
                    <Badge variant="secondary" className="text-amber-400 bg-amber-500/10">
                        {unassignedTasks} unassigned
                    </Badge>
                )}
            </div>

            {workload.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No active assignments</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {workload.map((w) => {
                        const firstName = w.member.name?.split(' ')[0] || 'Unknown';
                        const barWidth = (w.totalTasks / maxTasks) * 100;

                        return (
                            <div key={w.member.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white",
                                            getAvatarColor(w.member.name || '')
                                        )}>
                                            {firstName[0]}
                                        </div>
                                        <span className="text-sm font-medium text-gray-200">{firstName}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        {w.blocked > 0 && (
                                            <span className="text-red-400 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                                {w.blocked} blocked
                                            </span>
                                        )}
                                        <span className="text-gray-400">{w.totalTasks} tasks</span>
                                    </div>
                                </div>

                                {/* Stacked bar */}
                                <div className="h-2 bg-gray-900 rounded-full overflow-hidden flex">
                                    {w.inProgress > 0 && (
                                        <div
                                            className="bg-blue-500 h-full"
                                            style={{ width: `${(w.inProgress / w.totalTasks) * barWidth}%` }}
                                            title={`${w.inProgress} in progress`}
                                        />
                                    )}
                                    {w.blocked > 0 && (
                                        <div
                                            className="bg-red-500 h-full"
                                            style={{ width: `${(w.blocked / w.totalTasks) * barWidth}%` }}
                                            title={`${w.blocked} blocked`}
                                        />
                                    )}
                                    {w.notStarted > 0 && (
                                        <div
                                            className="bg-gray-600 h-full"
                                            style={{ width: `${(w.notStarted / w.totalTasks) * barWidth}%` }}
                                            title={`${w.notStarted} not started`}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Legend */}
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-700 mt-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-gray-400">In Progress</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-gray-400">Blocked</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-gray-600" />
                            <span className="text-gray-400">Not Started</span>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

// ==========================================
// Priority Breakdown Panel
// ==========================================

function PriorityBreakdown({ breakdown }: { breakdown: DashboardMetrics['priorityBreakdown'] }) {
    const priorities = [
        { key: 'p0' as const, label: 'P0 Critical', color: 'bg-red-500', textColor: 'text-red-400' },
        { key: 'p1' as const, label: 'P1 Important', color: 'bg-amber-500', textColor: 'text-amber-400' },
        { key: 'p2' as const, label: 'P2 Nice-to-have', color: 'bg-gray-500', textColor: 'text-gray-400' },
    ];

    return (
        <Card className="bg-gray-800/50 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Priority Completion
            </h3>

            <div className="space-y-4">
                {priorities.map(({ key, label, color, textColor }) => {
                    const { completed, total } = breakdown[key];
                    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                        <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className={cn("font-medium", textColor)}>{label}</span>
                                <span className="text-gray-400">
                                    {completed}/{total} ({percent}%)
                                </span>
                            </div>
                            <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-500", color)}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

// ==========================================
// Attention Panel - Consolidated Alerts
// ==========================================

function AttentionPanel({ metrics }: { metrics: DashboardMetrics }) {
    const { activeBlockers, goalsAtRisk, milestones } = metrics;

    // Collect all attention items
    const attentionItems: Array<{
        type: 'blocker' | 'goal' | 'milestone';
        priority: 'critical' | 'warning';
        title: string;
        subtitle: string;
        icon: typeof AlertCircle;
    }> = [];

    // Add P0 blockers as critical
    activeBlockers.filter(b => b.priority === 'P0').forEach(b => {
        attentionItems.push({
            type: 'blocker',
            priority: 'critical',
            title: b.narrative,
            subtitle: `P0 Blocker · ${b.feature_area || 'No feature'}`,
            icon: AlertCircle,
        });
    });

    // Add other blockers as warnings
    activeBlockers.filter(b => b.priority !== 'P0').forEach(b => {
        attentionItems.push({
            type: 'blocker',
            priority: 'warning',
            title: b.narrative,
            subtitle: `${b.priority} Blocker · ${b.feature_area || 'No feature'}`,
            icon: AlertTriangle,
        });
    });

    // Add at-risk goals
    goalsAtRisk.forEach(g => {
        const health = calculateGoalHealth(g);
        attentionItems.push({
            type: 'goal',
            priority: health.status === 'overdue' ? 'critical' : 'warning',
            title: g.name,
            subtitle: `Goal ${health.status === 'overdue' ? 'overdue' : 'at risk'} · ${g.time_horizon} horizon`,
            icon: Flag,
        });
    });

    // Add at-risk milestones
    milestones.filter(m => m.status === 'at_risk').forEach(m => {
        attentionItems.push({
            type: 'milestone',
            priority: 'critical',
            title: m.name,
            subtitle: `Milestone at risk · Due ${new Date(m.target_date).toLocaleDateString()}`,
            icon: Target,
        });
    });

    if (attentionItems.length === 0) {
        return (
            <Card className="bg-green-500/10 border-green-500/20 p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-green-200">All Clear</h3>
                        <p className="text-sm text-green-300/70">No blockers or at-risk items</p>
                    </div>
                </div>
            </Card>
        );
    }

    // Sort: critical first, then warnings
    attentionItems.sort((a, b) => {
        if (a.priority === 'critical' && b.priority !== 'critical') return -1;
        if (a.priority !== 'critical' && b.priority === 'critical') return 1;
        return 0;
    });

    const criticalCount = attentionItems.filter(i => i.priority === 'critical').length;

    return (
        <Card className={cn(
            "p-6 border",
            criticalCount > 0
                ? "bg-red-500/10 border-red-500/20"
                : "bg-amber-500/10 border-amber-500/20"
        )}>
            <h3 className={cn(
                "text-lg font-semibold mb-4 flex items-center gap-2",
                criticalCount > 0 ? "text-red-200" : "text-amber-200"
            )}>
                <AlertTriangle className={cn(
                    "w-5 h-5",
                    criticalCount > 0 ? "text-red-400" : "text-amber-400"
                )} />
                Requires Attention ({attentionItems.length})
            </h3>

            <div className="space-y-3 max-h-64 overflow-y-auto">
                {attentionItems.slice(0, 5).map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={idx}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border",
                                item.priority === 'critical'
                                    ? "bg-red-500/10 border-red-500/20"
                                    : "bg-amber-500/10 border-amber-500/20"
                            )}
                        >
                            <Icon className={cn(
                                "w-4 h-4 mt-0.5 flex-shrink-0",
                                item.priority === 'critical' ? "text-red-400" : "text-amber-400"
                            )} />
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-medium truncate",
                                    item.priority === 'critical' ? "text-red-100" : "text-amber-100"
                                )}>
                                    {item.title}
                                </p>
                                <p className={cn(
                                    "text-xs mt-0.5",
                                    item.priority === 'critical' ? "text-red-300/70" : "text-amber-300/70"
                                )}>
                                    {item.subtitle}
                                </p>
                            </div>
                            <ChevronRight className={cn(
                                "w-4 h-4 flex-shrink-0",
                                item.priority === 'critical' ? "text-red-400/50" : "text-amber-400/50"
                            )} />
                        </div>
                    );
                })}
                {attentionItems.length > 5 && (
                    <p className={cn(
                        "text-xs text-center py-2",
                        criticalCount > 0 ? "text-red-300/70" : "text-amber-300/70"
                    )}>
                        +{attentionItems.length - 5} more items
                    </p>
                )}
            </div>
        </Card>
    );
}

// ==========================================
// Upcoming Deadlines (Consolidated Goals + Milestones)
// ==========================================

function UpcomingDeadlines({ metrics }: { metrics: DashboardMetrics }) {
    const { goals, milestones, nearestGoalDeadline } = metrics;

    // Combine goals and milestones into a unified deadline list
    type DeadlineItem = {
        id: string;
        name: string;
        type: 'goal' | 'milestone';
        targetDate: Date;
        daysLeft: number;
        status: 'on_track' | 'at_risk' | 'overdue' | 'upcoming';
        horizon?: string;
    };

    const today = new Date();

    // Get active goals with target dates
    const goalDeadlines: DeadlineItem[] = goals
        .filter(g => g.status !== 'completed' && g.target_date)
        .map(g => {
            const targetDate = new Date(g.target_date!);
            const daysLeft = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const health = calculateGoalHealth(g);
            return {
                id: g.id,
                name: g.name,
                type: 'goal' as const,
                targetDate,
                daysLeft,
                status: health.status === 'overdue' ? 'overdue' :
                    health.status === 'at_risk' ? 'at_risk' : 'on_track',
                horizon: g.time_horizon,
            };
        });

    // Get active milestones
    const milestoneDeadlines: DeadlineItem[] = milestones
        .filter(m => m.status !== 'completed')
        .map(m => {
            const targetDate = new Date(m.target_date);
            const daysLeft = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
                id: m.id,
                name: m.name,
                type: 'milestone' as const,
                targetDate,
                daysLeft,
                status: m.status === 'at_risk' ? 'at_risk' :
                    daysLeft <= 0 ? 'overdue' :
                        m.status === 'in_progress' ? 'on_track' : 'upcoming',
            };
        });

    // Combine and sort by date
    const allDeadlines = [...goalDeadlines, ...milestoneDeadlines]
        .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
        .slice(0, 5);

    const nearestDays = nearestGoalDeadline?.daysRemaining ??
        (allDeadlines.length > 0 ? allDeadlines[0].daysLeft : null);

    return (
        <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    Upcoming Deadlines
                </h3>
                {nearestDays !== null && (
                    <Badge variant="secondary" className={cn(
                        nearestDays <= 0 ? "text-red-400 bg-red-500/10" :
                            nearestDays <= 7 ? "text-amber-400 bg-amber-500/10" :
                                "text-blue-400 bg-blue-500/10"
                    )}>
                        {nearestDays <= 0 ? 'Overdue!' : `${nearestDays}d to next`}
                    </Badge>
                )}
            </div>

            {allDeadlines.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No upcoming deadlines</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {allDeadlines.map((item) => (
                        <div
                            key={`${item.type}-${item.id}`}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-lg border",
                                item.status === 'overdue'
                                    ? "bg-red-500/10 border-red-500/20"
                                    : item.status === 'at_risk'
                                        ? "bg-amber-500/10 border-amber-500/20"
                                        : "bg-gray-900/50 border-gray-700/50"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center text-xs",
                                    item.type === 'goal'
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "bg-blue-500/20 text-blue-400"
                                )}>
                                    {item.type === 'goal' ? <Flag className="w-3 h-3" /> : <Target className="w-3 h-3" />}
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-200">{item.name}</span>
                                    {item.horizon && (
                                        <span className="ml-2 text-[10px] text-gray-500 uppercase">{item.horizon}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-xs font-medium",
                                    item.daysLeft <= 0 ? "text-red-400" :
                                        item.daysLeft <= 7 ? "text-amber-400" :
                                            "text-gray-400"
                                )}>
                                    {item.daysLeft <= 0 ? 'Overdue' : `${item.daysLeft}d`}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {item.targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ==========================================
// Scope Progress Ring
// ==========================================

function ScopeProgressRing({ metrics }: { metrics: DashboardMetrics }) {
    const { percentComplete, completedScope, totalScope } = metrics;

    return (
        <Card className="bg-gray-800/50 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Scope Progress
            </h3>

            <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="56"
                            cy="56"
                            r="48"
                            stroke="#1f2937"
                            strokeWidth="10"
                            fill="none"
                        />
                        <circle
                            cx="56"
                            cy="56"
                            r="48"
                            stroke="#10B981"
                            strokeWidth="10"
                            fill="none"
                            strokeDasharray={`${(percentComplete / 100) * 301} 301`}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-white">{percentComplete}%</span>
                    </div>
                </div>

                <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Completed</span>
                        <span className="text-sm font-medium text-green-400">{completedScope}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Remaining</span>
                        <span className="text-sm font-medium text-gray-200">{totalScope - completedScope}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                        <span className="text-sm text-gray-400">Total Scope</span>
                        <span className="text-sm font-medium text-white">{totalScope}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}

// ==========================================
// Main Component
// ==========================================

export function ExecutiveDashboard({ projectId }: { projectId: string }) {
    const metrics = useProjectHealth(projectId);

    if (metrics.loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Hero Health Panel - Full Width */}
            <HeroHealthPanel metrics={metrics} />

            {/* Primary Row: Goals + Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GoalsOverview metrics={metrics} />
                <AttentionPanel metrics={metrics} />
            </div>

            {/* Secondary Row: Team + Priority + Deadlines */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TeamWorkloadPanel
                    workload={metrics.teamWorkload}
                    unassignedTasks={metrics.unassignedTasks}
                />
                <PriorityBreakdown breakdown={metrics.priorityBreakdown} />
                <UpcomingDeadlines metrics={metrics} />
            </div>

            {/* Tertiary Row: Scope Progress + AI Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ScopeProgressRing metrics={metrics} />
                <AIMetricsWidget />
            </div>
        </div>
    );
}
