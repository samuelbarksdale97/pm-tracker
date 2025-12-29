/**
 * Kanban board column configuration
 * Stores user preferences for column visibility, labels, and WIP limits
 */

export interface KanbanColumn {
    status: 'Not Started' | 'In Progress' | 'Testing' | 'Blocked' | 'On Hold' | 'Done';
    label: string;
    color: string;
    visible: boolean;
    wipLimit?: number;
    order: number;
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
    { status: 'Not Started', label: 'Backlog', color: '#6B7280', visible: true, order: 0 },
    { status: 'In Progress', label: 'In Progress', color: '#3B82F6', visible: true, wipLimit: 5, order: 1 },
    { status: 'Testing', label: 'Testing', color: '#8B5CF6', visible: true, wipLimit: 3, order: 2 },
    { status: 'Blocked', label: 'Blocked', color: '#EF4444', visible: true, wipLimit: 3, order: 3 },
    { status: 'On Hold', label: 'On Hold', color: '#F59E0B', visible: true, order: 4 },
    { status: 'Done', label: 'Done', color: '#10B981', visible: true, order: 5 },
];

const STORAGE_KEY = 'pm-tracker-kanban-columns';

/**
 * Get saved column configuration from localStorage
 */
export function getKanbanColumns(): KanbanColumn[] {
    if (typeof window === 'undefined') return DEFAULT_COLUMNS;

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return DEFAULT_COLUMNS;

        const parsed = JSON.parse(saved) as KanbanColumn[];

        // Merge with defaults to handle new statuses
        const merged = DEFAULT_COLUMNS.map(defaultCol => {
            const saved = parsed.find(s => s.status === defaultCol.status);
            return saved || defaultCol;
        });

        return merged.sort((a, b) => a.order - b.order);
    } catch {
        return DEFAULT_COLUMNS;
    }
}

/**
 * Save column configuration to localStorage
 */
export function saveKanbanColumns(columns: KanbanColumn[]): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch {
        console.error('Failed to save kanban columns');
    }
}

/**
 * Reset columns to default
 */
export function resetKanbanColumns(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get only visible columns, sorted by order
 */
export function getVisibleColumns(): KanbanColumn[] {
    return getKanbanColumns()
        .filter(col => col.visible)
        .sort((a, b) => a.order - b.order);
}

/**
 * Update a single column
 */
export function updateKanbanColumn(
    status: KanbanColumn['status'],
    updates: Partial<Omit<KanbanColumn, 'status'>>
): void {
    const columns = getKanbanColumns();
    const index = columns.findIndex(c => c.status === status);
    if (index === -1) return;

    columns[index] = { ...columns[index], ...updates };
    saveKanbanColumns(columns);
}

/**
 * Reorder columns
 */
export function reorderKanbanColumns(fromIndex: number, toIndex: number): void {
    const columns = getKanbanColumns();
    const [moved] = columns.splice(fromIndex, 1);
    columns.splice(toIndex, 0, moved);

    // Update order values
    columns.forEach((col, idx) => {
        col.order = idx;
    });

    saveKanbanColumns(columns);
}
