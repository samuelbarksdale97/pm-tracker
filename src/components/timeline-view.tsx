'use client';

import { useMemo, useState } from 'react';
import { Story, Workstream } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut } from 'lucide-react';

type ZoomLevel = 'day' | 'week' | 'month';

const zoomConfigs: Record<ZoomLevel, { dayWidth: number; label: string }> = {
    day: { dayWidth: 48, label: 'Day' },
    week: { dayWidth: 32, label: 'Week' },
    month: { dayWidth: 16, label: 'Month' },
};

interface TimelineViewProps {
    stories: Story[];
    workstreams: Workstream[];
    onStoryClick: (story: Story) => void;
}

const statusColors: Record<Story['status'], string> = {
    'Not Started': 'bg-gray-600',
    'In Progress': 'bg-blue-500',
    'Testing': 'bg-purple-500',
    'Done': 'bg-green-500',
    'Blocked': 'bg-red-500',
    'On Hold': 'bg-yellow-500',
};

const priorityBorders: Record<string, string> = {
    'P0': 'border-l-4 border-l-red-500',
    'P1': 'border-l-4 border-l-yellow-500',
    'P2': 'border-l-4 border-l-gray-500',
};

// Parse estimate string to days (e.g., "2d" -> 2, "4h" -> 0.5)
function parseEstimate(estimate: string | null): number {
    if (!estimate) return 1;
    const match = estimate.match(/(\d+)([dh])/);
    if (!match) return 1;
    const [, num, unit] = match;
    return unit === 'd' ? parseInt(num) : parseInt(num) / 8;
}

// Calculate story positions based on dependencies
function calculateStoryPositions(stories: Story[]): Map<string, { start: number; duration: number }> {
    const positions = new Map<string, { start: number; duration: number }>();
    const processed = new Set<string>();

    function getStoryStart(storyId: string): number {
        if (positions.has(storyId)) {
            return positions.get(storyId)!.start;
        }

        const story = stories.find(t => t.id === storyId);
        if (!story) return 0;

        // Check dependencies
        let maxDepEnd = 0;
        if (story.dependencies && story.dependencies.length > 0) {
            for (const depId of story.dependencies) {
                if (!processed.has(depId)) {
                    const depStory = stories.find(t => t.id === depId);
                    if (depStory) {
                        getStoryStart(depId); // Recursively calculate
                    }
                }
                const dep = positions.get(depId);
                if (dep) {
                    maxDepEnd = Math.max(maxDepEnd, dep.start + dep.duration);
                }
            }
        }

        const duration = parseEstimate(story.estimate);
        positions.set(storyId, { start: maxDepEnd, duration });
        processed.add(storyId);

        return maxDepEnd;
    }

    // Process all stories
    for (const story of stories) {
        if (!processed.has(story.id)) {
            getStoryStart(story.id);
        }
    }

    return positions;
}

