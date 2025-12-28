import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { useProjectHealth, type DashboardMetrics, type HealthStatus } from './use-project-health';
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingUp, Clock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';


// ==========================================
// Sub-Components
// ==========================================

function HealthBadge({ status }: { status: HealthStatus }) {
    const config = {
        on_track: { color: 'bg-green-500', text: 'On Track', icon: CheckCircle2 },
        at_risk: { color: 'bg-yellow-500', text: 'At Risk', icon: AlertTriangle },
        off_track: { color: 'bg-red-500', text: 'Off Track', icon: AlertCircle },
    };

    const { color, text, icon: Icon } = config[status];

    return (
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-white font-medium text-sm", color)}>
            <Icon className="w-4 h-4" />
            {text}
        </div>
    );
}

function StatCard({ label, value, subtext, icon: Icon }: { label: string; value: string | number; subtext?: string; icon: any }) {
    return (
        <Card className="p-4 bg-gray-800/50 border-gray-700">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-gray-400 text-sm mb-1">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
                </div>
                <div className="p-2 bg-gray-700/50 rounded-lg">
                    <Icon className="w-5 h-5 text-purple-400" />
                </div>
            </div>
        </Card>
    );
}

// ==========================================
// Section Components
// ==========================================

function ProjectPulse({ metrics }: { metrics: DashboardMetrics }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Executive Dashboard</h2>
                    <p className="text-gray-400">Real-time project health and velocity metrics</p>
                </div>
                <HealthBadge status={metrics.health} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Velocity (7d)"
                    value={metrics.velocity}
                    subtext="Stories completed"
                    icon={TrendingUp}
                />
                <StatCard
                    label="Completion"
                    value={`${metrics.percentComplete}%`}
                    subtext={`${metrics.completedScope}/${metrics.totalScope} Stories`}
                    icon={CheckCircle2}
                />
                <StatCard
                    label="Next Milestone"
                    value={metrics.daysToNextMilestone !== null ? `${metrics.daysToNextMilestone} Days` : 'N/A'}
                    subtext={metrics.nextMilestoneName || 'No active milestones'}
                    icon={Clock}
                />
                <StatCard
                    label="Active Blockers"
                    value={metrics.activeBlockers.length}
                    subtext="Requires attention"
                    icon={AlertCircle}
                />
            </div>
        </div>
    );
}

function StrategicRoadmap({ milestones }: { milestones: DashboardMetrics['milestones'] }) {
    // Sort milestones by date
    const sorted = [...milestones].sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());

    // Determine date range (start of first milestone to end of last, or default to now + 3 months)
    const today = new Date();
    const startDate = sorted.length > 0 && sorted[0].start_date ? new Date(sorted[0].start_date) : new Date();
    startDate.setDate(startDate.getDate() - 7); // Buffer

    const endDate = sorted.length > 0 ? new Date(sorted[sorted.length - 1].target_date) : new Date();
    endDate.setDate(endDate.getDate() + 30); // Buffer

    const totalDuration = endDate.getTime() - startDate.getTime();

    const getPosition = (dateStr: string) => {
        const date = new Date(dateStr);
        const diff = date.getTime() - startDate.getTime();
        return Math.max(0, Math.min(100, (diff / totalDuration) * 100));
    };

    return (
        <Card className="bg-gray-800/50 border-gray-700 p-6 col-span-full">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Strategic Timeline
            </h3>
            <div className="relative h-24 w-full bg-gray-900/50 rounded-lg p-4 overflow-hidden">
                {/* Timeline Axis */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-700 transform -translate-y-1/2" />

                {/* Today Marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                    style={{ left: `${getPosition(today.toISOString())}%` }}
                >
                    <div className="absolute -top-1 -translate-x-1/2 text-[10px] text-blue-400 font-bold bg-gray-900 px-1 rounded">TODAY</div>
                </div>

                {/* Milestones */}
                {sorted.map(m => {
                    const left = m.start_date ? getPosition(m.start_date) : getPosition(m.target_date) - 10;
                    const right = getPosition(m.target_date);
                    const width = Math.max(2, right - left);

                    return (
                        <div
                            key={m.id}
                            className={cn(
                                "absolute top-1/2 transform -translate-y-1/2 h-8 rounded-md flex items-center px-2 text-xs font-medium text-white transition-all hover:bg-opacity-80 cursor-default group",
                                m.status === 'completed' ? 'bg-green-600/80' :
                                    m.status === 'at_risk' ? 'bg-red-600/80' :
                                        'bg-blue-600/80'
                            )}
                            style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                minWidth: '100px'
                            }}
                        >
                            <span className="truncate">{m.name}</span>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-950 text-white text-xs rounded border border-gray-800 opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none transition-opacity">
                                {m.name} ({new Date(m.target_date).toLocaleDateString()})
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

function EpicProgressList({ epics }: { epics: DashboardMetrics['epics'] }) {
    return (
        <Card className="bg-gray-800/50 border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Strategic Roadmap Progress
            </h3>
            <div className="space-y-6">
                {epics.length === 0 ? (
                    <p className="text-gray-400 italic">No epics defined yet.</p>
                ) : (
                    epics.map(epic => {
                        const total = epic.user_story_count || 0;
                        const done = epic.completed_story_count || 0;
                        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

                        return (
                            <div key={epic.id} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-gray-200">{epic.name}</span>
                                    <span className="text-gray-400">{percent}% ({done}/{total})</span>
                                </div>
                                <Progress value={percent} className="h-2" />
                            </div>
                        );
                    })
                )}
            </div>
        </Card>
    );
}

function BlockerAlerts({ blockers }: { blockers: DashboardMetrics['activeBlockers'] }) {
    if (blockers.length === 0) return null;

    return (
        <Card className="bg-red-500/10 border-red-500/20 p-6">
            <h3 className="text-lg font-semibold text-red-200 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Attention Required ({blockers.length})
            </h3>
            <div className="space-y-3">
                {blockers.map(story => (
                    <div key={story.id} className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/10">
                        <Badge variant="destructive" className="mt-0.5">{story.priority}</Badge>
                        <div>
                            <p className="text-sm font-medium text-red-100">{story.narrative}</p>
                            <p className="text-xs text-red-300 mt-1">Feature: {story.feature_area}</p>
                        </div>
                    </div>
                ))}
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
        <div className="space-y-8 animate-in fade-in duration-500">
            <ProjectPulse metrics={metrics} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <StrategicRoadmap milestones={metrics.milestones} />
                <EpicProgressList epics={metrics.epics} />
                <div className="space-y-8">
                    <BlockerAlerts blockers={metrics.activeBlockers} />
                    {/* Placeholder for Scope Burn or other secondary charts */}
                    <Card className="bg-gray-800/50 border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Scope Burn</h3>
                        <div className="flex items-center gap-6">
                            <div className="relative w-32 h-32 flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="#1f2937"
                                        strokeWidth="12"
                                        fill="none"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="#10B981"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${(metrics.percentComplete / 100) * 351} 351`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-white">{metrics.percentComplete}%</span>
                                    <span className="text-xs text-gray-400">Complete</span>
                                </div>
                            </div>
                            <div className="space-y-3 flex-1">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Completed</span>
                                        <span className="text-green-400 font-medium">{metrics.completedScope}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">Stories finished</div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Remaining</span>
                                        <span className="text-gray-200 font-medium">{metrics.totalScope - metrics.completedScope}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">Stories to do</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
