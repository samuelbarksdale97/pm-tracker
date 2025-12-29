/**
 * Backup and restore utilities for PM Tracker data
 * Creates full project backups and restores them
 */

import {
    supabase,
    Epic,
    Feature,
    UserStory,
    Goal,
} from './supabase';

export interface BackupData {
    version: string;
    timestamp: string;
    projectId: string;
    projectName: string;
    data: {
        epics: Epic[];
        features: Feature[];
        userStories: UserStory[];
        goals: Goal[];
    };
    metadata: {
        epicCount: number;
        featureCount: number;
        storyCount: number;
        goalCount: number;
    };
}

const BACKUP_VERSION = '1.0.0';

/**
 * Create a full backup of project data
 */
export async function createBackup(projectId: string, projectName: string): Promise<BackupData> {
    // Fetch all project data
    const [epicsResult, featuresResult, storiesResult, goalsResult] = await Promise.all([
        supabase.from('pm_epics').select('*').eq('project_id', projectId).order('display_order'),
        supabase.from('pm_features').select('*').eq('project_id', projectId).order('display_order'),
        supabase.from('pm_user_stories').select('*').eq('project_id', projectId).order('sort_order'),
        supabase.from('pm_goals').select('*').eq('project_id', projectId).order('display_order'),
    ]);

    const epics = (epicsResult.data || []) as Epic[];
    const features = (featuresResult.data || []) as Feature[];
    const userStories = (storiesResult.data || []) as UserStory[];
    const goals = (goalsResult.data || []) as Goal[];

    return {
        version: BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        projectId,
        projectName,
        data: {
            epics,
            features,
            userStories,
            goals,
        },
        metadata: {
            epicCount: epics.length,
            featureCount: features.length,
            storyCount: userStories.length,
            goalCount: goals.length,
        },
    };
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(backup: BackupData): void {
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `pm-tracker-backup-${backup.projectName.replace(/\s+/g, '-')}-${backup.timestamp.split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Read backup file
 */
export async function readBackupFile(file: File): Promise<BackupData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result as string) as BackupData;

                // Validate backup structure
                if (!data.version || !data.data || !data.projectId) {
                    throw new Error('Invalid backup file format');
                }

                resolve(data);
            } catch (e) {
                reject(new Error('Failed to parse backup file'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

export interface RestoreOptions {
    clearExisting: boolean; // If true, deletes existing data before restore
    skipExisting: boolean;  // If true, skips items with matching IDs
}

export interface RestoreResult {
    success: boolean;
    restored: {
        epics: number;
        features: number;
        userStories: number;
        goals: number;
    };
    skipped: {
        epics: number;
        features: number;
        userStories: number;
        goals: number;
    };
    errors: string[];
}

/**
 * Restore backup data to the database
 */
export async function restoreBackup(
    backup: BackupData,
    targetProjectId: string,
    options: RestoreOptions
): Promise<RestoreResult> {
    const result: RestoreResult = {
        success: true,
        restored: { epics: 0, features: 0, userStories: 0, goals: 0 },
        skipped: { epics: 0, features: 0, userStories: 0, goals: 0 },
        errors: [],
    };

    try {
        // Clear existing data if requested
        if (options.clearExisting) {
            await supabase.from('pm_user_stories').delete().eq('project_id', targetProjectId);
            await supabase.from('pm_features').delete().eq('project_id', targetProjectId);
            await supabase.from('pm_epics').delete().eq('project_id', targetProjectId);
            await supabase.from('pm_goals').delete().eq('project_id', targetProjectId);
        }

        // Create ID mapping for relationships
        const epicIdMap = new Map<string, string>();
        const featureIdMap = new Map<string, string>();
        const goalIdMap = new Map<string, string>();

        // Restore epics
        for (const epic of backup.data.epics) {
            const newEpic = {
                ...epic,
                project_id: targetProjectId,
                id: undefined, // Let DB generate new ID
            };
            delete (newEpic as any).id;

            const { data, error } = await supabase
                .from('pm_epics')
                .insert(newEpic)
                .select()
                .single();

            if (error) {
                result.errors.push(`Failed to restore epic "${epic.name}": ${error.message}`);
                result.skipped.epics++;
            } else if (data) {
                epicIdMap.set(epic.id, data.id);
                result.restored.epics++;
            }
        }

        // Restore goals
        for (const goal of backup.data.goals) {
            const newGoal = {
                ...goal,
                project_id: targetProjectId,
                id: undefined,
            };
            delete (newGoal as any).id;

            const { data, error } = await supabase
                .from('pm_goals')
                .insert(newGoal)
                .select()
                .single();

            if (error) {
                result.errors.push(`Failed to restore goal "${goal.name}": ${error.message}`);
                result.skipped.goals++;
            } else if (data) {
                goalIdMap.set(goal.id, data.id);
                result.restored.goals++;
            }
        }

        // Restore features (with updated epic_id and goal_id references)
        for (const feature of backup.data.features) {
            const newFeature = {
                ...feature,
                project_id: targetProjectId,
                epic_id: feature.epic_id ? epicIdMap.get(feature.epic_id) || feature.epic_id : null,
                goal_id: feature.goal_id ? goalIdMap.get(feature.goal_id) || feature.goal_id : null,
                id: undefined,
            };
            delete (newFeature as any).id;

            const { data, error } = await supabase
                .from('pm_features')
                .insert(newFeature)
                .select()
                .single();

            if (error) {
                result.errors.push(`Failed to restore feature "${feature.name}": ${error.message}`);
                result.skipped.features++;
            } else if (data) {
                featureIdMap.set(feature.id, data.id);
                result.restored.features++;
            }
        }

        // Restore user stories (with updated references)
        for (const story of backup.data.userStories) {
            const newStory = {
                ...story,
                project_id: targetProjectId,
                epic_id: story.epic_id ? epicIdMap.get(story.epic_id) || story.epic_id : null,
                feature_id: story.feature_id ? featureIdMap.get(story.feature_id) || story.feature_id : null,
                id: undefined,
            };
            delete (newStory as any).id;
            delete (newStory as any).epic;
            delete (newStory as any).feature;
            delete (newStory as any).owner;

            const { error } = await supabase
                .from('pm_user_stories')
                .insert(newStory);

            if (error) {
                result.errors.push(`Failed to restore story: ${error.message}`);
                result.skipped.userStories++;
            } else {
                result.restored.userStories++;
            }
        }

    } catch (error) {
        result.success = false;
        result.errors.push(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
}
