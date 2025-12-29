'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    Info,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from '@/lib/notifications';
import { useNotifications } from '@/hooks/use-notifications';

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Info; color: string; bgColor: string }> = {
    info: { icon: Info, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    success: { icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    error: { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-500/10' },
    update: { icon: RefreshCw, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
};

export function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const {
        notifications,
        unreadCount,
        markRead,
        markAllRead,
        remove,
        clearAll,
    } = useNotifications();

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markRead(notification.id);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="relative p-2"
                >
                    <Bell className="w-5 h-5 text-gray-400" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-96 bg-gray-900 border-gray-700 p-0"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-white">Notifications</span>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllRead}
                                className="text-xs text-gray-400 hover:text-white h-7 px-2"
                            >
                                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                                Mark all read
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAll}
                                className="text-xs text-gray-400 hover:text-red-400 h-7 px-2"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notifications list */}
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                            <p className="text-gray-500 text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {notifications.map((notification) => {
                                const config = TYPE_CONFIG[notification.type];
                                const Icon = config.icon;

                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            'flex gap-3 p-3 cursor-pointer transition-colors',
                                            notification.read
                                                ? 'hover:bg-gray-800/50'
                                                : 'bg-gray-800/30 hover:bg-gray-800/50'
                                        )}
                                    >
                                        {/* Icon */}
                                        <div
                                            className={cn(
                                                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                                                config.bgColor
                                            )}
                                        >
                                            <Icon className={cn('w-4 h-4', config.color)} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    'text-sm font-medium truncate',
                                                    notification.read ? 'text-gray-300' : 'text-white'
                                                )}>
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    remove(notification.id);
                                                }}
                                                className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
