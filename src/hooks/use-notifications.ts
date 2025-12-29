'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Notification,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
} from '@/lib/notifications';

interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    markRead: (id: string) => void;
    markAllRead: () => void;
    remove: (id: string) => void;
    clearAll: () => void;
    refresh: () => void;
}

export function useNotifications(): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const refresh = useCallback(() => {
        setNotifications(getNotifications());
        setUnreadCount(getUnreadCount());
    }, []);

    // Initial load
    useEffect(() => {
        refresh();
    }, [refresh]);

    // Listen for new notifications
    useEffect(() => {
        const handleNewNotification = () => {
            refresh();
        };

        window.addEventListener('pm-tracker-notification', handleNewNotification);
        return () => {
            window.removeEventListener('pm-tracker-notification', handleNewNotification);
        };
    }, [refresh]);

    const markRead = useCallback((id: string) => {
        markAsRead(id);
        refresh();
    }, [refresh]);

    const markAllRead = useCallback(() => {
        markAllAsRead();
        refresh();
    }, [refresh]);

    const remove = useCallback((id: string) => {
        deleteNotification(id);
        refresh();
    }, [refresh]);

    const clearAll = useCallback(() => {
        clearAllNotifications();
        refresh();
    }, [refresh]);

    return {
        notifications,
        unreadCount,
        markRead,
        markAllRead,
        remove,
        clearAll,
        refresh,
    };
}
