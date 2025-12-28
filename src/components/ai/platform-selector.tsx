'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PLATFORM_CONFIG, type PlatformId } from '@/lib/ai/platform-prompts';

interface PlatformSelectorProps {
    selectedPlatforms: PlatformId[];
    onSelectionChange: (platforms: PlatformId[]) => void;
    disabled?: boolean;
}

export function PlatformSelector({
    selectedPlatforms,
    onSelectionChange,
    disabled = false,
}: PlatformSelectorProps) {
    const platforms = Object.values(PLATFORM_CONFIG);

    const togglePlatform = (platformId: PlatformId) => {
        if (disabled) return;

        if (selectedPlatforms.includes(platformId)) {
            onSelectionChange(selectedPlatforms.filter(p => p !== platformId));
        } else {
            onSelectionChange([...selectedPlatforms, platformId]);
        }
    };

    const selectAll = () => {
        if (disabled) return;
        onSelectionChange(['A', 'B', 'C', 'D']);
    };

    const clearAll = () => {
        if (disabled) return;
        onSelectionChange([]);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                    Select platforms to generate specs for:
                </label>
                <div className="flex gap-2 text-xs">
                    <button
                        onClick={selectAll}
                        disabled={disabled}
                        className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                    >
                        Select All
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                        onClick={clearAll}
                        disabled={disabled}
                        className="text-gray-400 hover:text-gray-300 disabled:opacity-50"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {platforms.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform.id as PlatformId);
                    return (
                        <button
                            key={platform.id}
                            onClick={() => togglePlatform(platform.id as PlatformId)}
                            disabled={disabled}
                            className={cn(
                                'flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                                'hover:border-opacity-70 disabled:opacity-50 disabled:cursor-not-allowed',
                                isSelected
                                    ? 'border-opacity-100 bg-opacity-10'
                                    : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                            )}
                            style={{
                                borderColor: isSelected ? platform.color : undefined,
                                backgroundColor: isSelected ? `${platform.color}15` : undefined,
                            }}
                        >
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-lg flex items-center justify-center text-xl',
                                    isSelected ? 'opacity-100' : 'opacity-50'
                                )}
                                style={{ backgroundColor: `${platform.color}30` }}
                            >
                                {platform.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        'font-medium',
                                        isSelected ? 'text-white' : 'text-gray-400'
                                    )}>
                                        {platform.name}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-xs',
                                            isSelected
                                                ? 'border-current'
                                                : 'border-gray-600 text-gray-500'
                                        )}
                                        style={{ color: isSelected ? platform.color : undefined }}
                                    >
                                        {platform.id}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {platform.description}
                                </p>
                            </div>
                            <div className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                                isSelected
                                    ? 'border-current bg-current'
                                    : 'border-gray-600'
                            )}
                                style={{ borderColor: isSelected ? platform.color : undefined }}
                            >
                                {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedPlatforms.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Selected:</span>
                    <div className="flex gap-1">
                        {selectedPlatforms.map(p => {
                            const config = PLATFORM_CONFIG[p];
                            return (
                                <span
                                    key={p}
                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                    style={{
                                        backgroundColor: `${config.color}20`,
                                        color: config.color,
                                    }}
                                >
                                    {config.icon} {config.name}
                                </span>
                            );
                        })}
                    </div>
                    {selectedPlatforms.length > 1 && (
                        <span className="text-gray-500 ml-2">
                            + Integration Strategy
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
