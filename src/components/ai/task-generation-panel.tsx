'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { PlatformSelector } from './platform-selector';
import { PLATFORM_CONFIG, type PlatformId, type GeneratedSpecs } from '@/lib/ai/platform-prompts';
import { Loader2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfidencePanel } from './confidence-panel';
import { OrganizedTaskView } from './organized-task-view';

interface TaskGenerationPanelProps {
    userStory: {
        id: string;
        narrative: string;
        persona: string;
        feature_area: string;
        acceptance_criteria: string[] | null;
        priority: string;
    };
    onAccept: (specs: GeneratedSpecs) => void;
    onClose: () => void;
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export function TaskGenerationPanel({
    userStory,
    onAccept,
    onClose,
}: TaskGenerationPanelProps) {
    const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);
    const [additionalContext, setAdditionalContext] = useState('');
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GeneratedSpecs | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

    const handleGenerate = async () => {
        if (selectedPlatforms.length === 0) {
            setError('Please select at least one platform');
            return;
        }

        setStatus('generating');
        setError(null);

        try {
            const response = await fetch('/api/ai/generate-specs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userStory,
                    selectedPlatforms,
                    additionalContext: additionalContext.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate specs');
            }

            setResult(data.data);
            setStatus('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setStatus('error');
        }
    };

    const toggleTask = (taskName: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskName)) {
                next.delete(taskName);
            } else {
                next.add(taskName);
            }
            return next;
        });
    };

    const handleAccept = () => {
        if (result) {
            onAccept(result);
        }
    };

    return (
        <div className="space-y-6 overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Generate Task Specs with AI</h3>
                    <p className="text-sm text-gray-400">
                        Select platforms and let AI create detailed implementation specs
                    </p>
                </div>
            </div>

            {/* User Story Preview */}
            <Card className="bg-gray-800/50 border-gray-700 p-4">
                <p className="text-sm text-gray-400 mb-1">User Story:</p>
                <p className="text-white font-medium">"{userStory.narrative}"</p>
                <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                        {userStory.persona}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                        {userStory.feature_area}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                        {userStory.priority}
                    </span>
                </div>
            </Card>

            {/* Platform Selector */}
            <PlatformSelector
                selectedPlatforms={selectedPlatforms}
                onSelectionChange={setSelectedPlatforms}
                disabled={status === 'generating'}
            />

            {/* Additional Context */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                    Additional Context (optional)
                </label>
                <Textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="Add any technical requirements, constraints, or preferences..."
                    className="bg-gray-800 border-gray-700 min-h-[80px]"
                    disabled={status === 'generating'}
                />
            </div>

            {/* Generate Button */}
            {status !== 'success' && (
                <Button
                    onClick={handleGenerate}
                    disabled={selectedPlatforms.length === 0 || status === 'generating'}
                    className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                    {status === 'generating' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating specs for {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''}...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Generate Specs for {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                        </>
                    )}
                </Button>
            )}

            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Results Preview */}
            {result && status === 'success' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-500" />
                            Generated {result.tasks.length} Tasks
                        </h4>
                        <Button variant="ghost" size="sm" onClick={handleGenerate}>
                            Regenerate
                        </Button>
                    </div>

                    {/* Organized Task View with Priority Tabs, Platform Accordion, and Waves */}
                    <OrganizedTaskView
                        tasks={result.tasks}
                        expandedTasks={expandedTasks}
                        onTaskToggle={toggleTask}
                    />

                    {/* Integration Strategy */}
                    {result.integration_strategy && (
                        <Card className="bg-gray-800/50 border-gray-700 p-4">
                            <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                                🔗 Integration Strategy
                            </h5>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <p className="text-gray-400 mb-1">API Contracts:</p>
                                    <ul className="list-disc list-inside text-gray-300">
                                        {result.integration_strategy.api_contracts.map((c, i) => (
                                            <li key={i}>{c.method} {c.endpoint}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <p className="text-gray-400 mb-1">Integration Sequence:</p>
                                    <ol className="list-decimal list-inside text-gray-300">
                                        {result.integration_strategy.integration_sequence.map((s, i) => (
                                            <li key={i}>
                                                {PLATFORM_CONFIG[s.platform].icon} {s.deliverable}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Confidence Panel - Actionable Assumptions */}
                    {result.assumptions.length > 0 && (
                        <ConfidencePanel
                            assumptions={result.assumptions}
                            overallConfidence={result.overall_confidence}
                        />
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAccept}
                            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <Check className="w-4 h-4" />
                            Accept & Save
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
