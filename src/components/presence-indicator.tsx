'use client';

import { useState } from 'react';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PresenceUser } from '@/lib/presence';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface PresenceIndicatorProps {
    users: PresenceUser[];
    isConnected: boolean;
    maxAvatars?: number;
}

export function PresenceIndicator({
    users,
    isConnected,
    maxAvatars = 4,
}: PresenceIndicatorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const visibleUsers = users.slice(0, maxAvatars);
    const remainingCount = users.length - maxAvatars;

    if (!isConnected && users.length === 0) {
        return (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
            </div>
        );
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                    {/* Connection status */}
                    <div className="flex items-center gap-1.5">
                        {isConnected ? (
                            <Wifi className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                            <WifiOff className="w-3.5 h-3.5 text-gray-500" />
                        )}
                    </div>

                    {/* User avatars */}
                    {users.length > 0 ? (
                        <div className="flex items-center -space-x-2">
                            {visibleUsers.map((user) => (
                                <TooltipProvider key={user.id}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-gray-900',
                                                    user.isEditing && 'ring-2 ring-amber-400'
                                                )}
                                                style={{ backgroundColor: user.color }}
                                            >
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-gray-800 border-gray-700">
                                            <p>{user.name}</p>
                                            {user.isEditing && (
                                                <p className="text-amber-400 text-xs">Editing</p>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ))}

                            {remainingCount > 0 && (
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-gray-300 bg-gray-700 border-2 border-gray-900">
                                    +{remainingCount}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs text-gray-500">Just you</span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-64 bg-gray-900 border-gray-700 p-0"
            >
                <div className="p-3 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-white">
                            {users.length} {users.length === 1 ? 'person' : 'people'} online
                        </span>
                    </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {users.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No one else is viewing right now
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800"
                                >
                                    <div
                                        className={cn(
                                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white',
                                            user.isEditing && 'ring-2 ring-amber-400'
                                        )}
                                        style={{ backgroundColor: user.color }}
                                    >
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-white truncate">
                                            {user.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {user.isEditing ? (
                                                <span className="text-amber-400">Editing</span>
                                            ) : user.viewingItemType ? (
                                                `Viewing ${user.viewingItemType}`
                                            ) : (
                                                'Online'
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Small inline indicator for showing on items (e.g., stories, epics)
interface ItemPresenceProps {
    users: PresenceUser[];
    itemId: string;
}

export function ItemPresence({ users, itemId }: ItemPresenceProps) {
    const itemUsers = users.filter(u => u.viewingItemId === itemId);

    if (itemUsers.length === 0) return null;

    return (
        <div className="flex items-center -space-x-1">
            {itemUsers.slice(0, 3).map((user) => (
                <TooltipProvider key={user.id}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className={cn(
                                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white border border-gray-900',
                                    user.isEditing && 'ring-1 ring-amber-400'
                                )}
                                style={{ backgroundColor: user.color }}
                            >
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 border-gray-700">
                            <p className="text-xs">{user.name}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ))}
            {itemUsers.length > 3 && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-gray-400 bg-gray-700 border border-gray-900">
                    +{itemUsers.length - 3}
                </div>
            )}
        </div>
    );
}
