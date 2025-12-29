/**
 * AI Generation Metrics Tracker
 * Tracks usage statistics for AI-powered story generation
 */

export interface AIGenerationMetrics {
    totalGenerations: number;
    totalStoriesGenerated: number;
    totalStoriesAccepted: number;
    totalStoriesRejected: number;
    totalTokensUsed: number;
    lastGenerationAt: string | null;
    generationsByDate: Record<string, {
        count: number;
        stories: number;
        accepted: number;
    }>;
}

const METRICS_KEY = 'pm_tracker_ai_metrics';

/**
 * Get current AI generation metrics
 */
export function getAIMetrics(): AIGenerationMetrics {
    if (typeof window === 'undefined') {
        return getDefaultMetrics();
    }

    try {
        const stored = localStorage.getItem(METRICS_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error reading AI metrics:', e);
    }

    return getDefaultMetrics();
}

/**
 * Get default empty metrics
 */
function getDefaultMetrics(): AIGenerationMetrics {
    return {
        totalGenerations: 0,
        totalStoriesGenerated: 0,
        totalStoriesAccepted: 0,
        totalStoriesRejected: 0,
        totalTokensUsed: 0,
        lastGenerationAt: null,
        generationsByDate: {},
    };
}

/**
 * Save metrics to local storage
 */
function saveMetrics(metrics: AIGenerationMetrics): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    } catch (e) {
        console.error('Error saving AI metrics:', e);
    }
}

/**
 * Record a new AI generation event
 */
export function recordGeneration(params: {
    storiesGenerated: number;
    storiesAccepted: number;
    tokensUsed?: number;
}): void {
    const metrics = getAIMetrics();
    const today = new Date().toISOString().split('T')[0];

    // Update totals
    metrics.totalGenerations += 1;
    metrics.totalStoriesGenerated += params.storiesGenerated;
    metrics.totalStoriesAccepted += params.storiesAccepted;
    metrics.totalStoriesRejected += params.storiesGenerated - params.storiesAccepted;
    metrics.totalTokensUsed += params.tokensUsed || 0;
    metrics.lastGenerationAt = new Date().toISOString();

    // Update daily stats
    if (!metrics.generationsByDate[today]) {
        metrics.generationsByDate[today] = {
            count: 0,
            stories: 0,
            accepted: 0,
        };
    }
    metrics.generationsByDate[today].count += 1;
    metrics.generationsByDate[today].stories += params.storiesGenerated;
    metrics.generationsByDate[today].accepted += params.storiesAccepted;

    saveMetrics(metrics);
}

/**
 * Get summary stats for display
 */
export function getAIMetricsSummary(): {
    totalGenerations: number;
    totalStories: number;
    acceptanceRate: number;
    todayGenerations: number;
    todayStories: number;
} {
    const metrics = getAIMetrics();
    const today = new Date().toISOString().split('T')[0];
    const todayStats = metrics.generationsByDate[today] || { count: 0, stories: 0, accepted: 0 };

    return {
        totalGenerations: metrics.totalGenerations,
        totalStories: metrics.totalStoriesGenerated,
        acceptanceRate: metrics.totalStoriesGenerated > 0
            ? Math.round((metrics.totalStoriesAccepted / metrics.totalStoriesGenerated) * 100)
            : 0,
        todayGenerations: todayStats.count,
        todayStories: todayStats.stories,
    };
}

/**
 * Reset all metrics (for testing)
 */
export function resetAIMetrics(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(METRICS_KEY);
}
