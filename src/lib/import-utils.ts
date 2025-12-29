/**
 * Import utilities for PM Tracker data
 * Supports importing user stories from CSV and JSON
 */

export type PersonaType = 'member' | 'admin' | 'staff' | 'business' | 'guest';

export interface ImportedStory {
    narrative: string;
    persona: PersonaType;
    priority: 'P0' | 'P1' | 'P2';
    status?: 'Not Started' | 'In Progress' | 'Testing' | 'Done' | 'Blocked';
    feature?: string;
    epic?: string;
    acceptanceCriteria?: string[];
}

export interface ImportResult {
    success: boolean;
    stories: ImportedStory[];
    errors: string[];
    warnings: string[];
}

/**
 * Parse CSV content into ImportedStory array
 * Expected columns: narrative, persona, priority, status, feature, epic, acceptance_criteria
 */
export function parseCSV(content: string): ImportResult {
    const result: ImportResult = {
        success: true,
        stories: [],
        errors: [],
        warnings: [],
    };

    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        result.success = false;
        result.errors.push('CSV must have at least a header row and one data row');
        return result;
    }

    // Parse header
    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const narrativeIndex = header.findIndex(h => h.includes('narrative') || h === 'story' || h === 'description');
    const personaIndex = header.findIndex(h => h.includes('persona') || h === 'user' || h === 'role');
    const priorityIndex = header.findIndex(h => h.includes('priority'));
    const statusIndex = header.findIndex(h => h.includes('status'));
    const featureIndex = header.findIndex(h => h.includes('feature'));
    const epicIndex = header.findIndex(h => h.includes('epic'));
    const acIndex = header.findIndex(h => h.includes('acceptance') || h.includes('criteria'));

    if (narrativeIndex === -1) {
        result.success = false;
        result.errors.push('CSV must have a "narrative" or "story" column');
        return result;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.every(v => !v.trim())) continue; // Skip empty rows

        const narrative = values[narrativeIndex]?.trim();
        if (!narrative) {
            result.warnings.push(`Row ${i + 1}: Empty narrative, skipped`);
            continue;
        }

        const story: ImportedStory = {
            narrative,
            persona: normalizePersona(values[personaIndex]?.trim()),
            priority: normalizePriority(values[priorityIndex]?.trim()),
            status: normalizeStatus(values[statusIndex]?.trim()),
            feature: values[featureIndex]?.trim() || undefined,
            epic: values[epicIndex]?.trim() || undefined,
            acceptanceCriteria: values[acIndex]
                ? values[acIndex].split(/[;\|]/).map(s => s.trim()).filter(Boolean)
                : undefined,
        };

        result.stories.push(story);
    }

    if (result.stories.length === 0) {
        result.success = false;
        result.errors.push('No valid stories found in CSV');
    }

    return result;
}

/**
 * Parse JSON content into ImportedStory array
 */
export function parseJSON(content: string): ImportResult {
    const result: ImportResult = {
        success: true,
        stories: [],
        errors: [],
        warnings: [],
    };

    try {
        const data = JSON.parse(content);
        const stories = Array.isArray(data) ? data : data.stories || data.userStories || [];

        if (!Array.isArray(stories)) {
            result.success = false;
            result.errors.push('JSON must contain an array of stories');
            return result;
        }

        for (let i = 0; i < stories.length; i++) {
            const item = stories[i];
            const narrative = item.narrative || item.story || item.description;

            if (!narrative) {
                result.warnings.push(`Item ${i + 1}: Missing narrative, skipped`);
                continue;
            }

            const story: ImportedStory = {
                narrative,
                persona: normalizePersona(item.persona || item.user || item.role),
                priority: normalizePriority(item.priority),
                status: normalizeStatus(item.status),
                feature: item.feature || item.featureName || undefined,
                epic: item.epic || item.epicName || undefined,
                acceptanceCriteria: Array.isArray(item.acceptanceCriteria) || Array.isArray(item.acceptance_criteria)
                    ? item.acceptanceCriteria || item.acceptance_criteria
                    : undefined,
            };

            result.stories.push(story);
        }

        if (result.stories.length === 0) {
            result.success = false;
            result.errors.push('No valid stories found in JSON');
        }
    } catch (e) {
        result.success = false;
        result.errors.push(`Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`);
    }

    return result;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

/**
 * Normalize persona value to valid type
 */
function normalizePersona(value: string | undefined): PersonaType {
    if (!value) return 'member';

    const lower = value.toLowerCase().trim();
    if (lower === 'admin' || lower.includes('administrator')) return 'admin';
    if (lower === 'staff' || lower.includes('employee') || lower.includes('internal')) return 'staff';
    if (lower === 'business' || lower.includes('owner') || lower.includes('manager')) return 'business';
    if (lower === 'guest' || lower.includes('visitor') || lower.includes('unauth')) return 'guest';
    return 'member';
}

/**
 * Normalize priority value to P0/P1/P2
 */
function normalizePriority(value: string | undefined): 'P0' | 'P1' | 'P2' {
    if (!value) return 'P1';

    const upper = value.toUpperCase();
    if (upper === 'P0' || upper.includes('CRITICAL') || upper.includes('HIGH')) return 'P0';
    if (upper === 'P2' || upper.includes('LOW') || upper.includes('NICE')) return 'P2';
    return 'P1';
}

/**
 * Normalize status value
 */
function normalizeStatus(value: string | undefined): ImportedStory['status'] | undefined {
    if (!value) return undefined;

    const lower = value.toLowerCase();
    if (lower.includes('not started') || lower === 'todo' || lower === 'backlog') return 'Not Started';
    if (lower.includes('progress') || lower === 'doing' || lower === 'active') return 'In Progress';
    if (lower.includes('test') || lower === 'review' || lower === 'qa') return 'Testing';
    if (lower.includes('done') || lower.includes('complete') || lower === 'closed') return 'Done';
    if (lower.includes('block')) return 'Blocked';

    return undefined;
}

/**
 * Read file content
 */
export function readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Detect file format from extension or content
 */
export function detectFormat(file: File): 'csv' | 'json' | 'unknown' {
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'csv') return 'csv';
    if (ext === 'json') return 'json';
    return 'unknown';
}
