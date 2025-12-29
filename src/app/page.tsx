'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Lightbulb, Calendar, Zap, BarChart2 } from 'lucide-react';
import {
  supabase,
  getProject,
  getWorkstreams,
  getMilestones,
  getStories,
  getUserStories,
  getTeamMembers,
  getFeaturesForMilestoneBoard,
  updateStoryStatus,
  updateStoryOwner,
  Story,
  UserStory,
  Workstream,
  Milestone,
  TeamMember,
  Project,
  Feature
} from '@/lib/supabase';
import { StoryDetailDrawer } from '@/components/story-detail-drawer';
import { UserStoryDetailDrawer } from '@/components/user-story-detail-drawer';
import { ChatAssistant } from '@/components/ai/chat-assistant';
import { ProjectContextEditor } from '@/components/project-context-editor';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlanTab, ScheduleTab, ExecuteTab, MonitorTab } from '@/components/tabs';
import { GlobalSearch } from '@/components/global-search';
import { NotificationsDropdown } from '@/components/notifications-dropdown';
import { cn } from '@/lib/utils';
import { useUrlState } from '@/hooks/use-url-state';

type WorkflowStage = 'plan' | 'schedule' | 'execute' | 'monitor';

const workflowTabs = [
  { key: 'plan' as const, label: 'Plan', icon: Lightbulb, desc: 'Define what to build', color: 'text-amber-400' },
  { key: 'schedule' as const, label: 'Schedule', icon: Calendar, desc: 'Decide when to build', color: 'text-blue-400' },
  { key: 'execute' as const, label: 'Execute', icon: Zap, desc: 'Track the work', color: 'text-green-400' },
  { key: 'monitor' as const, label: 'Monitor', icon: BarChart2, desc: 'Measure progress', color: 'text-purple-400' },
];

// Loading fallback for Suspense
function PageLoading() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  );
}

