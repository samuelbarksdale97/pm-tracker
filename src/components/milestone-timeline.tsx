'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, User, Shield, Briefcase, Building2, Users } from 'lucide-react';
import { UserStory, Milestone } from '@/lib/supabase';

interface MilestoneTimelineProps {
    milestones: Milestone[];
    userStories: UserStory[];
    onStoryClick?: (story: UserStory) => void;
}

const statusStyles: Record<Milestone['status'], { bg: string; text: string; label: string }> = {
    upcoming: { bg: 'bg-gray-700', text: 'text-gray-300', label: 'Upcoming' },
    in_progress: { bg: 'bg-blue-600', text: 'text-blue-100', label: 'In Progress' },
    completed: { bg: 'bg-green-600', text: 'text-green-100', label: 'Completed' },
    at_risk: { bg: 'bg-red-600', text: 'text-red-100', label: 'At Risk' },
};

const userStoryStatusStyles: Record<string, { dot: string; text: string }> = {
    'Not Started': { dot: 'bg-gray-500', text: 'text-gray-400' },
    'In Progress': { dot: 'bg-blue-500', text: 'text-blue-400' },
    'Testing': { dot: 'bg-purple-500', text: 'text-purple-400' },
    'Done': { dot: 'bg-green-500', text: 'text-green-400' },
    'Blocked': { dot: 'bg-amber-500', text: 'text-amber-400' },
};

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

