'use client';

import { AlertTriangle, CheckCircle2, AlertCircle, HelpCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CapacityAnalysis, CapacityStatus, getCapacityStatusColors } from '@/lib/capacity-utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface CapacityIndicatorProps {
    analysis: CapacityAnalysis;
    compact?: boolean;
    showDetails?: boolean;
}

const STATUS_ICONS: Record<CapacityStatus, typeof CheckCircle2> = {
    healthy: CheckCircle2,
    tight: AlertTriangle,
    overloaded: AlertCircle,
    unknown: HelpCircle,
};

export function CapacityIndicator({
    analysis,
    compact = false,
    showDetails = true,
}: CapacityIndicatorProps) {
    const colors = getCapacityStatusColors(analysis.status);
    const Icon = STATUS_ICONS[analysis.status];

    if (compact) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div
                            className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                                colors.bg,
                                colors.border,
                                'border'
                            )}
                        >
                            <Users className={cn('w-3 h-3', colors.icon)} />
                            <span className={colors.text}>
                                {analysis.loadPercentage}%
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent
                        side="top"
                        className="bg-gray-800 border-gray-700 text-gray-100 max-w-xs"
                    >
                        <CapacityDetails analysis={analysis} />
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <div
            className={cn(
                'rounded-lg border p-3',
                colors.bg,
                colors.border
            )}
        >
            <div className="flex items-start gap-2">
                <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', colors.icon)} />
                <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium', colors.text)}>
                        {analysis.message}
                    </div>
                    {showDetails && <CapacityDetails analysis={analysis} />}
                </div>
            </div>
        </div>
    );
}

function CapacityDetails({ analysis }: { analysis: CapacityAnalysis }) {
    if (analysis.status === 'unknown') {
        return (
            <p className="text-xs text-gray-400 mt-1">
                Set a target date to see capacity analysis
            </p>
        );
    }

    return (
        <div className="text-xs text-gray-400 mt-1 space-y-0.5">
            <p>
                <span className="text-gray-300">{analysis.remainingStories}</span> stories remaining
                {analysis.daysRemaining > 0 && (
                    <>
                        {' '} in <span className="text-gray-300">{analysis.daysRemaining}</span> days
                        {' '}(<span className="text-gray-300">{analysis.businessDaysRemaining}</span> business days)
                    </>
                )}
            </p>
            {analysis.expectedCapacity > 0 && (
                <p>
                    Expected capacity: <span className="text-gray-300">{analysis.expectedCapacity}</span> stories
                    {' '}@ {analysis.storiesPerWeek}/week
                </p>
            )}
            {analysis.status === 'overloaded' && analysis.remainingStories > analysis.expectedCapacity && (
                <p className="text-red-400">
                    Consider extending deadline or reducing scope by{' '}
                    <span className="font-medium">
                        {analysis.remainingStories - analysis.expectedCapacity}
                    </span>{' '}
                    stories
                </p>
            )}
        </div>
    );
}
