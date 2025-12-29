import { useState, useEffect, useMemo } from 'react';
import {
    getEpicsWithCounts,
    getMilestones,
    getUserStories,
    getGoals,
    getTeamMembers,
    getStories,
    checkMilestoneOverdue,
    calculateGoalHealth,
    type Epic,
    type Milestone,
    type UserStory,
    type Goal,
    type TeamMember,
    type Story,
} from '@/lib/supabase';

export type HealthStatus = 'on_track' | 'at_risk' | 'off_track';

// Team workload info
export interface TeamWorkload {
    member: TeamMember;
    totalTasks: number;
    inProgress: number;
    blocked: number;
    notStarted: number;
}

// Goals by horizon
export interface GoalsByHorizon {
    now: Goal[];
    next: Goal[];
    later: Goal[];
}

export interface DashboardMetrics {
    health: HealthStatus;
    velocity: number;
    totalScope: number;
    completedScope: number;
    percentComplete: number;
    daysToNextMilestone: number | null;
    nextMilestoneName: string | null;
    activeBlockers: UserStory[];
    epics: Epic[];
    milestones: Milestone[];
    // Goals data
    goals: Goal[];
    goalsByHorizon: GoalsByHorizon;
    goalsAtRisk: Goal[];
    nearestGoalDeadline: { name: string; daysRemaining: number } | null;
    // Team workload
    teamWorkload: TeamWorkload[];
    unassignedTasks: number;
    // Priority breakdown
    priorityBreakdown: {
        p0: { completed: number; total: number };
        p1: { completed: number; total: number };
        p2: { completed: number; total: number };
    };
    loading: boolean;
}