export function MilestoneTimeline({ milestones, userStories, onStoryClick }: MilestoneTimelineProps) {
    const today = new Date();
    const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

    // Group user stories by milestone
    const userStoriesByMilestone = useMemo(() => {
        const grouped: Record<string, UserStory[]> = { unassigned: [] };
        milestones.forEach(m => { grouped[m.id] = []; });

        userStories.forEach(us => {
            if (us.milestone_id && grouped[us.milestone_id]) {
                grouped[us.milestone_id].push(us);
            } else {
                grouped.unassigned.push(us);
            }
        });
        return grouped;
    }, [milestones, userStories]);

    // Calculate milestone progress from user stories
    const enrichedMilestones = useMemo(() => {
        return milestones.map(m => {
            const milestoneStories = userStoriesByMilestone[m.id] || [];
            const done = milestoneStories.filter(us => us.status === 'Done').length;
            const total = milestoneStories.length;
            const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

            return {
                ...m,
                userStoryCount: total,
                userStoriesDone: done,
                percentage
            };
        });
    }, [milestones, userStoriesByMilestone]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getDaysUntil = (dateStr: string) => {
        const target = new Date(dateStr);
        const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return `${Math.abs(diff)}d overdue`;
        if (diff === 0) return 'Today';
        return `${diff}d left`;
    };

    const toggleMilestone = (id: string) => {
        setExpandedMilestones(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Overall stats
    const overallStats = useMemo(() => {
        const done = userStories.filter(us => us.status === 'Done').length;
        const inProgress = userStories.filter(us => us.status === 'In Progress').length;
        const blocked = userStories.filter(us => us.status === 'Blocked').length;
        const total = userStories.length;
        return { done, inProgress, blocked, total, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
    }, [userStories]);

    return (
        <div className="space-y-8">
            {/* Timeline Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Launch Timeline</h2>
                    <p className="text-gray-400 text-sm">
                        {overallStats.done}/{overallStats.total} User Stories Complete ({overallStats.percentage}%)
                    </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        Done
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        In Progress
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        Blocked
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                        Not Started
                    </span>
                </div>
            </div>

            {/* Horizontal Timeline */}
            <div className="relative">
                <div className="absolute top-6 left-0 right-0 h-1 bg-gray-700 rounded-full" />
                <div className="relative flex justify-between">
                    {enrichedMilestones.slice(0, 7).map((milestone) => {
                        const style = statusStyles[milestone.status];
                        const hasStories = milestone.userStoryCount > 0;

                        return (
                            <div key={milestone.id} className="flex flex-col items-center" style={{ flex: 1 }}>
                                <div className={`w-4 h-4 rounded-full border-4 border-gray-950 z-10 ${style.bg}`} />
                                <Card
                                    className={`mt-4 p-3 bg-gray-900 border-gray-800 w-full max-w-[140px] cursor-pointer transition-all hover:border-gray-600 ${milestone.status === 'in_progress' ? 'ring-2 ring-blue-500' : ''
                                        }`}
                                    onClick={() => toggleMilestone(milestone.id)}
                                >
                                    <div className="text-xs text-gray-400 mb-1">{formatDate(milestone.target_date)}</div>
                                    <div className="font-medium text-white text-sm mb-1 truncate" title={milestone.name}>
                                        {milestone.name}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Badge className={`${style.bg} ${style.text} text-xs`}>
                                            {getDaysUntil(milestone.target_date)}
                                        </Badge>
                                    </div>
                                    {hasStories && (
                                        <div className="mt-2">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>{milestone.userStoriesDone}/{milestone.userStoryCount} stories</span>
                                                <span>{milestone.percentage}%</span>
                                            </div>
                                            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 transition-all"
                                                    style={{ width: `${milestone.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Milestone Swim Lanes */}
            <div className="space-y-4 mt-8">
                <h3 className="text-lg font-semibold text-white">User Stories by Milestone</h3>

                {enrichedMilestones.map((milestone) => {
                    const stories = userStoriesByMilestone[milestone.id] || [];
                    const isExpanded = expandedMilestones.has(milestone.id);
                    const style = statusStyles[milestone.status];

                    return (
                        <Card key={milestone.id} className="bg-gray-900 border-gray-800 overflow-hidden">
                            {/* Milestone Header */}
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                onClick={() => toggleMilestone(milestone.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                    <div
                                        className={`w-3 h-3 rounded-full ${style.bg}`}
                                    />
                                    <div>
                                        <span className="font-medium text-white">{milestone.name}</span>
                                        <span className="text-gray-500 text-sm ml-2">
                                            {formatDate(milestone.target_date)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-gray-400">
                                        {stories.length} user {stories.length === 1 ? 'story' : 'stories'}
                                    </div>
                                    <div className="w-32 flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 transition-all"
                                                style={{ width: `${milestone.percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-white w-10 text-right">
                                            {milestone.percentage}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* User Stories List */}
                            {isExpanded && stories.length > 0 && (
                                <div className="border-t border-gray-800 bg-gray-950/50">
                                    {stories.map((story) => {
                                        const PersonaIcon = personaIcons[story.persona] || User;
                                        const statusStyle = userStoryStatusStyles[story.status] || userStoryStatusStyles['Not Started'];

                                        return (
                                            <div
                                                key={story.id}
                                                className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-b-0 hover:bg-gray-800/30 cursor-pointer transition-colors"
                                                onClick={() => onStoryClick?.(story)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <PersonaIcon className={`w-4 h-4 ${personaColors[story.persona]}`} />
                                                    <span className="text-sm text-white hover:text-blue-400">{story.narrative}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="text-xs text-gray-400">
                                                        {story.feature_area}
                                                    </Badge>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                                                        <span className={`text-xs ${statusStyle.text}`}>{story.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Empty state */}
                            {isExpanded && stories.length === 0 && (
                                <div className="border-t border-gray-800 p-4 text-center text-gray-500 text-sm">
                                    No user stories assigned to this milestone
                                </div>
                            )}
                        </Card>
                    );
                })}

                {/* Unassigned User Stories */}
                {userStoriesByMilestone.unassigned.length > 0 && (
                    <Card className="bg-gray-900 border-gray-800 border-dashed overflow-hidden">
                        <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                            onClick={() => toggleMilestone('unassigned')}
                        >
                            <div className="flex items-center gap-3">
                                <button className="p-1 hover:bg-gray-700 rounded transition-colors">
                                    {expandedMilestones.has('unassigned') ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                                <div className="w-3 h-3 rounded-full bg-gray-600 border-2 border-dashed border-gray-500" />
                                <span className="font-medium text-gray-400">Unassigned to Milestone</span>
                            </div>
                            <div className="text-sm text-gray-500">
                                {userStoriesByMilestone.unassigned.length} user stories
                            </div>
                        </div>

                        {expandedMilestones.has('unassigned') && (
                            <div className="border-t border-gray-800 bg-gray-950/50">
                                {userStoriesByMilestone.unassigned.map((story) => {
                                    const PersonaIcon = personaIcons[story.persona] || User;
                                    const statusStyle = userStoryStatusStyles[story.status] || userStoryStatusStyles['Not Started'];

                                    return (
                                        <div
                                            key={story.id}
                                            className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-b-0 hover:bg-gray-800/30 cursor-pointer transition-colors"
                                            onClick={() => onStoryClick?.(story)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <PersonaIcon className={`w-4 h-4 ${personaColors[story.persona]}`} />
                                                <span className="text-sm text-white hover:text-blue-400">{story.narrative}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="text-xs text-gray-400">
                                                    {story.feature_area}
                                                </Badge>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                                                    <span className={`text-xs ${statusStyle.text}`}>{story.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}