export function TimelineView({ stories, workstreams, onStoryClick }: TimelineViewProps) {
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
    const positions = useMemo(() => calculateStoryPositions(stories), [stories]);

    // Calculate total timeline duration
    const totalDays = useMemo(() => {
        let maxEnd = 0;
        positions.forEach(({ start, duration }) => {
            maxEnd = Math.max(maxEnd, start + duration);
        });
        return Math.max(maxEnd, 20); // Minimum 20 days
    }, [positions]);

    // Generate week markers
    const weeks = useMemo(() => {
        const numWeeks = Math.ceil(totalDays / 5); // 5 working days per week
        return Array.from({ length: numWeeks }, (_, i) => i + 1);
    }, [totalDays]);

    const dayWidth = zoomConfigs[zoomLevel].dayWidth;

    // Calculate today's position (days from project start)
    const todayPosition = useMemo(() => {
        // Assume project starts "today" for simplicity - adjust based on earliest story
        return 0; // Today is at day 0
    }, []);

    const handleZoomIn = () => {
        if (zoomLevel === 'month') setZoomLevel('week');
        else if (zoomLevel === 'week') setZoomLevel('day');
    };

    const handleZoomOut = () => {
        if (zoomLevel === 'day') setZoomLevel('week');
        else if (zoomLevel === 'week') setZoomLevel('month');
    };

    return (
        <div className="space-y-4">
            {/* Zoom Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleZoomOut}
                        disabled={zoomLevel === 'month'}
                        className="h-7 w-7 p-0"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-400 px-2 min-w-[60px] text-center">
                        {zoomConfigs[zoomLevel].label}
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleZoomIn}
                        disabled={zoomLevel === 'day'}
                        className="h-7 w-7 p-0"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>
                <div className="text-sm text-gray-500">
                    {stories.length} tasks • {totalDays} days total
                </div>
            </div>

            <div className="overflow-x-auto">
            {/* Timeline Header */}
            <div className="sticky top-0 bg-gray-950 z-10 border-b border-gray-800">
                <div className="flex">
                    <div className="w-48 flex-shrink-0 p-3 border-r border-gray-800 font-medium text-gray-400">
                        Story
                    </div>
                    <div className="flex relative" style={{ width: totalDays * dayWidth }}>
                        {/* Today marker in header */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                            style={{ left: todayPosition * dayWidth }}
                        >
                            <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-1 rounded-b font-bold whitespace-nowrap">
                                TODAY
                            </div>
                        </div>
                        {weeks.map((week) => (
                            <div
                                key={week}
                                className="border-r border-gray-800 text-center text-sm text-gray-500 py-2"
                                style={{ width: 5 * dayWidth }}
                            >
                                Week {week}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline Body - Grouped by Workstream */}
            {workstreams.map((ws) => {
                const wsStories = stories.filter(t => t.workstream_id === ws.id);
                if (wsStories.length === 0) return null;

                return (
                    <div key={ws.id} className="border-b border-gray-800">
                        {/* Workstream Header */}
                        <div
                            className="sticky left-0 px-3 py-2 font-semibold text-sm flex items-center gap-2"
                            style={{ backgroundColor: ws.color ? `${ws.color}20` : '#1f2937' }}
                        >
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: ws.color || '#666' }}
                            />
                            {ws.name}
                            <Badge variant="secondary" className="bg-gray-700 text-xs">
                                {wsStories.filter(t => t.status === 'Done').length}/{wsStories.length}
                            </Badge>
                        </div>

                        {/* Stories */}
                        {wsStories.map((story) => {
                            const pos = positions.get(story.id) || { start: 0, duration: 1 };

                            return (
                                <div key={story.id} className="flex hover:bg-gray-900/50 transition-colors">
                                    {/* Story Label */}
                                    <div
                                        className="w-48 flex-shrink-0 p-2 border-r border-gray-800 truncate cursor-pointer hover:text-blue-400"
                                        onClick={() => onStoryClick(story)}
                                        title={story.name}
                                    >
                                        <span className="text-gray-500 text-xs mr-2">{story.id}</span>
                                        <span className="text-sm">{story.name.substring(0, 25)}...</span>
                                    </div>

                                    {/* Task Bar */}
                                    <div
                                        className="relative h-10 flex items-center"
                                        style={{ width: totalDays * dayWidth }}
                                    >
                                        {/* Today marker line */}
                                        <div
                                            className="absolute top-0 bottom-0 w-0.5 bg-red-500/40 z-10 pointer-events-none"
                                            style={{ left: todayPosition * dayWidth }}
                                        />
                                        {/* Grid lines */}
                                        {weeks.map((week, i) => (
                                            <div
                                                key={week}
                                                className="absolute top-0 bottom-0 border-r border-gray-800/50"
                                                style={{ left: (i + 1) * 5 * dayWidth }}
                                            />
                                        ))}

                                        {/* Story bar */}
                                        <div
                                            className={`absolute h-7 rounded cursor-pointer transition-all hover:brightness-110 flex items-center px-2 text-xs font-medium text-white ${statusColors[story.status]} ${priorityBorders[story.priority]}`}
                                            style={{
                                                left: pos.start * dayWidth + 4,
                                                width: Math.max(pos.duration * dayWidth - 8, 24),
                                            }}
                                            onClick={() => onStoryClick(story)}
                                            title={`${story.name} (${story.estimate || '?'})`}
                                        >
                                            <span className="truncate">{story.id}</span>
                                        </div>

                                        {/* Dependency arrows */}
                                        {story.dependencies?.map((depId) => {
                                            const depPos = positions.get(depId);
                                            if (!depPos) return null;

                                            const startX = depPos.start * dayWidth + depPos.duration * dayWidth;
                                            const endX = pos.start * dayWidth;

                                            if (endX <= startX) return null;

                                            return (
                                                <svg
                                                    key={`${depId}-${story.id}`}
                                                    className="absolute top-0 left-0 pointer-events-none"
                                                    style={{ width: totalDays * dayWidth, height: 40 }}
                                                >
                                                    <path
                                                        d={`M ${startX} 20 L ${endX} 20`}
                                                        stroke="#4B5563"
                                                        strokeWidth="1"
                                                        fill="none"
                                                        markerEnd="url(#arrowhead)"
                                                    />
                                                </svg>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {/* Arrow marker definition */}
            <svg className="absolute" style={{ width: 0, height: 0 }}>
                <defs>
                    <marker
                        id="arrowhead"
                        markerWidth="6"
                        markerHeight="6"
                        refX="6"
                        refY="3"
                        orient="auto"
                    >
                        <polygon points="0 0, 6 3, 0 6" fill="#4B5563" />
                    </marker>
                </defs>
            </svg>

            {/* Legend */}
            <div className="flex items-center gap-6 p-4 border-t border-gray-800 text-xs text-gray-400">
                <span className="font-medium">Status:</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-600"></span> Not Started</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> In Progress</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span> Done</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Blocked</span>
                <span className="ml-4 font-medium">Priority:</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 border-l-2 border-l-red-500 bg-gray-700"></span> P0</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 border-l-2 border-l-yellow-500 bg-gray-700"></span> P1</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 border-l-2 border-l-gray-500 bg-gray-700"></span> P2</span>
            </div>
            </div>
        </div>
    );
}