// Main page wrapper with Suspense for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const [project, setProject] = useState<Project | null>(null);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stage, setStage] = useUrlState<WorkflowStage>('tab', 'plan');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoShowAIGeneration, setAutoShowAIGeneration] = useState(false);

  // User Story drawer state
  const [selectedUserStory, setSelectedUserStory] = useState<UserStory | null>(null);
  const [userStoryDrawerOpen, setUserStoryDrawerOpen] = useState(false);
  const [userStoryAutoShowAI, setUserStoryAutoShowAI] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const proj = await getProject();
      setProject(proj);

      const [ws, ms, t, us, feats, tm] = await Promise.all([
        getWorkstreams(proj.id),
        getMilestones(proj.id),
        getStories(proj.id),
        getUserStories(proj.id),
        getFeaturesForMilestoneBoard(proj.id),
        getTeamMembers()
      ]);

      setWorkstreams(ws);
      setMilestones(ms);
      setStories(t);
      setUserStories(us);
      setFeatures(feats);
      setTeamMembers(tm);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data from Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('pm_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pm_tasks' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadData]);

  const handleStatusChange = async (storyId: string, status: Story['status']) => {
    try {
      await updateStoryStatus(storyId, status);
      setStories(prev =>
        prev.map(story =>
          story.id === storyId ? { ...story, status } : story
        )
      );
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleOwnerChange = async (storyId: string, ownerId: string | null) => {
    try {
      await updateStoryOwner(storyId, ownerId);
      const owner = teamMembers.find(m => m.id === ownerId);
      setStories(prev =>
        prev.map(story =>
          story.id === storyId ? { ...story, owner_id: ownerId, owner } : story
        )
      );
    } catch (err) {
      console.error('Error updating owner:', err);
    }
  };

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    setAutoShowAIGeneration(false);
    setDrawerOpen(true);
  };

  // Handler for User Story clicks - opens UserStoryDetailDrawer
  const handleUserStoryClick = (userStory: UserStory) => {
    setSelectedUserStory(userStory);
    setUserStoryAutoShowAI(false);
    setUserStoryDrawerOpen(true);
  };

  // Handler for newly created User Stories - opens drawer with AI generation modal
  const handleNewUserStoryCreated = (userStory: UserStory) => {
    setSelectedUserStory(userStory);
    setUserStoryAutoShowAI(true);
    setUserStoryDrawerOpen(true);
    loadData(); // Refresh to show new user story in list
  };

  // Handler for task click from within UserStoryDetailDrawer
  const handleTaskClickFromUserStory = (task: Story) => {
    setSelectedStory(task);
    setAutoShowAIGeneration(false);
    setDrawerOpen(true);
  };

  // Handler for global search result selection
  const handleSearchResultSelect = useCallback((result: {
    id: string;
    type: 'epic' | 'feature' | 'story';
    epicId?: string;
    featureId?: string;
  }) => {
    // Navigate to Plan tab and set URL params to show the selected item
    setStage('plan');

    // Build URL params based on result type
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'plan');

    if (result.type === 'epic') {
      params.set('epic', result.id);
      params.delete('feature');
      params.delete('story');
    } else if (result.type === 'feature') {
      if (result.epicId) params.set('epic', result.epicId);
      params.set('feature', result.id);
      params.delete('story');
    } else if (result.type === 'story') {
      if (result.epicId) params.set('epic', result.epicId);
      if (result.featureId) params.set('feature', result.featureId);
      params.set('story', result.id);
    }

    // Update URL to trigger navigation
    window.history.pushState({}, '', `?${params.toString()}`);
    // Force a reload to pick up the new URL state
    loadData();
  }, [setStage, loadData]);

  // Primary stats from User Stories (planning artifacts)
  const userStoryStats = useMemo(() => {
    return {
      total: userStories.length,
      notStarted: userStories.filter(s => s.status === 'Not Started').length,
      inProgress: userStories.filter(s => s.status === 'In Progress').length,
      done: userStories.filter(s => s.status === 'Done').length,
      blocked: userStories.filter(s => s.status === 'Blocked').length,
      p0: userStories.filter(s => s.priority === 'P0').length,
      p1: userStories.filter(s => s.priority === 'P1').length,
      p2: userStories.filter(s => s.priority === 'P2').length,
    };
  }, [userStories]);

  // Legacy stats from Stories/Tasks (execution artifacts)
  const stats = useMemo(() => {
    return {
      total: stories.length,
      notStarted: stories.filter(t => t.status === 'Not Started').length,
      inProgress: stories.filter(t => t.status === 'In Progress').length,
      done: stories.filter(t => t.status === 'Done').length,
      blocked: stories.filter(t => t.status === 'Blocked').length,
      p0: stories.filter(t => t.priority === 'P0').length,
      p1: stories.filter(t => t.priority === 'P1').length,
      p2: stories.filter(t => t.priority === 'P2').length,
    };
  }, [stories]);

  const filteredStories = useMemo(() => {
    return stories.filter(t => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });
  }, [stories, statusFilter, priorityFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading from Supabase...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Button onClick={loadData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                {project?.name || 'PM Tracker'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{project?.description}</p>
            </div>
            <div className="flex items-center gap-6">
              {/* Global Search */}
              {project && (
                <GlobalSearch
                  projectId={project.id}
                  onSelectResult={handleSearchResultSelect}
                />
              )}
              {/* Notifications */}
              <NotificationsDropdown />
              {project && (
                <ProjectContextEditor
                  projectId={project.id}
                  onContextUpdated={() => loadData()}
                />
              )}
              <div className="text-right">
                <div className="text-sm text-gray-400">User Stories</div>
                <div className="text-lg font-semibold text-green-400">
                  {userStoryStats.done}/{userStoryStats.total} ({userStoryStats.total > 0 ? Math.round((userStoryStats.done / userStoryStats.total) * 100) : 0}%)
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Workflow Stage Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            {workflowTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = stage === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStage(tab.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium',
                    isActive
                      ? 'bg-gray-800 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive ? tab.color : '')} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Global Filters - show on Execute stage */}
          {stage === 'execute' && (
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 bg-gray-900 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Priority:</span>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-36 bg-gray-900 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="P0">P0 (Critical)</SelectItem>
                    <SelectItem value="P1">P1 (Important)</SelectItem>
                    <SelectItem value="P2">P2 (Nice-to-have)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Workflow Stage Content */}
        {stage === 'plan' && project && (
          <PlanTab
            projectId={project.id}
            teamMembers={teamMembers}
            onRefresh={loadData}
          />
        )}

        {stage === 'schedule' && project && (
          <ScheduleTab
            projectId={project.id}
            milestones={milestones}
            userStories={userStories}
            features={features}
            onRefresh={loadData}
            onUserStoryCreated={handleNewUserStoryCreated}
          />
        )}

        {stage === 'execute' && (
          <ExecuteTab
            stories={filteredStories}
            workstreams={workstreams}
            teamMembers={teamMembers}
            userStories={userStories}
            onStatusChange={handleStatusChange}
            onOwnerChange={handleOwnerChange}
            onStoryClick={handleStoryClick}
          />
        )}

        {stage === 'monitor' && project && (
          <MonitorTab
            projectId={project.id}
            projectName={project.name}
            stories={stories}
            userStories={userStories}
            workstreams={workstreams}
            onStoryClick={handleStoryClick}
            onRefresh={loadData}
          />
        )}
      </main>

      {/* Task Detail Drawer */}
      {selectedStory && (
        <StoryDetailDrawer
          story={selectedStory}
          teamMembers={teamMembers}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onStatusChange={handleStatusChange}
          onOwnerChange={handleOwnerChange}
          onUpdate={loadData}
          autoShowAIGeneration={autoShowAIGeneration}
        />
      )}

      {/* User Story Detail Drawer */}
      {selectedUserStory && (
        <UserStoryDetailDrawer
          userStory={selectedUserStory}
          teamMembers={teamMembers}
          open={userStoryDrawerOpen}
          onOpenChange={setUserStoryDrawerOpen}
          onTaskClick={handleTaskClickFromUserStory}
          onUpdate={loadData}
          autoShowAIGeneration={userStoryAutoShowAI}
        />
      )}

      <footer className="border-t border-gray-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          Park at 14th — Membership App Project Tracker • Powered by Supabase
        </div>
      </footer>

      {/* AI Chat Assistant */}
      <ChatAssistant />
    </div>
  );
}
