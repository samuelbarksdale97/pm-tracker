'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Check,
    Pencil,
    Search,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Assumption, AssumptionCategory } from '@/lib/ai/platform-prompts';

// Status configuration
const STATUS_CONFIG = {
    ready: {
        label: 'Ready to Execute',
        icon: CheckCircle2,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        description: 'All assumptions are reasonable—proceed confidently'
    },
    review: {
        label: 'Quick Review',
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        description: '1-2 items need your attention before starting'
    },
    research: {
        label: 'Research Needed',
        icon: Search,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        description: 'Key decisions need clarification'
    },
    notReady: {
        label: 'Not Ready',
        icon: XCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        description: 'Too many unknowns—add more context first'
    },
};

const CATEGORY_LABELS: Record<AssumptionCategory, { label: string; emoji: string }> = {
    architecture: { label: 'Architecture', emoji: '🏗️' },
    permissions: { label: 'Permissions', emoji: '🔒' },
    data_model: { label: 'Data Model', emoji: '📊' },
    performance: { label: 'Performance', emoji: '⚡' },
    integration: { label: 'Integration', emoji: '🔗' },
    ux: { label: 'UX', emoji: '🎨' },
    security: { label: 'Security', emoji: '🛡️' },
    infrastructure: { label: 'Infrastructure', emoji: '☁️' },
};

interface AssumptionState {
    status: 'pending' | 'confirmed' | 'overridden' | 'researching';
    overrideValue?: string;
}

interface ConfidencePanelProps {
    assumptions: Assumption[];
    overallConfidence: number;
    onAssumptionsResolved?: (allResolved: boolean) => void;
}

