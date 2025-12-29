/**
 * Export utilities for PM Tracker data
 */

import { UserStory, Epic, Feature, Goal } from './supabase';

export interface ExportData {
    exportedAt: string;
    projectName: string;
    summary: {
        totalStories: number;
        completedStories: number;
        completionRate: number;
        byPriority: Record<string, number>;
        byStatus: Record<string, number>;
    };
    stories: Array<{
        id: string;
        narrative: string;
        persona: string;
        priority: string;
        status: string;
        feature: string;
        epic: string;
        owner: string | null;
        createdAt: string;
    }>;
    epics?: Array<{
        id: string;
        name: string;
        description: string | null;
        status: string;
        priority: string;
        storyCount: number;
        completedCount: number;
    }>;
    features?: Array<{
        id: string;
        name: string;
        description: string | null;
        status: string;
        priority: string;
        epicName: string;
        storyCount: number;
    }>;
}

/**
 * Generate export data from project entities
 */
export function generateExportData(params: {
    projectName: string;
    userStories: UserStory[];
    epics?: Epic[];
    features?: Feature[];
}): ExportData {
    const { projectName, userStories, epics = [], features = [] } = params;

    // Calculate summary stats
    const byPriority: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let completedCount = 0;

    userStories.forEach(story => {
        byPriority[story.priority] = (byPriority[story.priority] || 0) + 1;
        byStatus[story.status] = (byStatus[story.status] || 0) + 1;
        if (story.status === 'Done') completedCount++;
    });

    return {
        exportedAt: new Date().toISOString(),
        projectName,
        summary: {
            totalStories: userStories.length,
            completedStories: completedCount,
            completionRate: userStories.length > 0
                ? Math.round((completedCount / userStories.length) * 100)
                : 0,
            byPriority,
            byStatus,
        },
        stories: userStories.map(story => ({
            id: story.id,
            narrative: story.narrative,
            persona: story.persona,
            priority: story.priority,
            status: story.status,
            feature: story.feature?.name || story.feature_area || 'Unassigned',
            epic: story.epic?.name || 'Unassigned',
            owner: story.owner?.name || null,
            createdAt: story.created_at,
        })),
        epics: epics.map(epic => ({
            id: epic.id,
            name: epic.name,
            description: epic.description,
            status: epic.status,
            priority: epic.priority,
            storyCount: epic.user_story_count || 0,
            completedCount: epic.completed_story_count || 0,
        })),
        features: features.map(feature => ({
            id: feature.id,
            name: feature.name,
            description: feature.description,
            status: feature.status,
            priority: feature.priority,
            epicName: feature.epic?.name || 'Unknown',
            storyCount: feature.user_story_count || 0,
        })),
    };
}

/**
 * Download data as JSON file
 */
export function downloadAsJSON(data: ExportData, filename: string = 'pm-tracker-export'): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Download stories as CSV file
 */
export function downloadAsCSV(data: ExportData, filename: string = 'pm-tracker-stories'): void {
    const headers = ['ID', 'Narrative', 'Persona', 'Priority', 'Status', 'Feature', 'Epic', 'Owner', 'Created'];
    const rows = data.stories.map(story => [
        story.id,
        `"${story.narrative.replace(/"/g, '""')}"`,
        story.persona,
        story.priority,
        story.status,
        `"${story.feature.replace(/"/g, '""')}"`,
        `"${story.epic.replace(/"/g, '""')}"`,
        story.owner || '',
        story.createdAt,
    ]);

    const csv = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