export function useProjectHealth(projectId: string): DashboardMetrics {
    const [epics, setEpics] = useState<Epic[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [userStories, setUserStories] = useState<UserStory[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [tasks, setTasks] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const [epicsData, milestonesData, storiesData, goalsData, teamData, tasksData] = await Promise.all([
                    getEpicsWithCounts(projectId),
                    getMilestones(projectId),
                    getUserStories(projectId),
                    getGoals(projectId),
                    getTeamMembers(),
                    getStories(projectId),
                ]);

                setEpics(epicsData);
                setMilestones(milestonesData);
                setUserStories(storiesData);
                setGoals(goalsData);
                setTeamMembers(teamData);
                setTasks(tasksData);

                // Background check for overdue milestones
                milestonesData.forEach(m => checkMilestoneOverdue(m.id));
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    // Calculate Velocity (Last 7 days) - using user stories
    const velocity = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return userStories.filter(s =>
            s.status === 'Done' &&
            new Date(s.updated_at) >= sevenDaysAgo
        ).length;
    }, [userStories]);

    // Calculate Completion
    const { totalScope, completedScope, percentComplete } = useMemo(() => {
        const total = userStories.length;
        const completed = userStories.filter(s => s.status === 'Done').length;
        return {
            totalScope: total,
            completedScope: completed,
            percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }, [userStories]);

    // Blockers (user stories)
    const activeBlockers = useMemo(() => {
        return userStories.filter(s => s.status === 'Blocked');
    }, [userStories]);

    // Next Milestone
    const { daysToNextMilestone, nextMilestoneName } = useMemo(() => {
        const upcoming = milestones
            .filter(m => m.status === 'upcoming' || m.status === 'in_progress')
            .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())[0];

        if (!upcoming) return { daysToNextMilestone: null, nextMilestoneName: null };

        const target = new Date(upcoming.target_date);
        const today = new Date();
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            daysToNextMilestone: diffDays,
            nextMilestoneName: upcoming.name
        };
    }, [milestones]);

    // Goals by horizon
    const goalsByHorizon = useMemo((): GoalsByHorizon => {
        const now = goals.filter(g => g.time_horizon === 'now' && g.status !== 'completed');
        const next = goals.filter(g => g.time_horizon === 'next' && g.status !== 'completed');
        const later = goals.filter(g => g.time_horizon === 'later' && g.status !== 'completed');
        return { now, next, later };
    }, [goals]);

    // Goals at risk
    const goalsAtRisk = useMemo(() => {
        return goals.filter(g => {
            if (g.status === 'completed') return false;
            const health = calculateGoalHealth(g);
            return health.status === 'at_risk' || health.status === 'overdue';
        });
    }, [goals]);

    // Nearest goal deadline
    const nearestGoalDeadline = useMemo(() => {
        const activeGoals = goals.filter(g => g.status !== 'completed' && g.target_date);
        if (activeGoals.length === 0) return null;

        const sorted = activeGoals.sort((a, b) =>
            new Date(a.target_date!).getTime() - new Date(b.target_date!).getTime()
        );

        const nearest = sorted[0];
        const target = new Date(nearest.target_date!);
        const today = new Date();
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return { name: nearest.name, daysRemaining: diffDays };
    }, [goals]);

    // Team workload (from tasks/stories)
    const { teamWorkload, unassignedTasks } = useMemo(() => {
        const activeTasks = tasks.filter(t => t.status !== 'Done');
        const workloadMap = new Map<string, { inProgress: number; blocked: number; notStarted: number }>();

        // Initialize for all team members
        teamMembers.forEach(m => {
            workloadMap.set(m.id, { inProgress: 0, blocked: 0, notStarted: 0 });
        });

        let unassigned = 0;

        activeTasks.forEach(task => {
            if (!task.owner_id) {
                unassigned++;
                return;
            }

            const current = workloadMap.get(task.owner_id) || { inProgress: 0, blocked: 0, notStarted: 0 };
            if (task.status === 'In Progress' || task.status === 'Testing') {
                current.inProgress++;
            } else if (task.status === 'Blocked') {
                current.blocked++;
            } else if (task.status === 'Not Started') {
                current.notStarted++;
            }
            workloadMap.set(task.owner_id, current);
        });

        const workload: TeamWorkload[] = teamMembers
            .map(member => {
                const stats = workloadMap.get(member.id) || { inProgress: 0, blocked: 0, notStarted: 0 };
                return {
                    member,
                    totalTasks: stats.inProgress + stats.blocked + stats.notStarted,
                    ...stats
                };
            })
            .filter(w => w.totalTasks > 0)
            .sort((a, b) => b.totalTasks - a.totalTasks);

        return { teamWorkload: workload, unassignedTasks: unassigned };
    }, [tasks, teamMembers]);

    // Priority breakdown (from tasks)
    const priorityBreakdown = useMemo(() => {
        const breakdown = {
            p0: { completed: 0, total: 0 },
            p1: { completed: 0, total: 0 },
            p2: { completed: 0, total: 0 },
        };

        tasks.forEach(task => {
            const key = task.priority?.toLowerCase() as 'p0' | 'p1' | 'p2';
            if (key && breakdown[key]) {
                breakdown[key].total++;
                if (task.status === 'Done') {
                    breakdown[key].completed++;
                }
            }
        });

        return breakdown;
    }, [tasks]);

    // Health Logic
    const health = useMemo((): HealthStatus => {
        // Red condition: P0 blockers, overdue milestones, or overdue goals
        const hasP0Blockers = activeBlockers.some(s => s.priority === 'P0');
        const hasOverdueMilestones = milestones.some(m => m.status === 'at_risk');
        const hasOverdueGoals = goalsAtRisk.some(g => calculateGoalHealth(g).status === 'overdue');

        if (hasP0Blockers || hasOverdueMilestones || hasOverdueGoals) return 'off_track';

        // Yellow condition: Any blockers, goals at risk, or milestone pressure
        const hasBlockers = activeBlockers.length > 0;
        const hasAtRiskGoals = goalsAtRisk.length > 0;
        const milestonePressure = daysToNextMilestone !== null && daysToNextMilestone < 7 && velocity < 2;

        if (hasBlockers || hasAtRiskGoals || milestonePressure) return 'at_risk';

        return 'on_track';
    }, [activeBlockers, milestones, goalsAtRisk, daysToNextMilestone, velocity]);

    return {
        health,
        velocity,
        totalScope,
        completedScope,
        percentComplete,
        daysToNextMilestone,
        nextMilestoneName,
        activeBlockers,
        epics,
        milestones,
        goals,
        goalsByHorizon,
        goalsAtRisk,
        nearestGoalDeadline,
        teamWorkload,
        unassignedTasks,
        priorityBreakdown,
        loading
    };
}
