'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    ChevronDown,
    ChevronRight,
    Waves,
    Lock,
    Clock,
    Code,
    ListChecks,
    Target,
    Beaker,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneratedTask, PlatformId } from '@/lib/ai/platform-prompts';
import { PLATFORM_CONFIG } from '@/lib/ai/platform-prompts';

type Priority = 'P0' | 'P1' | 'P2';
type Wave = 'ready' | 'blocked' | 'later';

interface OrganizedTaskViewProps {
    tasks: GeneratedTask[];
    expandedTasks: Set<string>;
    onTaskToggle: (taskName: string) => void;
}

interface TaskWithWave extends GeneratedTask {
    wave: Wave;
    waveNumber: number;
}

// Priority tab configuration
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string }> = {
    P0: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20' },
    P1: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    P2: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
};

// Wave configuration
const WAVE_CONFIG: Record<Wave, { label: string; icon: typeof Waves; color: string; bgColor: string }> = {
    ready: { label: 'Ready Now', icon: Waves, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    blocked: { label: 'Blocked', icon: Lock, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
    later: { label: 'Later', icon: Clock, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
};

/**
 * Calculate waves based on task dependencies
 * Wave 1 (ready): No dependencies or all dependencies resolved
 * Wave 2+ (blocked): Has unresolved dependencies
 * Later: Low priority or many dependencies
 */
function calculateWaves(tasks: GeneratedTask[]): TaskWithWave[] {
    const taskNames = new Set(tasks.map(t => t.name));

    return tasks.map(task => {
        const deps = task.dependencies || [];
        const unresolvedDeps = deps.filter(d => taskNames.has(d));

        let wave: Wave;
        let waveNumber: number;

        if (unresolvedDeps.length === 0) {
            wave = 'ready';
            waveNumber = 1;
        } else if (unresolvedDeps.length <= 2) {
            wave = 'blocked';
            waveNumber = 2;
        } else {
            wave = 'later';
            waveNumber = 3;
        }

        return { ...task, wave, waveNumber };
    });
}

/**
 * Group tasks by platform, then by wave
 */
function groupTasks(tasks: TaskWithWave[]): Map<PlatformId, Map<Wave, TaskWithWave[]>> {
    const grouped = new Map<PlatformId, Map<Wave, TaskWithWave[]>>();

    tasks.forEach(task => {
        if (!grouped.has(task.platform)) {
            grouped.set(task.platform, new Map());
        }
        const platformGroup = grouped.get(task.platform)!;

        if (!platformGroup.has(task.wave)) {
            platformGroup.set(task.wave, []);
        }
        platformGroup.get(task.wave)!.push(task);
    });

    return grouped;
}

export function OrganizedTaskView({
    tasks,
    expandedTasks,
    onTaskToggle,
}: OrganizedTaskViewProps) {
    // State for priority filter (default: P0 and P1)
    const [selectedPriorities, setSelectedPriorities] = useState<Set<Priority>>(
        new Set(['P0', 'P1'])
    );

    // State for collapsed platforms
    const [collapsedPlatforms, setCollapsedPlatforms] = useState<Set<PlatformId>>(new Set());

    // State for collapsed waves within platforms
    const [collapsedWaves, setCollapsedWaves] = useState<Set<string>>(new Set());

    // Calculate task waves
    const tasksWithWaves = useMemo(() => calculateWaves(tasks), [tasks]);

    // Filter by priority
    const filteredTasks = useMemo(() => {
        return tasksWithWaves.filter(t => selectedPriorities.has(t.priority));
    }, [tasksWithWaves, selectedPriorities]);

    // Group filtered tasks
    const groupedTasks = useMemo(() => groupTasks(filteredTasks), [filteredTasks]);

    // Count tasks by priority
    const priorityCounts = useMemo(() => {
        const counts: Record<Priority, number> = { P0: 0, P1: 0, P2: 0 };
        tasks.forEach(t => counts[t.priority]++);
        return counts;
    }, [tasks]);

    // Toggle priority filter
    const togglePriority = (priority: Priority) => {
        setSelectedPriorities(prev => {
            const next = new Set(prev);
            if (next.has(priority)) {
                // Don't allow deselecting all
                if (next.size > 1) next.delete(priority);
            } else {
                next.add(priority);
            }
            return next;
        });
    };

    // Toggle platform collapse
    const togglePlatform = (platform: PlatformId) => {
        setCollapsedPlatforms(prev => {
            const next = new Set(prev);
            if (next.has(platform)) {
                next.delete(platform);
            } else {
                next.add(platform);
            }
            return next;
        });
    };

    // Toggle wave collapse within a platform
    const toggleWave = (platform: PlatformId, wave: Wave) => {
        const key = `${platform}-${wave}`;
        setCollapsedWaves(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // Get ordered platforms based on which have tasks
    const orderedPlatforms = useMemo(() => {
        return (['A', 'B', 'C', 'D'] as PlatformId[]).filter(p => groupedTasks.has(p));
    }, [groupedTasks]);

    return (
        <div className="space-y-4 overflow-hidden">
            {/* Summary Bar */}
            <div className="flex items-center justify-between text-sm text-gray-400">
                <span>
                    Showing <span className="text-white font-medium">{filteredTasks.length}</span> of{' '}
                    <span className="text-white font-medium">{tasks.length}</span> tasks
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-green-400">●</span>
                    <span>{filteredTasks.filter(t => t.wave === 'ready').length} ready</span>
                    <span className="text-yellow-400 ml-2">●</span>
                    <span>{filteredTasks.filter(t => t.wave === 'blocked').length} blocked</span>
                </div>
            </div>

            {/* Priority Tabs */}
            <div className="flex gap-2">
                {(['P0', 'P1', 'P2'] as Priority[]).map(priority => {
                    const config = PRIORITY_CONFIG[priority];
                    const isSelected = selectedPriorities.has(priority);
                    const count = priorityCounts[priority];

                    return (
                        <button
                            key={priority}
                            onClick={() => togglePriority(priority)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                isSelected
                                    ? `${config.bgColor} ${config.color} ring-1 ring-current`
                                    : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <span>{priority}</span>
                            <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded",
                                isSelected ? "bg-black/20" : "bg-gray-700"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Platform Accordions */}
            <div className="space-y-3">
                {orderedPlatforms.map(platformId => {
                    const config = PLATFORM_CONFIG[platformId];
                    const platformWaves = groupedTasks.get(platformId)!;
                    const isCollapsed = collapsedPlatforms.has(platformId);
                    const totalTasks = Array.from(platformWaves.values()).flat().length;
                    const readyCount = platformWaves.get('ready')?.length || 0;

                    return (
                        <Card key={platformId} className="bg-gray-800/50 border-gray-700 overflow-hidden min-w-0">
                            {/* Platform Header */}
                            <button
                                onClick={() => togglePlatform(platformId)}
                                className="w-full p-3 border-b border-gray-700 flex items-center gap-2 hover:bg-gray-700/30 transition-colors"
                                style={{ backgroundColor: isCollapsed ? 'transparent' : `${config.color}08` }}
                            >
                                {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-xl">{config.icon}</span>
                                <span className="font-medium text-white">{config.name}</span>
                                <span className="text-xs text-gray-400 ml-auto">
                                    {readyCount > 0 && (
                                        <span className="text-green-400 mr-2">{readyCount} ready</span>
                                    )}
                                    {totalTasks} tasks
                                </span>
                            </button>

                            {/* Wave Groups */}
                            {!isCollapsed && (
                                <div className="divide-y divide-gray-700/50">
                                    {(['ready', 'blocked', 'later'] as Wave[]).map(wave => {
                                        const waveTasks = platformWaves.get(wave);
                                        if (!waveTasks || waveTasks.length === 0) return null;

                                        const waveConfig = WAVE_CONFIG[wave];
                                        const WaveIcon = waveConfig.icon;
                                        const waveKey = `${platformId}-${wave}`;
                                        const isWaveCollapsed = collapsedWaves.has(waveKey);

                                        return (
                                            <div key={wave}>
                                                {/* Wave Header */}
                                                <button
                                                    onClick={() => toggleWave(platformId, wave)}
                                                    className={cn(
                                                        "w-full px-4 py-2 flex items-center gap-2 text-sm",
                                                        waveConfig.bgColor,
                                                        "hover:brightness-110 transition-all"
                                                    )}
                                                >
                                                    {isWaveCollapsed ? (
                                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-3 h-3 text-gray-400" />
                                                    )}
                                                    <WaveIcon className={cn("w-4 h-4", waveConfig.color)} />
                                                    <span className={waveConfig.color}>{waveConfig.label}</span>
                                                    <span className="text-gray-500 ml-auto">
                                                        {waveTasks.length} tasks
                                                    </span>
                                                </button>

                                                {/* Tasks in Wave */}
                                                {!isWaveCollapsed && (
                                                    <div className="divide-y divide-gray-700/30">
                                                        {waveTasks.map((task, idx) => (
                                                            <TaskRow
                                                                key={idx}
                                                                task={task}
                                                                isExpanded={expandedTasks.has(task.name)}
                                                                onToggle={() => onTaskToggle(task.name)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Empty State */}
            {filteredTasks.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                    <p>No tasks match the selected priorities.</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPriorities(new Set(['P0', 'P1', 'P2']))}
                        className="mt-2"
                    >
                        Show All Priorities
                    </Button>
                </div>
            )}
        </div>
    );
}

// Individual Task Row Component
function TaskRow({
    task,
    isExpanded,
    onToggle,
}: {
    task: TaskWithWave;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const priorityConfig = PRIORITY_CONFIG[task.priority];

    return (
        <div className="px-4 py-2">
            <button
                onClick={onToggle}
                className="w-full text-left flex items-center gap-2 min-w-0"
            >
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                {/* Platform Badge */}
                <span
                    className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                    style={{
                        backgroundColor: `${PLATFORM_CONFIG[task.platform].color}20`,
                        color: PLATFORM_CONFIG[task.platform].color
                    }}
                >
                    {PLATFORM_CONFIG[task.platform].icon}
                </span>
                <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0",
                    priorityConfig.bgColor,
                    priorityConfig.color
                )}>
                    {task.priority}
                </span>
                <span className="font-medium text-white flex-1 truncate min-w-0">{task.name}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">{task.estimate}</span>
            </button>

            {isExpanded && (
                <div className="mt-3 ml-6 space-y-3 text-sm overflow-hidden">
                    {/* Objective */}
                    <div className="flex gap-2">
                        <Target className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-gray-400 text-xs mb-0.5">Objective</p>
                            <p className="text-gray-200 break-words">{task.objective}</p>
                        </div>
                    </div>

                    {/* Dependencies */}
                    {task.dependencies && task.dependencies.length > 0 && (
                        <div className="flex gap-2">
                            <Lock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-gray-400 text-xs mb-0.5">Blocked By</p>
                                <div className="flex flex-wrap gap-1">
                                    {task.dependencies.slice(0, 3).map((dep, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                                            {dep}
                                        </span>
                                    ))}
                                    {task.dependencies.length > 3 && (
                                        <span className="text-xs text-gray-500">
                                            +{task.dependencies.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Implementation Steps */}
                    <div className="flex gap-2">
                        <ListChecks className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-gray-400 text-xs mb-1">Steps</p>
                            <ol className="list-decimal list-inside text-gray-300 space-y-1">
                                {task.implementation_steps.slice(0, 4).map((step, i) => (
                                    <li key={i}>{step.title}</li>
                                ))}
                                {task.implementation_steps.length > 4 && (
                                    <li className="text-gray-500">
                                        +{task.implementation_steps.length - 4} more...
                                    </li>
                                )}
                            </ol>
                        </div>
                    </div>

                    {/* Definition of Done */}
                    <div className="flex gap-2">
                        <Beaker className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-gray-400 text-xs mb-1">Definition of Done</p>
                            <ul className="text-gray-300 space-y-0.5">
                                {task.definition_of_done.slice(0, 3).map((item, i) => (
                                    <li key={i} className="flex items-center gap-1">
                                        <span className="w-3 h-3 rounded border border-gray-600" />
                                        {item}
                                    </li>
                                ))}
                                {task.definition_of_done.length > 3 && (
                                    <li className="text-gray-500">
                                        +{task.definition_of_done.length - 3} more...
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Code Snippets indicator */}
                    {task.code_snippets && task.code_snippets.length > 0 && (
                        <div className="flex gap-2">
                            <Code className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-gray-400 text-xs mb-1">Code Examples</p>
                                <p className="text-gray-300">
                                    {task.code_snippets.length} snippet{task.code_snippets.length > 1 ? 's' : ''} included
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
