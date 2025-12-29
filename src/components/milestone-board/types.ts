import { UserStory, Milestone, Feature } from '@/lib/supabase';
import { User, Shield, Briefcase, Building2, Users } from 'lucide-react';

export type MilestoneBoardMode = 'stories' | 'features';

export interface MilestoneBoardProps {
    projectId: string;
    milestones: Milestone[];
    userStories: UserStory[];
    features: Feature[];
    onRefresh: () => void;
    onUserStoryCreated?: (userStory: UserStory) => void;
}

export interface StoryCardProps {
    story: UserStory;
    milestones: Milestone[];
    onMove?: (storyId: string, milestoneId: string | null) => void;
    bulkMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    disabled?: boolean;
    isDragging?: boolean;
    onDragStart?: (storyId: string) => void;
    onDragEnd?: () => void;
}

export interface MilestoneColumnProps {
    milestone: Milestone;
    stories: UserStory[];
    features: Feature[];
    allMilestones: Milestone[];
    bulkMode: boolean;
    selectedItems: Set<string>;
    onToggleItemSelect: (itemId: string) => void;
    onSelectAllInMilestone: (milestoneId: string) => void;
    onMoveStory: (storyId: string, milestoneId: string | null) => void;
    onMoveFeature: (featureId: string, milestoneId: string | null) => void;
    onStartEditing: (milestone: Milestone) => void;
    onUpdateMilestone: (id: string, name: string, startDate: string, endDate: string) => void;
    onDeleteMilestone: (id: string) => void;
    onLockMilestone: (id: string, lock: boolean) => void;
    onDuplicateMilestone: (id: string) => void;
    editingId: string | null;
    onCancelEditing: () => void;
    isSubmitting: boolean;
    mode: MilestoneBoardMode;
    onDrop: (milestoneId: string) => void;
    isDragOver?: boolean;
}

export interface BacklogColumnProps {
    stories: UserStory[];
    features: Feature[];
    milestones: Milestone[];
    bulkMode: boolean;
    selectedItems: Set<string>;
    onToggleItemSelect: (itemId: string) => void;
    onSelectAllInMilestone: (milestoneId: string) => void;
    onMoveStory: (storyId: string, milestoneId: string | null) => void;
    onMoveFeature: (featureId: string, milestoneId: string | null) => void;
    allItemsAssigned: boolean;
    mode: MilestoneBoardMode;
    onDrop: (milestoneId: string | null) => void;
    isDragOver?: boolean;
}

export interface MilestoneBoardHeaderProps {
    bulkMode: boolean;
    selectedCount: number;
    milestones: Milestone[];
    projectId: string;
    onBulkAssign: (milestoneId: string | null) => void;
    onCancelBulkMode: () => void;
    onEnableBulkMode: () => void;
    onResetAll: () => void;
    onRefresh: () => void;
    onUserStoryCreated?: (userStory: UserStory) => void;
    onOpenCreateDialog: () => void;
    mode: MilestoneBoardMode;
    onModeChange: (mode: MilestoneBoardMode) => void;
}

export interface MilestoneBoardFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    workstreamFilter: string;
    onWorkstreamChange: (filter: string) => void;
    priorityFilter: string;
    onPriorityChange: (filter: string) => void;
    workstreams: string[];
    onClearFilters: () => void;
    hasActiveFilters: boolean;
}

export interface CreateMilestoneDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (name: string, startDate: string, endDate: string) => void;
    isSubmitting: boolean;
}

// Shared constants
export const personaIcons: Record<string, typeof User> = {
    'member': User,
    'admin': Shield,
    'staff': Briefcase,
    'business': Building2,
    'guest': Users,
};

export const personaColors: Record<string, string> = {
    'member': 'text-blue-400',
    'admin': 'text-purple-400',
    'staff': 'text-green-400',
    'business': 'text-orange-400',
    'guest': 'text-gray-400',
};

export const statusDotColors: Record<string, string> = {
    'Not Started': 'bg-gray-500',
    'In Progress': 'bg-blue-500',
    'Testing': 'bg-purple-500',
    'Done': 'bg-green-500',
    'Blocked': 'bg-amber-500',
};

export const priorityColors: Record<string, string> = {
    'P0': 'bg-red-600 text-white',
    'P1': 'bg-yellow-500 text-black',
    'P2': 'bg-gray-500 text-white',
};
