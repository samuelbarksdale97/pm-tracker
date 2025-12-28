'use client';

import { useState, useEffect } from 'react';
import { UserStory, Story, TeamMember, getTasksForUserStory } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, User, Briefcase, Shield, Users, Clock, FileText } from 'lucide-react';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface UserStoryTableProps {
    userStories: UserStory[];
    teamMembers: TeamMember[];
    onTaskClick: (task: Story) => void;
    onUserStoryClick?: (userStory: UserStory) => void;
}

const statusColors: Record<string, string> = {
    'Not Started': 'bg-gray-500',
    'In Progress': 'bg-blue-500',
    'Testing': 'bg-purple-500',
    'Done': 'bg-green-500',
    'Blocked': 'bg-red-500',
    'On Hold': 'bg-yellow-500',
};

const priorityColors: Record<string, string> = {
    'P0': 'bg-red-600 text-white',
    'P1': 'bg-yellow-500 text-black',
    'P2': 'bg-gray-400 text-white',
};

const personaIcons: Record<string, React.ReactNode> = {
    'member': <User className="w-4 h-4" />,
    'admin': <Shield className="w-4 h-4" />,
    'staff': <Briefcase className="w-4 h-4" />,
    'business': <Briefcase className="w-4 h-4" />,
    'guest': <Users className="w-4 h-4" />,
};

const personaColors: Record<string, string> = {
    'member': 'text-blue-400',
    'admin': 'text-purple-400',
    'staff': 'text-green-400',
    'business': 'text-orange-400',
    'guest': 'text-gray-400',
};

const workstreamConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    'A': { label: 'Backend', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/50' },
    'B': { label: 'Mobile', color: 'text-sky-400', bgColor: 'bg-sky-500/20 border-sky-500/50' },
    'C': { label: 'Admin', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/50' },
    'D': { label: 'Infra', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/50' },
};

function UserStoryRow({
    userStory,
    onTaskClick,
    onUserStoryClick,
}: {
    userStory: UserStory;
    onTaskClick: (task: Story) => void;
    onUserStoryClick?: (userStory: UserStory) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [tasks, setTasks] = useState<Story[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isExpanded && tasks.length === 0) {
            setLoading(true);
            getTasksForUserStory(userStory.id)
                .then(setTasks)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isExpanded, userStory.id, tasks.length]);

    return (
        <>
            <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                <td className="p-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                    </button>
                </td>
                <td className="p-3">
                    <div className={`flex items-center gap-2 ${personaColors[userStory.persona]}`}>
                        {personaIcons[userStory.persona]}
                        <span className="capitalize text-sm">{userStory.persona}</span>
                    </div>
                </td>
                <td
                    className="p-3 cursor-pointer"
                    onClick={() => onUserStoryClick?.(userStory)}
                >
                    <div className="flex flex-col gap-1">
                        <span className="text-white font-medium hover:text-blue-400 transition-colors">{userStory.narrative}</span>
                        <span className="text-xs text-gray-500 capitalize">{userStory.feature_area}</span>
                    </div>
                </td>
                <td className="p-3">
                    <Badge className={priorityColors[userStory.priority]}>{userStory.priority}</Badge>
                </td>
                <td className="p-3">
                    <Badge className={statusColors[userStory.status]}>{userStory.status}</Badge>
                </td>
            </tr>
            {/* Expanded Tasks */}
            {isExpanded && (
                <tr className="bg-gray-900/50">
                    <td colSpan={5} className="p-0">
                        <div className="pl-12 pr-4 py-3 border-l-4 border-blue-500 ml-4">
                            <div className="text-xs font-semibold text-blue-400 mb-3">
                                Implementation Tasks ({loading ? '...' : tasks.length})
                            </div>
                            {loading ? (
                                <div className="text-gray-500 text-sm">Loading tasks...</div>
                            ) : tasks.length === 0 ? (
                                <div className="text-gray-500 text-sm italic">No tasks linked to this User Story yet.</div>
                            ) : (
                                <div className="space-y-2">
                                    {tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => onTaskClick(task)}
                                            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {/* Workstream Tag */}
                                                {task.workstream_id && workstreamConfig[task.workstream_id] && (
                                                    <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${workstreamConfig[task.workstream_id].bgColor} ${workstreamConfig[task.workstream_id].color}`}>
                                                        {workstreamConfig[task.workstream_id].label}
                                                    </span>
                                                )}
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className="text-sm text-white truncate">{task.name}</span>
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className="font-mono">{task.id.slice(0, 12)}</span>
                                                        {task.estimate && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {task.estimate}
                                                            </span>
                                                        )}
                                                        {task.objective && (
                                                            <span className="flex items-center gap-1 text-purple-400">
                                                                <FileText className="w-3 h-3" />
                                                                Has specs
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                <Badge className={priorityColors[task.priority]} variant="outline">{task.priority}</Badge>
                                                <Badge className={statusColors[task.status]}>{task.status}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

export function UserStoryTable({ userStories, onTaskClick, onUserStoryClick }: UserStoryTableProps) {
    if (userStories.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No User Stories found.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
            <Table>
                <TableHeader>
                    <TableRow className="border-gray-800 bg-gray-900">
                        <TableHead className="w-12 text-gray-400"></TableHead>
                        <TableHead className="w-28 text-gray-400">Persona</TableHead>
                        <TableHead className="text-gray-400">User Story</TableHead>
                        <TableHead className="w-20 text-gray-400">Priority</TableHead>
                        <TableHead className="w-28 text-gray-400">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {userStories.map((us) => (
                        <UserStoryRow
                            key={us.id}
                            userStory={us}
                            onTaskClick={onTaskClick}
                            onUserStoryClick={onUserStoryClick}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
