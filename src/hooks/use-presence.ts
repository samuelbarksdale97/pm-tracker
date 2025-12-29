'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
    PresenceUser,
    createPresenceChannel,
    trackPresence,
    parsePresenceState,
    getSessionUserId,
    getSessionUserName,
} from '@/lib/presence';

interface UsePresenceOptions {
    roomId: string;
    userName?: string;
}

interface UsePresenceReturn {
    users: PresenceUser[];
    currentUser: PresenceUser | null;
    isConnected: boolean;
    updatePresence: (state: Partial<Omit<PresenceUser, 'id' | 'lastSeen'>>) => void;
}

export function usePresence({ roomId, userName }: UsePresenceOptions): UsePresenceReturn {
    const [users, setUsers] = useState<PresenceUser[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState<PresenceUser | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    // Update presence state
    const updatePresence = useCallback((state: Partial<Omit<PresenceUser, 'id' | 'lastSeen'>>) => {
        if (channelRef.current) {
            trackPresence(channelRef.current, {
                name: userName || getSessionUserName(),
                ...state,
            });
        }
    }, [userName]);

    useEffect(() => {
        const channel = createPresenceChannel(roomId);
        channelRef.current = channel;

        // Handle presence sync
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState<PresenceUser>();
            const parsedUsers = parsePresenceState(state);
            setUsers(parsedUsers);
        });

        // Handle join
        channel.on('presence', { event: 'join' }, ({ newPresences }) => {
            console.log('[Presence] User joined:', newPresences);
        });

        // Handle leave
        channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
            console.log('[Presence] User left:', leftPresences);
        });

        // Subscribe and track initial presence
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                setIsConnected(true);

                // Track current user
                const user: PresenceUser = {
                    id: getSessionUserId(),
                    name: userName || getSessionUserName(),
                    color: '#3B82F6',
                    lastSeen: Date.now(),
                };
                setCurrentUser(user);

                await channel.track(user);
            }
        });

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
            setIsConnected(false);
        };
    }, [roomId, userName]);

    return {
        users,
        currentUser,
        isConnected,
        updatePresence,
    };
}
