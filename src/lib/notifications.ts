/**
 * In-app notifications system
 * Stores and manages notifications in localStorage
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'update';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    link?: string; // Optional link to navigate to
    metadata?: Record<string, unknown>;
}

const STORAGE_KEY = 'pm-tracker-notifications';
const MAX_NOTIFICATIONS = 50;

/**
 * Get all notifications
 */
export function getNotifications(): Notification[] {
    if (typeof window === 'undefined') return [];

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return [];
        return JSON.parse(saved) as Notification[];
    } catch {
        return [];
    }
}

/**
 * Get unread notifications count
 */
export function getUnreadCount(): number {
    return getNotifications().filter(n => !n.read).length;
}

/**
 * Add a new notification
 */
export function addNotification(
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'>
): Notification {
    const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        read: false,
    };

    const notifications = getNotifications();
    notifications.unshift(newNotification);

    // Keep only the most recent notifications
    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
    saveNotifications(trimmed);

    // Dispatch custom event for real-time updates
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pm-tracker-notification', {
            detail: newNotification,
        }));
    }

    return newNotification;
}

/**
 * Mark a notification as read
 */
export function markAsRead(notificationId: string): void {
    const notifications = getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
        notifications[index].read = true;
        saveNotifications(notifications);
    }
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(): void {
    const notifications = getNotifications().map(n => ({ ...n, read: true }));
    saveNotifications(notifications);
}

/**
 * Delete a notification
 */
export function deleteNotification(notificationId: string): void {
    const notifications = getNotifications().filter(n => n.id !== notificationId);
    saveNotifications(notifications);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
    saveNotifications([]);
}

/**
 * Save notifications to localStorage
 */
function saveNotifications(notifications: Notification[]): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
        console.error('Failed to save notifications');
    }
}

// Helper functions to create common notifications
export const notify = {
    storyCreated: (storyName: string, epicName?: string) => addNotification({
        type: 'success',
        title: 'Story Created',
        message: `"${storyName}" was added${epicName ? ` to ${epicName}` : ''}`,
    }),

    storyStatusChanged: (storyName: string, newStatus: string) => addNotification({
        type: 'update',
        title: 'Status Updated',
        message: `"${storyName}" moved to ${newStatus}`,
    }),

    goalCompleted: (goalName: string) => addNotification({
        type: 'success',
        title: 'Goal Completed!',
        message: `"${goalName}" has been completed`,
    }),

    capacityWarning: (goalName: string) => addNotification({
        type: 'warning',
        title: 'Capacity Warning',
        message: `"${goalName}" is over capacity. Consider adjusting scope or timeline.`,
    }),

    aiGenerationComplete: (count: number, featureName: string) => addNotification({
        type: 'info',
        title: 'AI Generation Complete',
        message: `Generated ${count} stories for "${featureName}"`,
    }),

    error: (title: string, message: string) => addNotification({
        type: 'error',
        title,
        message,
    }),
};
