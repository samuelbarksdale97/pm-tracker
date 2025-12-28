// PM Tracker Types

export type Priority = 'P0' | 'P1' | 'P2';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Done' | 'Blocked';

export interface Workstream {
    id: string;
    name: string;
    description: string;
    color: string;
}

export interface Story {
    id: string;
    milestone_id?: string; // Links to pm_milestones
    workstream_id: string; // Legacy? Or keep for grouping?
    name: string;
    description?: string;
    priority: Priority;
    status: string; // 'Not Started', 'In Progress', 'Done', 'Blocked'
    owner?: string;
    estimate?: string;
    due_date?: string;
    dependencies: string[];
    notes?: string;
    backend_specs?: string;
    user_stories?: string[];
    definition_of_done?: string[];
    created_at?: string;
    updated_at?: string;
}

export interface Task {
    id: string;
    story_id: string;
    title: string;
    status: 'Todo' | 'In Progress' | 'Done';
    assignee_id?: string;
    created_at?: string;
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
}
