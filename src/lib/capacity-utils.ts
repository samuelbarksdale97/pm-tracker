/**
 * Capacity planning utilities for goals and milestones
 */

import { Goal } from './supabase';
import { differenceInBusinessDays, differenceInCalendarDays } from 'date-fns';

// Default assumptions for capacity planning
const DEFAULT_STORIES_PER_WEEK = 3; // Average stories a team can complete per week
const WORKDAYS_PER_WEEK = 5;

export type CapacityStatus = 'healthy' | 'tight' | 'overloaded' | 'unknown';

export interface CapacityAnalysis {
    status: CapacityStatus;
    message: string;
    // Detailed metrics
    totalStories: number;
    completedStories: number;
    remainingStories: number;
    daysRemaining: number;
    businessDaysRemaining: number;
    // Calculated capacity
    storiesPerWeek: number;
    weeksRemaining: number;
    expectedCapacity: number;
    loadPercentage: number;
}

/**
 * Analyze capacity for a goal based on story count and target date
 */
export function analyzeGoalCapacity(
    goal: Goal,
    storiesPerWeek: number = DEFAULT_STORIES_PER_WEEK
): CapacityAnalysis {
    const totalStories = goal.total_story_count || 0;
    const completedStories = goal.completed_story_count || 0;
    const remainingStories = totalStories - completedStories;

    // No target date - can't analyze capacity
    if (!goal.target_date) {
        return {
            status: 'unknown',
            message: 'No target date set',
            totalStories,
            completedStories,
            remainingStories,
            daysRemaining: 0,
            businessDaysRemaining: 0,
            storiesPerWeek,
            weeksRemaining: 0,
            expectedCapacity: 0,
            loadPercentage: 0,
        };
    }

    // No remaining work - all done
    if (remainingStories <= 0) {
        return {
            status: 'healthy',
            message: 'All stories completed',
            totalStories,
            completedStories,
            remainingStories: 0,
            daysRemaining: 0,
            businessDaysRemaining: 0,
            storiesPerWeek,
            weeksRemaining: 0,
            expectedCapacity: 0,
            loadPercentage: 0,
        };
    }

    // Parse target date
    const parseLocalDate = (dateStr: string): Date => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date(dateStr);
    };

    const targetDate = parseLocalDate(goal.target_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysRemaining = differenceInCalendarDays(targetDate, today);
    const businessDaysRemaining = Math.max(0, differenceInBusinessDays(targetDate, today));

    // Past target date
    if (daysRemaining < 0) {
        return {
            status: 'overloaded',
            message: `Overdue by ${Math.abs(daysRemaining)} days`,
            totalStories,
            completedStories,
            remainingStories,
            daysRemaining,
            businessDaysRemaining: 0,
            storiesPerWeek,
            weeksRemaining: 0,
            expectedCapacity: 0,
            loadPercentage: 999,
        };
    }

    // Calculate capacity
    const weeksRemaining = businessDaysRemaining / WORKDAYS_PER_WEEK;
    const expectedCapacity = Math.floor(weeksRemaining * storiesPerWeek);
    const loadPercentage = expectedCapacity > 0
        ? Math.round((remainingStories / expectedCapacity) * 100)
        : (remainingStories > 0 ? 999 : 0);

    // Determine status
    let status: CapacityStatus;
    let message: string;

    if (loadPercentage <= 80) {
        status = 'healthy';
        message = `On track (${loadPercentage}% capacity)`;
    } else if (loadPercentage <= 100) {
        status = 'tight';
        message = `Tight schedule (${loadPercentage}% capacity)`;
    } else {
        status = 'overloaded';
        const overBy = remainingStories - expectedCapacity;
        message = `${overBy} stories over capacity`;
    }

    return {
        status,
        message,
        totalStories,
        completedStories,
        remainingStories,
        daysRemaining,
        businessDaysRemaining,
        storiesPerWeek,
        weeksRemaining: Math.round(weeksRemaining * 10) / 10,
        expectedCapacity,
        loadPercentage,
    };
}

/**
 * Get capacity status color classes
 */
export function getCapacityStatusColors(status: CapacityStatus): {
    text: string;
    bg: string;
    border: string;
    icon: string;
} {
    switch (status) {
        case 'healthy':
            return {
                text: 'text-green-400',
                bg: 'bg-green-500/10',
                border: 'border-green-500/30',
                icon: 'text-green-400',
            };
        case 'tight':
            return {
                text: 'text-amber-400',
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/30',
                icon: 'text-amber-400',
            };
        case 'overloaded':
            return {
                text: 'text-red-400',
                bg: 'bg-red-500/10',
                border: 'border-red-500/30',
                icon: 'text-red-400',
            };
        case 'unknown':
        default:
            return {
                text: 'text-gray-400',
                bg: 'bg-gray-500/10',
                border: 'border-gray-500/30',
                icon: 'text-gray-400',
            };
    }
}
