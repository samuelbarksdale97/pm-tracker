'use client';

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { getAIMetricsSummary } from '@/lib/ai-metrics';
import { cn } from '@/lib/utils';

export function AIMetricsWidget() {
    const [metrics, setMetrics] = useState<ReturnType<typeof getAIMetricsSummary> | null>(null);

    useEffect(() => {
        // Load metrics on mount
        setMetrics(getAIMetricsSummary());

        // Refresh every 30 seconds
        const interval = setInterval(() => {
            setMetrics(getAIMetricsSummary());
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    if (!metrics) return null;

    const hasData = metrics.totalGenerations > 0;

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">AI Generation Metrics</h3>
            </div>

            {!hasData ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                    No AI generations yet. Use the AI Generate feature to create user stories.
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {/* Total Generations */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span className="text-xs">Generations</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {metrics.totalGenerations}
                        </div>
                        {metrics.todayGenerations > 0 && (
                            <div className="text-xs text-blue-400 mt-1">
                                +{metrics.todayGenerations} today
                            </div>
                        )}
                    </div>

                    {/* Total Stories */}
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span className="text-xs">Stories Created</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {metrics.totalStories}
                        </div>
                        {metrics.todayStories > 0 && (
                            <div className="text-xs text-green-400 mt-1">
                                +{metrics.todayStories} today
                            </div>
                        )}
                    </div>

                    {/* Acceptance Rate */}
                    <div className="col-span-2 bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-gray-400">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span className="text-xs">Acceptance Rate</span>
                            </div>
                            <span className={cn(
                                "text-sm font-semibold",
                                metrics.acceptanceRate >= 80 ? "text-green-400" :
                                metrics.acceptanceRate >= 50 ? "text-yellow-400" : "text-red-400"
                            )}>
                                {metrics.acceptanceRate}%
                            </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full transition-all rounded-full",
                                    metrics.acceptanceRate >= 80 ? "bg-green-500" :
                                    metrics.acceptanceRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                                )}
                                style={{ width: `${metrics.acceptanceRate}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>Stories accepted from AI suggestions</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