export function ConfidencePanel({
    assumptions,
    overallConfidence,
    onAssumptionsResolved
}: ConfidencePanelProps) {
    const [assumptionStates, setAssumptionStates] = useState<Map<number, AssumptionState>>(new Map());
    const [expandedAssumptions, setExpandedAssumptions] = useState<Set<number>>(new Set());

    // Determine overall status
    const status = useMemo(() => {
        if (overallConfidence >= 80) return 'ready';
        if (overallConfidence >= 60) return 'review';
        if (overallConfidence >= 40) return 'research';
        return 'notReady';
    }, [overallConfidence]);

    // Get blockers (MEDIUM or LOW confidence not yet confirmed)
    const blockers = useMemo(() => {
        return assumptions
            .map((a, i) => ({ assumption: a, index: i }))
            .filter(({ assumption, index }) => {
                const state = assumptionStates.get(index);
                if (state?.status === 'confirmed' || state?.status === 'overridden') return false;
                return assumption.confidence !== 'HIGH';
            });
    }, [assumptions, assumptionStates]);

    // Group assumptions by category
    const byCategory = useMemo(() => {
        const grouped = new Map<AssumptionCategory, { assumptions: (Assumption & { index: number })[]; confidence: number }>();

        assumptions.forEach((a, i) => {
            const cat = a.category || 'architecture';
            if (!grouped.has(cat)) {
                grouped.set(cat, { assumptions: [], confidence: 0 });
            }
            grouped.get(cat)!.assumptions.push({ ...a, index: i });
        });

        // Calculate confidence per category
        grouped.forEach((data) => {
            const highCount = data.assumptions.filter(a => {
                const state = assumptionStates.get(a.index);
                return a.confidence === 'HIGH' || state?.status === 'confirmed' || state?.status === 'overridden';
            }).length;
            data.confidence = Math.round((highCount / data.assumptions.length) * 100);
        });

        return grouped;
    }, [assumptions, assumptionStates]);

    // Calculate resolved confidence
    const resolvedConfidence = useMemo(() => {
        let highCount = 0;
        assumptions.forEach((a, i) => {
            const state = assumptionStates.get(i);
            if (a.confidence === 'HIGH' || state?.status === 'confirmed' || state?.status === 'overridden') {
                highCount++;
            }
        });
        return Math.round((highCount / assumptions.length) * 100);
    }, [assumptions, assumptionStates]);

    const handleConfirm = (index: number) => {
        setAssumptionStates(prev => new Map(prev).set(index, { status: 'confirmed' }));
        checkAllResolved();
    };

    const handleOverride = (index: number, value: string) => {
        setAssumptionStates(prev => new Map(prev).set(index, { status: 'overridden', overrideValue: value }));
        checkAllResolved();
    };

    const handleResearch = (index: number) => {
        setAssumptionStates(prev => new Map(prev).set(index, { status: 'researching' }));
        setExpandedAssumptions(prev => new Set(prev).add(index));
    };

    const toggleExpanded = (index: number) => {
        setExpandedAssumptions(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const checkAllResolved = () => {
        const allResolved = assumptions.every((a, i) => {
            const state = assumptionStates.get(i);
            return a.confidence === 'HIGH' || state?.status === 'confirmed' || state?.status === 'overridden';
        });
        onAssumptionsResolved?.(allResolved);
    };

    const statusConfig = STATUS_CONFIG[status];
    const StatusIcon = statusConfig.icon;

    return (
        <Card className={cn("p-4", statusConfig.bgColor, statusConfig.borderColor)}>
            {/* Status Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <StatusIcon className={cn("w-6 h-6", statusConfig.color)} />
                    <div>
                        <h5 className={cn("font-semibold", statusConfig.color)}>
                            {statusConfig.label}
                        </h5>
                        <p className="text-xs text-gray-400">{statusConfig.description}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">{resolvedConfidence}%</div>
                    <p className="text-xs text-gray-400">resolved</p>
                </div>
            </div>

            {/* Blocker Summary */}
            {blockers.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-gray-800/60 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-400">
                            {blockers.length} item{blockers.length > 1 ? 's' : ''} need your input
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {blockers.map(({ assumption, index }) => (
                            <button
                                key={index}
                                onClick={() => toggleExpanded(index)}
                                className={cn(
                                    "text-xs px-2 py-1 rounded-full",
                                    assumption.confidence === 'LOW'
                                        ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                        : "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
                                )}
                            >
                                {assumption.topic}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Category Summary - Only show categories needing attention */}
            {(() => {
                const categoriesNeedingAttention = Array.from(byCategory.entries())
                    .filter(([, data]) => data.confidence < 100)
                    .sort((a, b) => a[1].confidence - b[1].confidence);

                const allCategoriesConfident = categoriesNeedingAttention.length === 0;

                if (allCategoriesConfident && assumptions.length > 0) {
                    return (
                        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>All {assumptions.length} assumptions are high confidence</span>
                            </div>
                        </div>
                    );
                }

                if (categoriesNeedingAttention.length > 0) {
                    return (
                        <div className="mb-4 space-y-2">
                            <h6 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                Areas Needing Review
                            </h6>
                            <div className="flex flex-wrap gap-2">
                                {categoriesNeedingAttention.map(([category, data]) => {
                                    const catConfig = CATEGORY_LABELS[category];
                                    const needsReview = data.assumptions.filter(a => a.confidence !== 'HIGH').length;
                                    return (
                                        <div
                                            key={category}
                                            className={cn(
                                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm",
                                                data.confidence < 50
                                                    ? "bg-red-500/15 border border-red-500/30 text-red-300"
                                                    : "bg-yellow-500/15 border border-yellow-500/30 text-yellow-300"
                                            )}
                                        >
                                            <span>{catConfig.emoji}</span>
                                            <span>{catConfig.label}</span>
                                            <span className="text-xs opacity-70">({needsReview})</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                }

                return null;
            })()}

            {/* Assumption Cards */}
            <div className="space-y-2">
                <h6 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    All Assumptions ({assumptions.length})
                </h6>
                {assumptions.map((assumption, index) => (
                    <AssumptionCard
                        key={index}
                        assumption={assumption}
                        index={index}
                        state={assumptionStates.get(index)}
                        isExpanded={expandedAssumptions.has(index)}
                        onToggle={() => toggleExpanded(index)}
                        onConfirm={() => handleConfirm(index)}
                        onOverride={(value) => handleOverride(index, value)}
                        onResearch={() => handleResearch(index)}
                    />
                ))}
            </div>
        </Card>
    );
}

// Individual Assumption Card
function AssumptionCard({
    assumption,
    index,
    state,
    isExpanded,
    onToggle,
    onConfirm,
    onOverride,
    onResearch,
}: {
    assumption: Assumption;
    index: number;
    state?: AssumptionState;
    isExpanded: boolean;
    onToggle: () => void;
    onConfirm: () => void;
    onOverride: (value: string) => void;
    onResearch: () => void;
}) {
    const [overrideInput, setOverrideInput] = useState('');
    const [showOverride, setShowOverride] = useState(false);

    const isResolved = state?.status === 'confirmed' || state?.status === 'overridden';
    const needsAction = assumption.confidence !== 'HIGH' && !isResolved;

    return (
        <div className={cn(
            "rounded-lg border transition-all",
            isResolved
                ? "bg-green-500/5 border-green-500/20"
                : needsAction
                    ? "bg-gray-800/80 border-gray-700 hover:border-gray-600"
                    : "bg-gray-800/40 border-gray-700/50"
        )}>
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full p-3 flex items-start gap-2 text-left"
            >
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                )}

                <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0",
                    isResolved ? "bg-green-500/20 text-green-400" :
                        assumption.confidence === 'HIGH' ? "bg-green-500/20 text-green-400" :
                            assumption.confidence === 'MEDIUM' ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-red-500/20 text-red-400"
                )}>
                    {isResolved ? '✓' : assumption.confidence}
                </span>

                <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">
                        {assumption.topic}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                        {assumption.decision}
                    </p>
                </div>

                {state?.status === 'researching' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                        Researching
                    </span>
                )}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                    {/* Decision Details */}
                    <div className="pl-6 space-y-2">
                        <div>
                            <span className="text-xs text-gray-500">Decision:</span>
                            <p className="text-sm text-white">{assumption.decision}</p>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500">Rationale:</span>
                            <p className="text-sm text-gray-300">{assumption.rationale}</p>
                        </div>
                        {assumption.alternatives && assumption.alternatives.length > 0 && (
                            <div>
                                <span className="text-xs text-gray-500">Alternatives considered:</span>
                                <p className="text-sm text-gray-400">{assumption.alternatives.join(', ')}</p>
                            </div>
                        )}
                    </div>

                    {/* Research Prompts (for MEDIUM/LOW) */}
                    {needsAction && (assumption.unknowns || assumption.questions_to_ask || assumption.where_to_look) && (
                        <div className="pl-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
                            <div className="flex items-center gap-2">
                                <Search className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-medium text-blue-400">Research Guide</span>
                            </div>

                            {assumption.unknowns && assumption.unknowns.length > 0 && (
                                <div>
                                    <span className="text-xs font-medium text-gray-400">UNKNOWNS</span>
                                    <ul className="mt-1 space-y-1">
                                        {assumption.unknowns.map((u, i) => (
                                            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                                <HelpCircle className="w-3 h-3 text-blue-400 mt-1 flex-shrink-0" />
                                                {u}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {assumption.questions_to_ask && assumption.questions_to_ask.length > 0 && (
                                <div>
                                    <span className="text-xs font-medium text-gray-400">QUESTIONS TO ASK</span>
                                    <ol className="mt-1 space-y-1 list-decimal list-inside">
                                        {assumption.questions_to_ask.map((q, i) => (
                                            <li key={i} className="text-sm text-gray-300">{q}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {assumption.where_to_look && assumption.where_to_look.length > 0 && (
                                <div>
                                    <span className="text-xs font-medium text-gray-400">WHERE TO LOOK</span>
                                    <ul className="mt-1 space-y-1">
                                        {assumption.where_to_look.map((w, i) => (
                                            <li key={i} className="text-sm text-gray-300">• {w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {assumption.risk_if_skipped && (
                                <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                    <span className="text-xs font-medium text-red-400">⚠️ RISK IF SKIPPED</span>
                                    <p className="text-sm text-red-300 mt-1">{assumption.risk_if_skipped}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Override Input */}
                    {showOverride && (
                        <div className="pl-6 space-y-2">
                            <input
                                type="text"
                                value={overrideInput}
                                onChange={(e) => setOverrideInput(e.target.value)}
                                placeholder="Enter your decision..."
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        if (overrideInput.trim()) {
                                            onOverride(overrideInput);
                                            setShowOverride(false);
                                        }
                                    }}
                                    disabled={!overrideInput.trim()}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    Save Override
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowOverride(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!isResolved && !showOverride && (
                        <div className="pl-6 flex gap-2 flex-wrap">
                            <Button
                                size="sm"
                                onClick={onConfirm}
                                className="gap-1 bg-green-600 hover:bg-green-700"
                            >
                                <Check className="w-3 h-3" />
                                Confirm
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowOverride(true)}
                                className="gap-1"
                            >
                                <Pencil className="w-3 h-3" />
                                Override
                            </Button>
                            {needsAction && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onResearch}
                                    className="gap-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                >
                                    <Search className="w-3 h-3" />
                                    I Need to Research
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Resolved State */}
                    {isResolved && (
                        <div className="pl-6 flex items-center gap-2 text-sm text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            {state?.status === 'confirmed' ? 'Confirmed' : `Overridden: ${state?.overrideValue}`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
