'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to sync state with URL search params
 * This allows state to persist across tab switches and page refreshes
 */
export function useUrlState<T extends string>(
    key: string,
    defaultValue: T
): [T, (value: T | null) => void] {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Get initial value from URL or use default
    const urlValue = searchParams.get(key) as T | null;
    const [value, setValue] = useState<T>(urlValue ?? defaultValue);

    // Sync with URL changes (e.g., browser back/forward)
    useEffect(() => {
        const urlValue = searchParams.get(key) as T | null;
        const effectiveValue = urlValue ?? defaultValue;
        if (effectiveValue !== value) {
            setValue(effectiveValue);
        }
    }, [searchParams, key, value, defaultValue]);

    // Update both state and URL
    const setValueWithUrl = useCallback((newValue: T | null) => {
        const effectiveValue = newValue ?? defaultValue;

        // Always update local state immediately
        setValue(effectiveValue);

        // Update URL
        const params = new URLSearchParams(searchParams.toString());

        if (newValue === null || newValue === defaultValue) {
            params.delete(key);
        } else {
            params.set(key, newValue);
        }

        const newUrl = params.toString()
            ? `${pathname}?${params.toString()}`
            : pathname;

        // Use replace to avoid adding to history for every selection change
        router.replace(newUrl, { scroll: false });
    }, [searchParams, pathname, router, key, defaultValue]);

    return [value, setValueWithUrl];
}

/**
 * Hook to sync nullable state with URL search params
 */
export function useUrlStateNullable(
    key: string
): [string | null, (value: string | null) => void] {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Get initial value from URL
    const urlValue = searchParams.get(key);
    const [value, setValue] = useState<string | null>(urlValue);

    // Sync with URL changes
    useEffect(() => {
        const urlValue = searchParams.get(key);
        if (urlValue !== value) {
            setValue(urlValue);
        }
    }, [searchParams, key, value]);

    // Update both state and URL
    const setValueWithUrl = useCallback((newValue: string | null) => {
        const params = new URLSearchParams(searchParams.toString());

        if (newValue === null) {
            params.delete(key);
        } else {
            params.set(key, newValue);
        }

        const newUrl = params.toString()
            ? `${pathname}?${params.toString()}`
            : pathname;

        router.replace(newUrl, { scroll: false });
        setValue(newValue);
    }, [searchParams, pathname, router, key]);

    return [value, setValueWithUrl];
}

/**
 * Hook to get all Miller column selections from URL
 */
export function useMillerUrlState() {
    const [epicId, setEpicId] = useUrlStateNullable('epic');
    const [featureId, setFeatureId] = useUrlStateNullable('feature');
    const [storyId, setStoryId] = useUrlStateNullable('story');

    // When epic changes, clear downstream selections
    const handleSelectEpic = useCallback((id: string) => {
        setEpicId(id);
        // Don't clear feature/story here - let the component handle it
        // This allows URL to be the source of truth on initial load
    }, [setEpicId]);

    // When feature changes, clear downstream selections
    const handleSelectFeature = useCallback((id: string | null) => {
        setFeatureId(id);
        if (id === null) {
            setStoryId(null);
        }
    }, [setFeatureId, setStoryId]);

    const handleSelectStory = useCallback((id: string | null) => {
        setStoryId(id);
    }, [setStoryId]);

    return {
        epicId,
        featureId,
        storyId,
        setEpicId: handleSelectEpic,
        setFeatureId: handleSelectFeature,
        setStoryId: handleSelectStory,
    };
}
