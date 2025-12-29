/**
 * Real-time presence tracking using Supabase Realtime
 * Shows who is currently viewing/editing various items
 */

import { supabase } from './supabase';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

export interface PresenceUser {
    id: string;
    name: string;
    color: string;
    viewingItemId?: string;
    viewingItemType?: 'epic' | 'feature' | 'story' | 'goal';
    isEditing?: boolean;
    lastSeen: number;
}

export interface PresenceState {
    [key: string]: PresenceUser[];
}

// Consistent colors for users
const USER_COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#8B5CF6', // purple
    '#F59E0B', // amber
    '#EF4444', // red
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
];

// Generate a color based on user ID for consistency
export function getUserColor(userId: string): string {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return USER_COLORS[hash % USER_COLORS.length];
}

// Get or create a consistent user ID for this session
export function getSessionUserId(): string {
    if (typeof window === 'undefined') return 'server';

    let userId = sessionStorage.getItem('pm-tracker-user-id');
    if (!userId) {
        userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('pm-tracker-user-id', userId);
    }
    return userId;
}

// Get or set username
export function getSessionUserName(): string {
    if (typeof window === 'undefined') return 'Anonymous';

    let name = localStorage.getItem('pm-tracker-user-name');
    if (!name) {
        name = `User ${Math.floor(Math.random() * 1000)}`;
        localStorage.setItem('pm-tracker-user-name', name);
    }
    return name;
}

export function setSessionUserName(name: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('pm-tracker-user-name', name);
    }
}

// Create presence channel for a room (e.g., project, page)
export function createPresenceChannel(roomId: string): RealtimeChannel {
    return supabase.channel(`presence:${roomId}`, {
        config: {
            presence: {
                key: getSessionUserId(),
            },
        },
    });
}

// Track current user's presence
export function trackPresence(
    channel: RealtimeChannel,
    state: Partial<Omit<PresenceUser, 'id' | 'lastSeen'>>
): void {
    const presenceState: PresenceUser = {
        id: getSessionUserId(),
        name: state.name || getSessionUserName(),
        color: getUserColor(getSessionUserId()),
        viewingItemId: state.viewingItemId,
        viewingItemType: state.viewingItemType,
        isEditing: state.isEditing || false,
        lastSeen: Date.now(),
    };

    channel.track(presenceState);
}

// Parse presence state from Supabase format
export function parsePresenceState(state: RealtimePresenceState<PresenceUser>): PresenceUser[] {
    const users: PresenceUser[] = [];
    const currentUserId = getSessionUserId();

    Object.entries(state).forEach(([key, presences]) => {
        // Skip current user
        if (key === currentUserId) return;

        // Get the most recent presence for each user
        if (presences.length > 0) {
            const presence = presences[0] as unknown as PresenceUser;
            users.push({
                id: key,
                name: presence.name || 'Anonymous',
                color: presence.color || getUserColor(key),
                viewingItemId: presence.viewingItemId,
                viewingItemType: presence.viewingItemType,
                isEditing: presence.isEditing,
                lastSeen: presence.lastSeen || Date.now(),
            });
        }
    });

    return users;
}

// Get users viewing a specific item
export function getUsersViewingItem(
    users: PresenceUser[],
    itemId: string,
    itemType?: PresenceUser['viewingItemType']
): PresenceUser[] {
    return users.filter(user => {
        if (user.viewingItemId !== itemId) return false;
        if (itemType && user.viewingItemType !== itemType) return false;
        return true;
    });
}
