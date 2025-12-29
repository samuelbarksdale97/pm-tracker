import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ialckybbgkleiryfexlp.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhbGNreWJiZ2tsZWlyeWZleGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODg0MjYsImV4cCI6MjA4MTA2NDQyNn0.FcVSUxjqPId2NBEIjs_lVj9PVWc92eJaO6bnBlT95cc';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types matching database schema
export interface Project {
    id: string;
    name: string;
    description: string | null;
    status: 'active' | 'completed' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface Workstream {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    color: string | null;
    sort_order: number;
}

export interface TeamMember {
    id: string;
    name: string;
    email: string | null;
    avatar_url: string | null;
    role: 'lead' | 'developer' | 'designer' | 'pm' | 'stakeholder';
    is_active: boolean;
    created_at: string;
}

export interface ImplementationStep {
    step: number;
    title: string;
    details: string;
}

export interface CodeSnippet {
    language: string;
    title: string;
    code: string;
}

export interface Story {
    id: string;
    project_id: string;
    workstream_id: string;
    milestone_id: string | null;
    user_story_id: string | null;
    name: string;
    description: string | null;
    priority: 'P0' | 'P1' | 'P2';
    status: 'Not Started' | 'In Progress' | 'Testing' | 'Done' | 'Blocked' | 'On Hold';
    owner_id: string | null;
    owner?: TeamMember;
    estimate: string | null;
    actual_time: string | null;
    due_date: string | null;
    dependencies: string[];
    notes: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
    // Implementation specs
    objective: string | null;
    implementation_steps: ImplementationStep[] | null;
    outputs: string[] | null;
    validation: string | null;
    blocked_by: string | null;
    code_snippets: CodeSnippet[] | null;
    backend_specs: string | null;
    user_stories: string[] | null;
    definition_of_done: string[] | null;
}

export interface Task {
    id: string;
    story_id: string;
    title: string;
    status: 'Todo' | 'In Progress' | 'Done';
    assignee_id?: string;
    assignee?: TeamMember;
    created_at: string;
    updated_at: string;
}

export interface Milestone {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    start_date: string | null;
    target_date: string;
    status: 'upcoming' | 'in_progress' | 'completed' | 'at_risk';
    phase: number;
    color: string | null;
    sort_order: number;
    is_locked: boolean;
    created_at: string;
    updated_at: string;
}

export interface MilestoneHistory {
    id: string;
    milestone_id: string;
    action: 'created' | 'updated' | 'deleted' | 'story_added' | 'story_removed' | 'locked' | 'unlocked';
    changed_by: string | null;
    changed_at: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
}

export interface UserStory {
    id: string;
    project_id: string;
    milestone_id: string | null;
    epic_id: string | null; // Link to parent Epic
    feature_id: string | null; // Link to parent Feature (within Epic)
    narrative: string;
    persona: 'member' | 'admin' | 'staff' | 'business' | 'guest';
    feature_area: string;
    status: 'Not Started' | 'In Progress' | 'Testing' | 'Done' | 'Blocked';
    priority: 'P0' | 'P1' | 'P2';
    owner_id: string | null;
    owner?: TeamMember;
    acceptance_criteria: string[] | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
    // Nested relations (populated via join)
    tasks?: Story[];
    epic?: Epic;
    feature?: Feature;
}

export interface TaskActivity {
    id: string;
    task_id: string;
    user_name: string | null;
    action: string;
    field_changed: string | null;
    old_value: string | null;
    new_value: string | null;
    comment: string | null;
    created_at: string;
}

export interface TaskComment {
    id: string;
    task_id: string;
    author_name: string;
    content: string;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================
// Epic & Project Context Types
// ============================================

export interface CustomPersona {
    id: string;
    name: string;
    description: string;
    icon?: string; // lucide icon name
    color?: string; // tailwind color class
}

export interface ProjectBrief {
    vision?: string;
    target_users?: string[];
    key_features?: string[];
    tech_stack?: {
        frontend?: string;
        backend?: string;
        admin?: string;
        mobile?: string;
        infrastructure?: string;
    };
    business_goals?: string[];
    constraints?: string[];
    // Custom personas for AI story generation
    custom_personas?: CustomPersona[];
}

// Default personas used when no custom ones are defined
export const DEFAULT_PERSONAS: CustomPersona[] = [
    { id: 'member', name: 'Member', description: 'End users/customers who use the main application' },
    { id: 'admin', name: 'Admin', description: 'System administrators with elevated privileges' },
    { id: 'staff', name: 'Staff', description: 'Internal team members (employees)' },
    { id: 'business', name: 'Business', description: 'Business owners/managers who need reporting/oversight' },
    { id: 'guest', name: 'Guest', description: 'Unauthenticated visitors' },
];

export interface Epic {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    feature_areas: string[];
    business_objectives: string[] | null;
    success_metrics: string[] | null;
    user_value: string | null;
    technical_context: string | null;
    dependencies: string[] | null;
    priority: 'P0' | 'P1' | 'P2';
    status: 'Not Started' | 'In Progress' | 'Done' | 'On Hold';
    display_order: number;
    created_at: string;
    updated_at: string;
    // Computed fields (from joins)
    user_story_count?: number;
    completed_story_count?: number;
}

// Feature sits between Epic and UserStory in the hierarchy
export interface Feature {
    id: string;
    project_id: string;
    epic_id: string;
    goal_id: string | null; // Link to parent Goal (for Goals timeline)
    milestone_id: string | null; // Link to Milestone (for sprint planning)
    name: string;
    description: string | null;
    status: 'Not Started' | 'In Progress' | 'Done' | 'On Hold';
    priority: 'P0' | 'P1' | 'P2';
    display_order: number;
    created_at: string;
    updated_at: string;
    // Computed fields (from joins)
    user_story_count?: number;
    completed_story_count?: number;
    epic?: Epic;
    goal?: Goal;
}

// ============================================
// Goal Types (for Goals/Releases visualization)
// ============================================

export type TimeHorizon = 'now' | 'next' | 'later';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'at_risk';
export type GoalThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';

export interface Goal {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    time_horizon: TimeHorizon;
    target_quarter: string | null; // e.g., "Q1 2025"
    target_date: string | null;
    status: GoalStatus;
    theme_color: GoalThemeColor;
    display_order: number;
    created_at: string;
    updated_at: string;
    completed_at: string | null; // When goal was marked complete
    // Computed fields (from joins/aggregation)
    features?: Feature[];
    feature_count?: number;
    completed_feature_count?: number;
    total_story_count?: number;
    completed_story_count?: number;
    progress_percentage?: number;
}

// Health status for goals with target dates
export type GoalHealthStatus = 'on_track' | 'at_risk' | 'overdue' | 'no_date';

/**
 * Parse a date string as local date (not UTC) to avoid timezone shifts
 */
function parseLocalDateString(dateStr: string): Date {
    // Handle YYYY-MM-DD format as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    // For ISO strings with time component, parse normally
    return new Date(dateStr);
}

/**
 * Calculate goal health based on progress vs time elapsed
 */
export function calculateGoalHealth(goal: Goal): { status: GoalHealthStatus; daysRemaining: number | null; message: string } {
    if (!goal.target_date) {
        return { status: 'no_date', daysRemaining: null, message: 'No target date set' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = parseLocalDateString(goal.target_date);
    targetDate.setHours(0, 0, 0, 0);

    const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const progress = goal.progress_percentage || 0;

    // If already completed
    if (goal.status === 'completed') {
        return { status: 'on_track', daysRemaining, message: 'Completed' };
    }

    // If overdue
    if (daysRemaining < 0) {
        return { status: 'overdue', daysRemaining, message: `${Math.abs(daysRemaining)} days overdue` };
    }

    // Calculate expected progress based on time elapsed
    // Assuming goal was created on created_at date
    const createdDate = parseLocalDateString(goal.created_at);
    createdDate.setHours(0, 0, 0, 0);
    const totalDays = Math.ceil((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    const expectedProgress = totalDays > 0 ? Math.round((elapsedDays / totalDays) * 100) : 0;

    // At risk if progress is more than 20% behind expected
    if (progress < expectedProgress - 20 && daysRemaining <= 7) {
        return { status: 'at_risk', daysRemaining, message: `${daysRemaining} days left, behind schedule` };
    }

    if (daysRemaining === 0) {
        return { status: 'at_risk', daysRemaining, message: 'Due today' };
    }

    if (daysRemaining === 1) {
        return { status: 'on_track', daysRemaining, message: 'Due tomorrow' };
    }

    return { status: 'on_track', daysRemaining, message: `${daysRemaining} days remaining` };
}

export interface ProjectWithContext extends Project {
    context_document: string | null;
    project_brief: ProjectBrief | null;
}

export interface ProjectContextFile {
    id: string;
    project_id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    extracted_text: string | null;
    summary: string | null;
    created_at: string;
}

// Full hierarchical context for AI generation
export interface HierarchicalContext {
    project: {
        id: string;
        name: string;
        context_document: string | null;
        project_brief: ProjectBrief | null;
    };
    epic: {
        id: string;
        name: string;
        description: string | null;
        business_objectives: string[] | null;
        technical_context: string | null;
        user_value: string | null;
    } | null;
    userStory: {
        id: string;
        narrative: string;
        persona: string;
        feature_area: string;
        acceptance_criteria: string[] | null;
        priority: string;
    };
}

// API functions
export async function getProject(projectId?: string) {
    if (projectId) {
        const { data, error } = await supabase
            .from('pm_projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error) throw error;
        return data as Project;
    }

    // Default: get the active project
    const { data, error } = await supabase
        .from('pm_projects')
        .select('*')
        .eq('status', 'active')
        .single();

    if (error) throw error;
    return data as Project;
}

export async function getWorkstreams(projectId: string) {
    const { data, error } = await supabase
        .from('pm_workstreams')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');

    if (error) throw error;
    return data as Workstream[];
}

export async function getMilestones(projectId: string) {
    const { data, error } = await supabase
        .from('pm_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');

    if (error) throw error;
    return data as Milestone[];
}

export async function getTeamMembers() {
    const { data, error } = await supabase
        .from('pm_team_members')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data as TeamMember[];
}

export async function getUserStories(projectId: string) {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role)
        `)
        .eq('project_id', projectId)
        .order('sort_order');

    if (error) throw error;
    return data as UserStory[];
}

/**
 * Get user stories that are not assigned to any epic
 */
export async function getUnassignedUserStories(projectId: string): Promise<UserStory[]> {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role)
        `)
        .eq('project_id', projectId)
        .is('epic_id', null)
        .order('sort_order');

    if (error) throw error;
    return data as UserStory[];
}

export async function createUserStory(userStory: {
    project_id: string;
    narrative: string;
    persona: UserStory['persona'];
    feature_area: string;
    priority: UserStory['priority'];
    status?: UserStory['status'];
    milestone_id?: string | null;
    epic_id?: string | null;
    feature_id?: string | null;
    acceptance_criteria?: string[] | null;
}) {
    // Get max sort_order for this project
    const { data: existing } = await supabase
        .from('pm_user_stories')
        .select('sort_order')
        .eq('project_id', userStory.project_id)
        .order('sort_order', { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

    // Generate a unique ID for the user story
    const userStoryId = `US-${Date.now()}`;

    const { data, error } = await supabase
        .from('pm_user_stories')
        .insert({
            id: userStoryId,
            ...userStory,
            status: userStory.status || 'Not Started',
            sort_order: nextOrder
        })
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role)
        `)
        .single();

    if (error) {
        console.error('Supabase createUserStory error:', error.message, error.code, error.details, error.hint);
        throw new Error(`Failed to create user story: ${error.message}`);
    }
    return data as UserStory;
}

export async function updateUserStory(id: string, updates: Partial<UserStory>) {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as UserStory;
}

export async function deleteUserStory(id: string) {
    // First, unlink any tasks from this user story
    await supabase
        .from('pm_stories')
        .update({ user_story_id: null })
        .eq('user_story_id', id);

    const { error } = await supabase
        .from('pm_user_stories')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

/**
 * Bulk update user stories (for bulk actions)
 */
export async function bulkUpdateUserStories(
    ids: string[],
    updates: Partial<Pick<UserStory, 'status' | 'priority' | 'owner_id'>>
) {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .in('id', ids)
        .select();

    if (error) throw error;
    return data as UserStory[];
}

/**
 * Bulk delete user stories
 */
export async function bulkDeleteUserStories(ids: string[]) {
    // First, unlink any tasks from these user stories
    await supabase
        .from('pm_stories')
        .update({ user_story_id: null })
        .in('user_story_id', ids);

    const { error } = await supabase
        .from('pm_user_stories')
        .delete()
        .in('id', ids);

    if (error) throw error;
}

export async function getTasksForUserStory(userStoryId: string) {
    const { data, error } = await supabase
        .from('pm_stories')
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role)
        `)
        .eq('user_story_id', userStoryId)
        .order('sort_order');

    if (error) throw error;
    return data as Story[];
}

export async function getUserStoriesWithMilestone(projectId: string) {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role),
            milestone:pm_milestones(id, name, target_date, status, phase)
        `)
        .eq('project_id', projectId)
        .order('milestone_id')
        .order('sort_order');

    if (error) throw error;
    return data as (UserStory & { milestone: Milestone | null })[];
}

export async function getStories(projectId: string) {
    const { data, error } = await supabase
        .from('pm_stories')
        .select(`
      *,
      owner:pm_team_members(id, name, email, avatar_url, role)
    `)
        .eq('project_id', projectId)
        .order('workstream_id')
        .order('sort_order');

    if (error) throw error;
    return data as Story[];
}

export async function getSubTasks(storyId: string) {
    const { data, error } = await supabase
        .from('pm_tasks')
        .select(`
            *,
            assignee:pm_team_members(id, name, email, avatar_url)
        `)
        .eq('story_id', storyId)
        .order('created_at');

    if (error) throw error;
    return data as Task[];
}

export async function createSubTask(storyId: string, title: string) {
    const { data, error } = await supabase
        .from('pm_tasks')
        .insert({
            story_id: storyId,
            title,
            status: 'Todo'
        })
        .select()
        .single();

    if (error) throw error;
    return data as Task;
}

export async function updateSubTaskStatus(taskId: string, status: Task['status']) {
    const { data, error } = await supabase
        .from('pm_tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

    if (error) throw error;
    return data as Task;
}

export async function updateSubTaskTitle(taskId: string, title: string) {
    const { data, error } = await supabase
        .from('pm_tasks')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

    if (error) throw error;
    return data as Task;
}

export async function deleteSubTask(taskId: string) {
    const { error } = await supabase
        .from('pm_tasks')
        .delete()
        .eq('id', taskId);

    if (error) throw error;
}

export async function updateStoryStatus(storyId: string, status: Story['status'], userName: string = 'System') {
    // Get current status for activity log
    const { data: currentStory } = await supabase
        .from('pm_stories')
        .select('status')
        .eq('id', storyId)
        .single();

    const oldStatus = currentStory?.status;

    // Update story
    const { error: updateError } = await supabase
        .from('pm_stories')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', storyId);

    if (updateError) throw updateError;

    // Log activity
    await supabase
        .from('pm_task_activity')
        .insert({
            task_id: storyId,
            user_name: userName,
            action: 'status_change',
            field_changed: 'status',
            old_value: oldStatus,
            new_value: status
        });
}

export async function updateStoryOwner(storyId: string, ownerId: string | null, userName: string = 'System') {
    const { error } = await supabase
        .from('pm_stories')
        .update({ owner_id: ownerId, updated_at: new Date().toISOString() })
        .eq('id', storyId);

    if (error) throw error;

    await supabase
        .from('pm_task_activity')
        .insert({
            task_id: storyId,
            user_name: userName,
            action: 'assignment',
            field_changed: 'owner_id',
            new_value: ownerId
        });
}

export async function updateStory(storyId: string, updates: Partial<Story>, userName: string = 'System') {
    const { error } = await supabase
        .from('pm_stories')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', storyId);

    if (error) throw error;

    // Log the edit
    await supabase
        .from('pm_task_activity')
        .insert({
            task_id: storyId,
            user_name: userName,
            action: 'edit',
            comment: `Updated: ${Object.keys(updates).join(', ')}`
        });
}

export async function createStory(story: Omit<Story, 'created_at' | 'updated_at' | 'owner' | 'sort_order'>) {
    const { data, error } = await supabase
        .from('pm_stories')
        .insert(story)
        .select()
        .single();

    if (error) throw error;

    await supabase
        .from('pm_task_activity')
        .insert({
            task_id: story.id,
            user_name: 'System',
            action: 'created',
            comment: `Story created: ${story.name}`
        });

    return data as Story;
}

export async function deleteStory(storyId: string) {
    const { error } = await supabase
        .from('pm_stories')
        .delete()
        .eq('id', storyId);

    if (error) throw error;
}

export async function getTaskActivity(taskId: string) {
    const { data, error } = await supabase
        .from('pm_task_activity')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as TaskActivity[];
}

export async function getTaskComments(taskId: string) {
    const { data, error } = await supabase
        .from('pm_task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as TaskComment[];
}

export async function addTaskComment(taskId: string, authorName: string, content: string) {
    const { data, error } = await supabase
        .from('pm_task_comments')
        .insert({ task_id: taskId, author_name: authorName, content })
        .select()
        .single();

    if (error) throw error;

    // Log activity
    await supabase
        .from('pm_task_activity')
        .insert({
            task_id: taskId,
            user_name: authorName,
            action: 'comment',
            comment: content.substring(0, 100)
        });

    return data as TaskComment;
}

export async function createTeamMember(member: Omit<TeamMember, 'id' | 'created_at' | 'is_active'>) {
    const { data, error } = await supabase
        .from('pm_team_members')
        .insert({ ...member, is_active: true })
        .select()
        .single();

    if (error) throw error;
    return data as TeamMember;
}

// Milestone CRUD functions
export async function createMilestone(milestone: {
    project_id: string;
    name: string;
    description?: string;
    start_date: string;
    target_date: string;
    status?: Milestone['status'];
    color?: string;
}) {
    // Get max sort_order
    const { data: existing } = await supabase
        .from('pm_milestones')
        .select('sort_order')
        .eq('project_id', milestone.project_id)
        .order('sort_order', { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

    const { data, error } = await supabase
        .from('pm_milestones')
        .insert({
            ...milestone,
            status: milestone.status || 'upcoming',
            phase: 1,
            sort_order: nextOrder
        })
        .select()
        .single();

    if (error) throw error;
    return data as Milestone;
}

export async function updateMilestone(id: string, updates: Partial<Milestone>) {
    const { data, error } = await supabase
        .from('pm_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Milestone;
}

export async function deleteMilestone(id: string) {
    // First, unassign all user stories from this milestone
    await supabase
        .from('pm_user_stories')
        .update({ milestone_id: null })
        .eq('milestone_id', id);

    // Then delete the milestone
    const { error } = await supabase
        .from('pm_milestones')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function updateUserStoryMilestone(storyId: string, milestoneId: string | null) {
    const { error } = await supabase
        .from('pm_user_stories')
        .update({ milestone_id: milestoneId })
        .eq('id', storyId);

    if (error) throw error;
}

/**
 * Update feature milestone assignment
 */
export async function updateFeatureMilestone(featureId: string, milestoneId: string | null) {
    const { error } = await supabase
        .from('pm_features')
        .update({ milestone_id: milestoneId })
        .eq('id', featureId);

    if (error) throw error;
}

/**
 * Get features for a project with milestone info
 */
export async function getFeaturesForMilestoneBoard(projectId: string): Promise<Feature[]> {
    const { data, error } = await supabase
        .from('pm_features')
        .select(`
            *,
            epic:pm_epics!inner(id, name),
            user_stories:pm_user_stories(count)
        `)
        .eq('project_id', projectId)
        .order('display_order');

    if (error) throw error;

    // Calculate story counts
    return (data || []).map(feature => ({
        ...feature,
        user_story_count: feature.user_stories?.[0]?.count || 0,
    }));
}

/**
 * Bulk assign features to a milestone
 */
export async function bulkAssignFeatures(featureIds: string[], milestoneId: string | null) {
    const { error } = await supabase
        .from('pm_features')
        .update({ milestone_id: milestoneId })
        .in('id', featureIds);

    if (error) throw error;
    return featureIds.length;
}

/**
 * Reset all feature milestone assignments for a project
 */
export async function resetAllFeatureMilestoneAssignments(projectId: string) {
    const { error } = await supabase
        .from('pm_features')
        .update({ milestone_id: null })
        .eq('project_id', projectId);

    if (error) throw error;
}

// ============================================
// Enhanced Milestone Functions (PRD v1.1)
// ============================================

/**
 * Bulk assign multiple stories to a milestone
 */
export async function bulkAssignStories(storyIds: string[], milestoneId: string | null) {
    const { error } = await supabase
        .from('pm_user_stories')
        .update({ milestone_id: milestoneId })
        .in('id', storyIds);

    if (error) throw error;
    return storyIds.length;
}

/**
 * Lock or unlock a milestone
 */
export async function lockMilestone(id: string, isLocked: boolean) {
    const { data, error } = await supabase
        .from('pm_milestones')
        .update({ is_locked: isLocked })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Milestone;
}

/**
 * Duplicate a milestone with optional date offset
 */
export async function duplicateMilestone(milestoneId: string, dateOffsetDays: number = 14) {
    // Get source milestone
    const { data: source, error: fetchError } = await supabase
        .from('pm_milestones')
        .select('*')
        .eq('id', milestoneId)
        .single();

    if (fetchError) throw fetchError;
    if (!source) throw new Error('Milestone not found');

    // Calculate new dates
    const newStartDate = source.start_date
        ? new Date(new Date(source.start_date).getTime() + dateOffsetDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : null;
    const newTargetDate = new Date(new Date(source.target_date).getTime() + dateOffsetDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get max sort_order
    const { data: existing } = await supabase
        .from('pm_milestones')
        .select('sort_order')
        .eq('project_id', source.project_id)
        .order('sort_order', { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

    // Create duplicate
    const { data, error } = await supabase
        .from('pm_milestones')
        .insert({
            project_id: source.project_id,
            name: `${source.name} (Copy)`,
            description: source.description,
            start_date: newStartDate,
            target_date: newTargetDate,
            status: 'upcoming',
            phase: source.phase,
            color: source.color,
            sort_order: nextOrder,
            is_locked: false
        })
        .select()
        .single();

    if (error) throw error;
    return data as Milestone;
}

/**
 * Reorder milestones
 */
export async function reorderMilestones(milestoneIds: string[]) {
    const updates = milestoneIds.map((id, index) => ({
        id,
        sort_order: index + 1
    }));

    for (const update of updates) {
        const { error } = await supabase
            .from('pm_milestones')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);

        if (error) throw error;
    }
}

/**
 * Get milestone history (audit log)
 */
export async function getMilestoneHistory(milestoneId: string, limit: number = 50) {
    const { data, error } = await supabase
        .from('pm_milestone_history')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('changed_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data as MilestoneHistory[];
}

/**
 * Reset all user story milestone assignments (move all to backlog)
 */
export async function resetAllMilestoneAssignments(projectId: string) {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .update({ milestone_id: null })
        .eq('project_id', projectId)
        .select('id');

    if (error) throw error;
    return data?.length || 0;
}

/**
 * Check if a milestone is overdue and update status
 */
export async function checkMilestoneOverdue(milestoneId: string) {
    const { data: milestone, error: fetchError } = await supabase
        .from('pm_milestones')
        .select('*, user_stories:pm_user_stories(id, status)')
        .eq('id', milestoneId)
        .single();

    if (fetchError) throw fetchError;

    const targetDate = new Date(milestone.target_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if past due and has incomplete stories
    if (targetDate < today && milestone.status !== 'completed') {
        const incompleteStories = milestone.user_stories?.filter(
            (s: { status: string }) => s.status !== 'Done'
        ) || [];

        if (incompleteStories.length > 0) {
            // Update to at_risk
            await updateMilestone(milestoneId, { status: 'at_risk' });
            return {
                isOverdue: true,
                incompleteCount: incompleteStories.length
            };
        }
    }

    return { isOverdue: false, incompleteCount: 0 };
}

// ============================================
// Platform Task Creation (AI Generation)
// ============================================

/**
 * Platform configuration for workstream mapping
 */
export const PLATFORM_WORKSTREAM_MAP: Record<string, string> = {
    'A': 'A', // Backend
    'B': 'B', // Mobile
    'C': 'C', // Admin
    'D': 'D', // Infra
};

/**
 * Create a platform-specific task with full AI-generated specs
 */
export interface CreatePlatformTaskParams {
    projectId: string;
    userStoryId: string;
    milestoneId: string | null;
    platform: string;
    name: string;
    priority: 'P0' | 'P1' | 'P2';
    estimate: string | null;
    objective: string | null;
    rationale?: string | null;
    implementationSteps: ImplementationStep[] | null;
    outputs: string[] | null;
    validation: string | null;
    definitionOfDone: string[] | null;
    codeSnippets: CodeSnippet[] | null;
    dependencies: string[] | null;
    risks?: string[] | null;
    testingStrategy?: string | null;
}

export async function createPlatformTask(params: CreatePlatformTaskParams): Promise<Story> {
    const taskId = `TASK-${Date.now()}-${params.platform}`;

    const story = await createStory({
        id: taskId,
        project_id: params.projectId,
        workstream_id: PLATFORM_WORKSTREAM_MAP[params.platform] || params.platform,
        milestone_id: params.milestoneId,
        user_story_id: params.userStoryId,
        name: params.name,
        description: params.rationale || null,
        priority: params.priority,
        status: 'Not Started',
        owner_id: null,
        estimate: params.estimate,
        actual_time: null,
        due_date: null,
        dependencies: params.dependencies || [],
        notes: params.testingStrategy ? `Testing Strategy: ${params.testingStrategy}` : null,
        objective: params.objective,
        implementation_steps: params.implementationSteps,
        outputs: params.outputs,
        validation: params.validation,
        blocked_by: null,
        code_snippets: params.codeSnippets,
        backend_specs: null,
        user_stories: null,
        definition_of_done: params.definitionOfDone,
    });

    return story;
}

/**
 * Create sub-tasks for a platform task
 */
export async function createSubTasksForPlatformTask(
    storyId: string,
    subTasks: string[]
): Promise<Task[]> {
    const createdTasks: Task[] = [];

    for (const title of subTasks) {
        const task = await createSubTask(storyId, title);
        createdTasks.push(task);
    }

    return createdTasks;
}

// ============================================
// Epic CRUD Operations
// ============================================

/**
 * Get all epics for a project
 */
export async function getEpics(projectId: string): Promise<Epic[]> {
    const { data, error } = await supabase
        .from('pm_epics')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order');

    if (error) throw error;
    return data as Epic[];
}

/**
 * Get epics with user story counts
 */
export async function getEpicsWithCounts(projectId: string): Promise<Epic[]> {
    // Get all epics
    const { data: epics, error: epicError } = await supabase
        .from('pm_epics')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order');

    if (epicError) throw epicError;

    // Get user story counts per epic
    const { data: storyCounts, error: countError } = await supabase
        .from('pm_user_stories')
        .select('epic_id, status')
        .eq('project_id', projectId)
        .not('epic_id', 'is', null);

    if (countError) throw countError;

    // Aggregate counts
    const countMap = new Map<string, { total: number; completed: number }>();
    for (const story of storyCounts || []) {
        if (!story.epic_id) continue;
        const current = countMap.get(story.epic_id) || { total: 0, completed: 0 };
        current.total++;
        if (story.status === 'Done') current.completed++;
        countMap.set(story.epic_id, current);
    }

    // Merge counts into epics
    return (epics || []).map(epic => ({
        ...epic,
        user_story_count: countMap.get(epic.id)?.total || 0,
        completed_story_count: countMap.get(epic.id)?.completed || 0,
    })) as Epic[];
}

/**
 * Get a single epic by ID
 */
export async function getEpic(epicId: string): Promise<Epic | null> {
    const { data, error } = await supabase
        .from('pm_epics')
        .select('*')
        .eq('id', epicId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data as Epic;
}

/**
 * Create a new epic
 */
export async function createEpic(epic: {
    project_id: string;
    name: string;
    description?: string | null;
    feature_areas?: string[];
    business_objectives?: string[] | null;
    success_metrics?: string[] | null;
    user_value?: string | null;
    technical_context?: string | null;
    dependencies?: string[] | null;
    priority?: 'P0' | 'P1' | 'P2';
    status?: Epic['status'];
}): Promise<Epic> {
    // Get max display_order
    const { data: existing } = await supabase
        .from('pm_epics')
        .select('display_order')
        .eq('project_id', epic.project_id)
        .order('display_order', { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

    // Generate unique ID
    const epicId = `EPIC-${Date.now()}`;

    const { data, error } = await supabase
        .from('pm_epics')
        .insert({
            id: epicId,
            ...epic,
            feature_areas: epic.feature_areas || [],
            priority: epic.priority || 'P1',
            status: epic.status || 'Not Started',
            display_order: nextOrder,
        })
        .select()
        .single();

    if (error) throw error;
    return data as Epic;
}

/**
 * Update an epic
 */
export async function updateEpic(epicId: string, updates: Partial<Epic>): Promise<Epic> {
    const { data, error } = await supabase
        .from('pm_epics')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', epicId)
        .select()
        .single();

    if (error) throw error;
    return data as Epic;
}

/**
 * Delete an epic
 */
export async function deleteEpic(epicId: string): Promise<void> {
    // First, unlink all user stories from this epic
    await supabase
        .from('pm_user_stories')
        .update({ epic_id: null })
        .eq('epic_id', epicId);

    const { error } = await supabase
        .from('pm_epics')
        .delete()
        .eq('id', epicId);

    if (error) throw error;
}

/**
 * Reorder epics within a project
 */
export async function reorderEpics(projectId: string, epicIds: string[]): Promise<void> {
    for (let i = 0; i < epicIds.length; i++) {
        const { error } = await supabase
            .from('pm_epics')
            .update({ display_order: i + 1, updated_at: new Date().toISOString() })
            .eq('id', epicIds[i])
            .eq('project_id', projectId);

        if (error) throw error;
    }
}

/**
 * Assign a user story to an epic
 */
export async function assignUserStoryToEpic(userStoryId: string, epicId: string | null): Promise<void> {
    const { error } = await supabase
        .from('pm_user_stories')
        .update({ epic_id: epicId })
        .eq('id', userStoryId);

    if (error) throw error;
}

/**
 * Bulk assign user stories to an epic
 */
export async function bulkAssignStoriesToEpic(storyIds: string[], epicId: string | null): Promise<number> {
    const { error } = await supabase
        .from('pm_user_stories')
        .update({ epic_id: epicId })
        .in('id', storyIds);

    if (error) throw error;
    return storyIds.length;
}

/**
 * Get user stories for an epic
 */
export async function getUserStoriesForEpic(epicId: string): Promise<UserStory[]> {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role)
        `)
        .eq('epic_id', epicId)
        .order('sort_order');

    if (error) throw error;
    return data as UserStory[];
}

// ============================================
// Project Context Operations
// ============================================

/**
 * Get project with context fields
 */
export async function getProjectWithContext(projectId?: string): Promise<ProjectWithContext | null> {
    let query = supabase
        .from('pm_projects')
        .select('*');

    if (projectId) {
        query = query.eq('id', projectId);
    } else {
        query = query.eq('status', 'active');
    }

    const { data, error } = await query.single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data as ProjectWithContext;
}

/**
 * Update project context document
 */
export async function updateProjectContext(
    projectId: string,
    updates: {
        context_document?: string | null;
        project_brief?: ProjectBrief | null;
    }
): Promise<ProjectWithContext> {
    const { data, error } = await supabase
        .from('pm_projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .select()
        .single();

    if (error) throw error;
    return data as ProjectWithContext;
}

/**
 * Get hierarchical context for a user story (for AI generation)
 */
export async function getHierarchicalContext(userStoryId: string): Promise<HierarchicalContext | null> {
    // Get user story with epic
    const { data: userStory, error: usError } = await supabase
        .from('pm_user_stories')
        .select(`
            *,
            epic:pm_epics(id, name, description, business_objectives, technical_context, user_value)
        `)
        .eq('id', userStoryId)
        .single();

    if (usError) {
        if (usError.code === 'PGRST116') return null;
        throw usError;
    }

    // Get project with context
    const { data: project, error: projError } = await supabase
        .from('pm_projects')
        .select('id, name, context_document, project_brief')
        .eq('id', userStory.project_id)
        .single();

    if (projError) throw projError;

    return {
        project: {
            id: project.id,
            name: project.name,
            context_document: project.context_document || null,
            project_brief: project.project_brief || null,
        },
        epic: userStory.epic ? {
            id: userStory.epic.id,
            name: userStory.epic.name,
            description: userStory.epic.description,
            business_objectives: userStory.epic.business_objectives,
            technical_context: userStory.epic.technical_context,
            user_value: userStory.epic.user_value,
        } : null,
        userStory: {
            id: userStory.id,
            narrative: userStory.narrative,
            persona: userStory.persona,
            feature_area: userStory.feature_area,
            acceptance_criteria: userStory.acceptance_criteria,
            priority: userStory.priority,
        },
    };
}

/**
 * Get user stories with epic information
 */
export async function getUserStoriesWithEpics(projectId: string): Promise<UserStory[]> {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role),
            epic:pm_epics(id, name, description, priority, status)
        `)
        .eq('project_id', projectId)
        .order('sort_order');

    if (error) throw error;
    return data as UserStory[];
}

// ============================================
// Feature CRUD Operations
// ============================================

/**
 * Get all features for an epic
 */
export async function getFeatures(epicId: string): Promise<Feature[]> {
    const { data, error } = await supabase
        .from('pm_features')
        .select('*')
        .eq('epic_id', epicId)
        .order('display_order');

    if (error) throw error;
    return data as Feature[];
}

/**
 * Get a single feature by ID
 */
export async function getFeatureById(featureId: string): Promise<Feature | null> {
    const { data, error } = await supabase
        .from('pm_features')
        .select('*')
        .eq('id', featureId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data as Feature;
}

/**
 * Get all features for a project with user story counts
 */
export async function getAllFeaturesForProject(projectId: string): Promise<Feature[]> {
    // Get all features for the project (via epics)
    const { data: features, error: featureError } = await supabase
        .from('pm_features')
        .select(`
            *,
            epic:pm_epics!inner(project_id, name)
        `)
        .eq('epic.project_id', projectId)
        .order('display_order');

    if (featureError) throw featureError;

    // Get user story counts per feature
    const { data: storyCounts, error: countError } = await supabase
        .from('pm_user_stories')
        .select('feature_id, status')
        .eq('project_id', projectId)
        .not('feature_id', 'is', null);

    if (countError) throw countError;

    // Aggregate counts
    const countMap = new Map<string, { total: number; completed: number }>();
    for (const story of storyCounts || []) {
        if (!story.feature_id) continue;
        const current = countMap.get(story.feature_id) || { total: 0, completed: 0 };
        current.total++;
        if (story.status === 'Done') current.completed++;
        countMap.set(story.feature_id, current);
    }

    // Merge counts into features
    return (features || []).map(feature => ({
        ...feature,
        user_story_count: countMap.get(feature.id)?.total || 0,
        completed_story_count: countMap.get(feature.id)?.completed || 0,
    })) as Feature[];
}

/**
 * Get features with user story counts
 */
export async function getFeaturesWithCounts(epicId: string): Promise<Feature[]> {
    // Get all features for the epic
    const { data: features, error: featureError } = await supabase
        .from('pm_features')
        .select('*')
        .eq('epic_id', epicId)
        .order('display_order');

    if (featureError) throw featureError;

    // Get user story counts per feature
    const { data: storyCounts, error: countError } = await supabase
        .from('pm_user_stories')
        .select('feature_id, status')
        .eq('epic_id', epicId)
        .not('feature_id', 'is', null);

    if (countError) throw countError;

    // Aggregate counts
    const countMap = new Map<string, { total: number; completed: number }>();
    for (const story of storyCounts || []) {
        if (!story.feature_id) continue;
        const current = countMap.get(story.feature_id) || { total: 0, completed: 0 };
        current.total++;
        if (story.status === 'Done') current.completed++;
        countMap.set(story.feature_id, current);
    }

    // Merge counts into features
    return (features || []).map(feature => ({
        ...feature,
        user_story_count: countMap.get(feature.id)?.total || 0,
        completed_story_count: countMap.get(feature.id)?.completed || 0,
    })) as Feature[];
}

/**
 * Get a single feature by ID
 */
export async function getFeature(featureId: string): Promise<Feature | null> {
    const { data, error } = await supabase
        .from('pm_features')
        .select('*')
        .eq('id', featureId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data as Feature;
}

/**
 * Create a new feature
 */
export async function createFeature(feature: {
    project_id: string;
    epic_id: string;
    name: string;
    description?: string | null;
    priority?: 'P0' | 'P1' | 'P2';
    status?: Feature['status'];
}): Promise<Feature> {
    // Get max display_order for this epic
    const { data: existing } = await supabase
        .from('pm_features')
        .select('display_order')
        .eq('epic_id', feature.epic_id)
        .order('display_order', { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

    // Generate unique ID
    const featureId = `FEAT-${Date.now()}`;

    const { data, error } = await supabase
        .from('pm_features')
        .insert({
            id: featureId,
            ...feature,
            priority: feature.priority || 'P1',
            status: feature.status || 'Not Started',
            display_order: nextOrder,
        })
        .select()
        .single();

    if (error) throw error;
    return data as Feature;
}

/**
 * Update a feature
 */
export async function updateFeature(featureId: string, updates: Partial<Feature>): Promise<Feature> {
    const { data, error } = await supabase
        .from('pm_features')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', featureId)
        .select()
        .single();

    if (error) throw error;
    return data as Feature;
}

/**
 * Delete a feature (stories get feature_id = null)
 */
export async function deleteFeature(featureId: string): Promise<void> {
    // First, unlink all user stories from this feature
    await supabase
        .from('pm_user_stories')
        .update({ feature_id: null })
        .eq('feature_id', featureId);

    const { error } = await supabase
        .from('pm_features')
        .delete()
        .eq('id', featureId);

    if (error) throw error;
}

/**
 * Reorder features within an epic
 * Takes an array of feature IDs in the desired order
 */
export async function reorderFeatures(epicId: string, featureIds: string[]): Promise<void> {
    // Update display_order for each feature based on position in array
    const updates = featureIds.map((id, index) => ({
        id,
        display_order: index + 1,
        updated_at: new Date().toISOString(),
    }));

    // Use upsert to update all features at once
    for (const update of updates) {
        const { error } = await supabase
            .from('pm_features')
            .update({ display_order: update.display_order, updated_at: update.updated_at })
            .eq('id', update.id)
            .eq('epic_id', epicId);

        if (error) throw error;
    }
}

/**
 * Move a feature up or down in the order
 */
export async function moveFeature(epicId: string, featureId: string, direction: 'up' | 'down'): Promise<Feature[]> {
    // Get all features for this epic, ordered
    const { data: features, error } = await supabase
        .from('pm_features')
        .select('*')
        .eq('epic_id', epicId)
        .order('display_order');

    if (error) throw error;
    if (!features || features.length < 2) return features as Feature[];

    // Find the current index
    const currentIndex = features.findIndex(f => f.id === featureId);
    if (currentIndex === -1) return features as Feature[];

    // Calculate new index
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= features.length) return features as Feature[];

    // Swap the features
    const reordered = [...features];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];

    // Update display_order in database
    await reorderFeatures(epicId, reordered.map(f => f.id));

    // Return the reordered features with updated display_order
    return reordered.map((f, i) => ({ ...f, display_order: i + 1 })) as Feature[];
}

/**
 * Assign a user story to a feature
 */
export async function assignUserStoryToFeature(userStoryId: string, featureId: string | null): Promise<void> {
    // Get the feature to also update feature_area for backwards compatibility
    let featureArea: string | null = null;
    if (featureId) {
        const feature = await getFeature(featureId);
        if (feature) {
            // Use feature name as feature_area for backwards compatibility
            featureArea = feature.name;
        }
    }

    const updates: { feature_id: string | null; feature_area?: string } = { feature_id: featureId };
    if (featureArea) {
        updates.feature_area = featureArea;
    }

    const { error } = await supabase
        .from('pm_user_stories')
        .update(updates)
        .eq('id', userStoryId);

    if (error) throw error;
}

/**
 * Get user stories for a feature
 */
export async function getUserStoriesForFeature(featureId: string): Promise<UserStory[]> {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role)
        `)
        .eq('feature_id', featureId)
        .order('sort_order');

    if (error) throw error;
    return data as UserStory[];
}

/**
 * Get unassigned user stories for an epic (stories without a feature)
 */
export async function getUnassignedStoriesForEpic(epicId: string): Promise<UserStory[]> {
    const { data, error } = await supabase
        .from('pm_user_stories')
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role)
        `)
        .eq('epic_id', epicId)
        .is('feature_id', null)
        .order('sort_order');

    if (error) throw error;
    return data as UserStory[];
}

/**
 * Bulk move user stories to a different feature
 */
export async function bulkMoveStoriesToFeature(
    storyIds: string[],
    targetFeatureId: string | null
): Promise<void> {
    if (storyIds.length === 0) return;

    // Get the target feature name for feature_area sync
    let featureArea: string | null = null;
    if (targetFeatureId) {
        const feature = await getFeature(targetFeatureId);
        if (feature) {
            featureArea = feature.name;
        }
    }

    const updates: { feature_id: string | null; feature_area?: string } = {
        feature_id: targetFeatureId,
    };
    if (featureArea) {
        updates.feature_area = featureArea;
    }

    // Update all stories in batch
    for (const storyId of storyIds) {
        const { error } = await supabase
            .from('pm_user_stories')
            .update(updates)
            .eq('id', storyId);

        if (error) throw error;
    }
}

/**
 * Bulk create user stories (for AI generation)
 */
export async function bulkCreateUserStories(stories: Array<{
    project_id: string;
    epic_id: string;
    feature_id: string;
    narrative: string;
    persona: UserStory['persona'];
    feature_area: string;
    priority: UserStory['priority'];
    acceptance_criteria?: string[] | null;
}>): Promise<UserStory[]> {
    // Get max sort_order for the project
    const projectId = stories[0]?.project_id;
    if (!projectId) return [];

    const { data: existing } = await supabase
        .from('pm_user_stories')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1);

    let nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

    // Prepare records with IDs and sort orders
    const records = stories.map((story, index) => ({
        id: `US-${Date.now()}-${index}`,
        ...story,
        status: 'Not Started' as const,
        sort_order: nextOrder + index,
    }));

    const { data, error } = await supabase
        .from('pm_user_stories')
        .insert(records)
        .select(`
            *,
            owner:pm_team_members(id, name, email, avatar_url, role)
        `);

    if (error) throw error;
    return data as UserStory[];
}

/**
 * Sync epic's feature_areas array from actual user story assignments
 */
export async function syncEpicFeatureAreas(epicId: string): Promise<void> {
    // Get all unique feature_area values from stories in this epic
    const { data: stories, error: storyError } = await supabase
        .from('pm_user_stories')
        .select('feature_area')
        .eq('epic_id', epicId);

    if (storyError) throw storyError;

    // Get unique feature areas
    const featureAreas = [...new Set(
        (stories || [])
            .map(s => s.feature_area)
            .filter(Boolean)
    )];

    // Update the epic's feature_areas array
    const { error } = await supabase
        .from('pm_epics')
        .update({
            feature_areas: featureAreas,
            updated_at: new Date().toISOString()
        })
        .eq('id', epicId);

    if (error) throw error;
}

// ============================================
// Goal CRUD Operations
// ============================================

/**
 * Get all goals for a project
 */
export async function getGoals(projectId: string): Promise<Goal[]> {
    const { data, error } = await supabase
        .from('pm_goals')
        .select('*')
        .eq('project_id', projectId)
        .order('time_horizon')
        .order('display_order');

    if (error) throw error;
    return data as Goal[];
}

/**
 * Get goals with feature counts and progress
 */
export async function getGoalsWithProgress(projectId: string): Promise<Goal[]> {
    // Get all goals
    const { data: goals, error: goalError } = await supabase
        .from('pm_goals')
        .select('*')
        .eq('project_id', projectId)
        .order('time_horizon')
        .order('display_order');

    if (goalError) throw goalError;
    if (!goals || goals.length === 0) return [];

    // Get all features with goal assignments and their story counts
    const { data: features, error: featureError } = await supabase
        .from('pm_features')
        .select(`
            id,
            goal_id,
            status,
            epic:pm_epics!inner(project_id)
        `)
        .eq('epic.project_id', projectId)
        .not('goal_id', 'is', null);

    if (featureError) throw featureError;

    // Get user story counts per feature
    const featureIds = (features || []).map(f => f.id);
    const { data: storyCounts, error: storyError } = await supabase
        .from('pm_user_stories')
        .select('feature_id, status')
        .in('feature_id', featureIds);

    if (storyError) throw storyError;

    // Build aggregation maps
    type FeatureStats = { total: number; completed: number; stories: number; completedStories: number };
    const goalStats = new Map<string, FeatureStats>();

    // Initialize stats for all goals
    for (const goal of goals) {
        goalStats.set(goal.id, { total: 0, completed: 0, stories: 0, completedStories: 0 });
    }

    // Aggregate feature counts per goal
    for (const feature of features || []) {
        if (!feature.goal_id) continue;
        const stats = goalStats.get(feature.goal_id);
        if (stats) {
            stats.total++;
            if (feature.status === 'Done') stats.completed++;
        }
    }

    // Aggregate story counts per goal (through features)
    const featureToGoal = new Map<string, string>();
    for (const feature of features || []) {
        if (feature.goal_id) {
            featureToGoal.set(feature.id, feature.goal_id);
        }
    }

    for (const story of storyCounts || []) {
        if (!story.feature_id) continue;
        const goalId = featureToGoal.get(story.feature_id);
        if (goalId) {
            const stats = goalStats.get(goalId);
            if (stats) {
                stats.stories++;
                if (story.status === 'Done') stats.completedStories++;
            }
        }
    }

    // Merge stats into goals
    return goals.map(goal => {
        const stats = goalStats.get(goal.id) || { total: 0, completed: 0, stories: 0, completedStories: 0 };
        const progressPercentage = stats.stories > 0
            ? Math.round((stats.completedStories / stats.stories) * 100)
            : 0;

        return {
            ...goal,
            feature_count: stats.total,
            completed_feature_count: stats.completed,
            total_story_count: stats.stories,
            completed_story_count: stats.completedStories,
            progress_percentage: progressPercentage,
        };
    }) as Goal[];
}

/**
 * Get goals grouped by time horizon (for Now/Next/Later view)
 */
export async function getGoalsByHorizon(projectId: string): Promise<{
    now: Goal[];
    next: Goal[];
    later: Goal[];
}> {
    const goals = await getGoalsWithProgress(projectId);

    return {
        now: goals.filter(g => g.time_horizon === 'now'),
        next: goals.filter(g => g.time_horizon === 'next'),
        later: goals.filter(g => g.time_horizon === 'later'),
    };
}

/**
 * Get a single goal by ID
 */
export async function getGoal(goalId: string): Promise<Goal | null> {
    const { data, error } = await supabase
        .from('pm_goals')
        .select('*')
        .eq('id', goalId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data as Goal;
}

/**
 * Get goal with its assigned features
 */
export async function getGoalWithFeatures(goalId: string): Promise<Goal | null> {
    const { data: goal, error: goalError } = await supabase
        .from('pm_goals')
        .select('*')
        .eq('id', goalId)
        .single();

    if (goalError) {
        if (goalError.code === 'PGRST116') return null;
        throw goalError;
    }

    // Get features assigned to this goal
    const { data: features, error: featureError } = await supabase
        .from('pm_features')
        .select(`
            *,
            epic:pm_epics(id, name)
        `)
        .eq('goal_id', goalId)
        .order('display_order');

    if (featureError) throw featureError;

    // Get story counts for features
    const featureIds = (features || []).map(f => f.id);
    const { data: storyCounts, error: storyError } = await supabase
        .from('pm_user_stories')
        .select('feature_id, status')
        .in('feature_id', featureIds);

    if (storyError) throw storyError;

    // Build story count map
    const storyCountMap = new Map<string, { total: number; completed: number }>();
    for (const story of storyCounts || []) {
        if (!story.feature_id) continue;
        const current = storyCountMap.get(story.feature_id) || { total: 0, completed: 0 };
        current.total++;
        if (story.status === 'Done') current.completed++;
        storyCountMap.set(story.feature_id, current);
    }

    // Enrich features with counts
    const enrichedFeatures = (features || []).map(f => ({
        ...f,
        user_story_count: storyCountMap.get(f.id)?.total || 0,
        completed_story_count: storyCountMap.get(f.id)?.completed || 0,
    }));

    // Calculate overall progress
    const totalStories = enrichedFeatures.reduce((sum, f) => sum + (f.user_story_count || 0), 0);
    const completedStories = enrichedFeatures.reduce((sum, f) => sum + (f.completed_story_count || 0), 0);

    return {
        ...goal,
        features: enrichedFeatures as Feature[],
        feature_count: enrichedFeatures.length,
        completed_feature_count: enrichedFeatures.filter(f => f.status === 'Done').length,
        total_story_count: totalStories,
        completed_story_count: completedStories,
        progress_percentage: totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0,
    } as Goal;
}

/**
 * Create a new goal
 */
export async function createGoal(goal: {
    project_id: string;
    name: string;
    description?: string | null;
    time_horizon?: TimeHorizon;
    target_quarter?: string | null;
    target_date?: string | null;
    status?: GoalStatus;
    theme_color?: GoalThemeColor;
}): Promise<Goal> {
    // Get max display_order for this time horizon
    const { data: existing } = await supabase
        .from('pm_goals')
        .select('display_order')
        .eq('project_id', goal.project_id)
        .eq('time_horizon', goal.time_horizon || 'next')
        .order('display_order', { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

    const { data, error } = await supabase
        .from('pm_goals')
        .insert({
            ...goal,
            time_horizon: goal.time_horizon || 'next',
            status: goal.status || 'not_started',
            theme_color: goal.theme_color || 'blue',
            display_order: nextOrder,
        })
        .select()
        .single();

    if (error) throw error;
    return data as Goal;
}

/**
 * Update a goal
 */
export async function updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal> {
    const { data, error } = await supabase
        .from('pm_goals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', goalId)
        .select()
        .single();

    if (error) throw error;
    return data as Goal;
}

/**
 * Delete a goal (features get goal_id = null)
 */
export async function deleteGoal(goalId: string): Promise<void> {
    // First, unlink all features from this goal
    await supabase
        .from('pm_features')
        .update({ goal_id: null })
        .eq('goal_id', goalId);

    const { error } = await supabase
        .from('pm_goals')
        .delete()
        .eq('id', goalId);

    if (error) throw error;
}

/**
 * Move a goal to a different time horizon
 */
export async function moveGoalToHorizon(goalId: string, timeHorizon: TimeHorizon): Promise<Goal> {
    // Get max display_order for the target horizon
    const goal = await getGoal(goalId);
    if (!goal) throw new Error('Goal not found');

    const { data: existing } = await supabase
        .from('pm_goals')
        .select('display_order')
        .eq('project_id', goal.project_id)
        .eq('time_horizon', timeHorizon)
        .order('display_order', { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 1;

    return updateGoal(goalId, {
        time_horizon: timeHorizon,
        display_order: nextOrder,
    });
}

/**
 * Assign a feature to a goal
 */
export async function assignFeatureToGoal(featureId: string, goalId: string | null): Promise<void> {
    const { error } = await supabase
        .from('pm_features')
        .update({ goal_id: goalId })
        .eq('id', featureId);

    if (error) throw error;
}

/**
 * Bulk assign features to a goal
 */
export async function bulkAssignFeaturesToGoal(featureIds: string[], goalId: string | null): Promise<number> {
    if (featureIds.length === 0) return 0;

    const { error } = await supabase
        .from('pm_features')
        .update({ goal_id: goalId })
        .in('id', featureIds);

    if (error) throw error;
    return featureIds.length;
}

/**
 * Get features not assigned to any goal (for assignment UI)
 */
export async function getUnassignedFeatures(projectId: string): Promise<Feature[]> {
    const { data, error } = await supabase
        .from('pm_features')
        .select(`
            *,
            epic:pm_epics!inner(project_id, name)
        `)
        .eq('epic.project_id', projectId)
        .is('goal_id', null)
        .order('display_order');

    if (error) throw error;
    return data as Feature[];
}

/**
 * Reorder goals within a time horizon
 */
export async function reorderGoals(projectId: string, timeHorizon: TimeHorizon, goalIds: string[]): Promise<void> {
    for (let i = 0; i < goalIds.length; i++) {
        const { error } = await supabase
            .from('pm_goals')
            .update({ display_order: i + 1, updated_at: new Date().toISOString() })
            .eq('id', goalIds[i])
            .eq('project_id', projectId)
            .eq('time_horizon', timeHorizon);

        if (error) throw error;
    }
}

/**
 * Auto-update goal status based on feature progress
 */
export async function syncGoalStatus(goalId: string): Promise<Goal> {
    const goal = await getGoalWithFeatures(goalId);
    if (!goal) throw new Error('Goal not found');

    let newStatus: GoalStatus = 'not_started';

    if (goal.features && goal.features.length > 0) {
        const completedCount = goal.features.filter(f => f.status === 'Done').length;
        const inProgressCount = goal.features.filter(f => f.status === 'In Progress').length;
        const blockedCount = goal.features.filter(f => f.status === 'On Hold').length;

        if (completedCount === goal.features.length) {
            newStatus = 'completed';
        } else if (blockedCount > 0 || (goal.target_date && new Date(goal.target_date) < new Date())) {
            newStatus = 'at_risk';
        } else if (inProgressCount > 0 || completedCount > 0) {
            newStatus = 'in_progress';
        }
    }

    if (goal.status !== newStatus) {
        return updateGoal(goalId, { status: newStatus });
    }

    return goal;
}

