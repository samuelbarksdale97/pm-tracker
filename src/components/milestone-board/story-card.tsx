'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CheckSquare, Square, User } from 'lucide-react';
import { StoryCardProps, personaIcons, personaColors, statusDotColors, priorityColors } from './types';

export function StoryCard({
    story,
    milestones,
    onMove,
    bulkMode,
    isSelected,
    onToggleSelect,
    disabled
}: StoryCardProps) {
    const PersonaIcon = personaIcons[story.persona] || User;

    return (
        <Card
            className={`bg-gray-800 border-gray-700 p-3 transition-colors ${disabled ? 'opacity-60' : 'hover:border-gray-600'} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            onClick={bulkMode ? onToggleSelect : undefined}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    {bulkMode && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelect?.();
                            }}
                            className="flex-shrink-0"
                        >
                            {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-400" />
                            ) : (
                                <Square className="w-4 h-4 text-gray-500" />
                            )}
                        </button>
                    )}
                    <PersonaIcon className={`w-3 h-3 flex-shrink-0 ${personaColors[story.persona]}`} />
                    <span className="text-xs font-mono text-gray-500 truncate">{story.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge className={`text-xs px-1.5 py-0 ${priorityColors[story.priority]}`}>
                        {story.priority}
                    </Badge>
                    <span className={`w-2 h-2 rounded-full ${statusDotColors[story.status]}`} />
                </div>
            </div>
            <p className="text-sm text-gray-200 mb-2 line-clamp-2">{story.narrative}</p>
            <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs text-gray-500 border-gray-700">
                    {story.feature_area}
                </Badge>
                {!bulkMode && onMove && !disabled && (
                    <Select
                        value={story.milestone_id || 'backlog'}
                        onValueChange={(value) => onMove(story.id, value === 'backlog' ? null : value)}
                    >
                        <SelectTrigger className="h-6 w-24 text-xs bg-transparent border-gray-700 text-gray-400">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800">
                            <SelectItem value="backlog" className="text-xs">Backlog</SelectItem>
                            {milestones.map(m => (
                                <SelectItem key={m.id} value={m.id} className="text-xs">
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </Card>
    );
}
