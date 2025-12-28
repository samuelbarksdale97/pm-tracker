import { useState, useEffect, useMemo } from 'react';
import {
    getEpicsWithCounts,
    getMilestones,
    getUserStories,
    checkMilestoneOverdue,
    type Epic,
    type Milestone,
    type UserStory
} from '@/lib/supabase';

export type HealthStatus = 'on_track' | 'at_risk' | 'off_track';

export interface DashboardMetrics {
    health: HealthStatus;
    velocity: number; // Stories completed in last 7 days
    totalScope: number; // Total user stories
    completedScope: number; // Total completed stories
    percentComplete: number;
    daysToNextMilestone: number | null;
    nextMilestoneName: string | null;
    activeBlockers: UserStory[];
    epics: Epic[];
    milestones: Milestone[];
    loading: boolean;
}

export function useProjectHealth(projectId: string): DashboardMetrics {
    const [epics, setEpics] = useState<Epic[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [stories, setStories] = useState<UserStory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const [epicsData, milestonesData, storiesData] = await Promise.all([
                    getEpicsWithCounts(projectId),
                    getMilestones(projectId),
                    getUserStories(projectId)
                ]);

                setEpics(epicsData);
                setMilestones(milestonesData);
                setStories(storiesData);

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

    // Calculate Velocity (Last 7 days)
    const velocity = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return stories.filter(s =>
            s.status === 'Done' &&
            new Date(s.updated_at) >= sevenDaysAgo
        ).length;
    }, [stories]);

    // Calculate Completion
    const { totalScope, completedScope, percentComplete } = useMemo(() => {
        const total = stories.length;
        const completed = stories.filter(s => s.status === 'Done').length;
        return {
            totalScope: total,
            completedScope: completed,
            percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }, [stories]);

    // Blockers
    const activeBlockers = useMemo(() => {
        return stories.filter(s => s.status === 'Blocked');
    }, [stories]);

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

    // Health Logic
    const health = useMemo((): HealthStatus => {
        // Red condition: P0 blockers or overdue active milestones
        const hasP0Blockers = activeBlockers.some(s => s.priority === 'P0');
        const hasOverdueMilestones = milestones.some(m => m.status === 'at_risk');

        if (hasP0Blockers || hasOverdueMilestones) return 'off_track';

        // Yellow condition: Any blockers, or next milestone < 2 days away with low progress
        const hasBlockers = activeBlockers.length > 0;
        const milestonePressure = daysToNextMilestone !== null && daysToNextMilestone < 7 && velocity < 2; // Arbitrary pressure check

        if (hasBlockers || milestonePressure) return 'at_risk';

        return 'on_track';
    }, [activeBlockers, milestones, daysToNextMilestone, velocity]);

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
        loading
    };
}
