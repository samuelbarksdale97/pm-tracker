'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Story, TeamMember } from '@/lib/supabase';

interface TaskCardProps {
    story: Story;
    teamMembers?: TeamMember[];
    onClick?: () => void;
    isDragging?: boolean;
    showWorkstream?: boolean;
    compact?: boolean;
    className?: string;
}

const statusColors: Record<string, string> = {
    'Not Started': 'border-l-gray-500',
    'In Progress': 'border-l-blue-500',
    'Done': 'border-l-green-500',
    'Blocked': 'border-l-red-500',
    'On Hold': 'border-l-amber-500',
};

const priorityStyles: Record<string, { bg: string; text: string }> = {
    'P0': { bg: 'bg-red-600', text: 'text-white' },
    'P1': { bg: 'bg-amber-500', text: 'text-black' },
    'P2': { bg: 'bg-gray-600', text: 'text-white' },
};

const statusDotColors: Record<string, string> = {
    'Not Started': 'bg-gray-500',
    'In Progress': 'bg-blue-500',
    'Done': 'bg-green-500',
    'Blocked': 'bg-red-500',
    'On Hold': 'bg-amber-500',
};

export function TaskCard({
    story,
    teamMembers,
    onClick,
    isDragging = false,
    showWorkstream = true,
    compact = false,
    className,
}: TaskCardProps) {
    const owner = teamMembers?.find(tm => tm.id === story.owner_id);
    const priorityStyle = priorityStyles[story.priority] || priorityStyles['P2'];

    return (
        <Card
            className={cn(
                'bg-gray-800 border-gray-700 border-l-4 transition-all',
                statusColors[story.status],
                onClick && 'cursor-pointer hover:border-gray-600 hover:bg-gray-750',
                isDragging && 'opacity-50 rotate-2 shadow-xl',
                compact ? 'p-2' : 'p-3',
                className
            )}
            onClick={onClick}
        >
            {/* Header: ID + Priority + Status */}
            <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono text-gray-500">{story.id}</span>
                <div className="flex items-center gap-1.5">
                    <Badge className={cn('text-xs px-1.5 py-0', priorityStyle.bg, priorityStyle.text)}>
                        {story.priority}
                    </Badge>
                    <span className={cn('w-2 h-2 rounded-full', statusDotColors[story.status])} />
                </div>
            </div>

            {/* Name */}
            <p className={cn(
                'text-sm text-gray-200 mb-2',
                compact ? 'line-clamp-1' : 'line-clamp-2'
            )}>
                {story.name}
            </p>

            {/* Footer: Estimate + Owner */}
            <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                    {story.estimate && (
                        <span className="bg-gray-700 px-1.5 py-0.5 rounded">
                            {story.estimate}
                        </span>
                    )}
                    {showWorkstream && story.workstream_id && (
                        <span className="truncate max-w-[80px]">
                            {story.workstream_id}
                        </span>
                    )}
                </div>
                {owner && (
                    <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white">
                            {owner.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                )}
            </div>

            {/* Dependencies indicator */}
            {story.dependencies && story.dependencies.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                    <span className="text-xs text-gray-500">
                        ⛓️ {story.dependencies.length} {story.dependencies.length === 1 ? 'dependency' : 'dependencies'}
                    </span>
                </div>
            )}
        </Card>
    );
}

// Mini card variant for lists and compact views
interface MiniTaskCardProps {
    story: Story;
    onClick?: () => void;
    className?: string;
}

export function MiniTaskCard({ story, onClick, className }: MiniTaskCardProps) {
    const priorityStyle = priorityStyles[story.priority] || priorityStyles['P2'];

    return (
        <div
            className={cn(
                'flex items-center gap-2 p-2 bg-gray-800 rounded border border-gray-700 transition-colors',
                onClick && 'cursor-pointer hover:bg-gray-750 hover:border-gray-600',
                className
            )}
            onClick={onClick}
        >
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDotColors[story.status])} />
            <span className="text-xs font-mono text-gray-500 flex-shrink-0">{story.id}</span>
            <span className="text-sm text-gray-300 truncate flex-1">{story.name}</span>
            <Badge className={cn('text-xs px-1 py-0 flex-shrink-0', priorityStyle.bg, priorityStyle.text)}>
                {story.priority}
            </Badge>
        </div>
    );
}
