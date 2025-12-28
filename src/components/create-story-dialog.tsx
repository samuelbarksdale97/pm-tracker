'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, AlertCircle, Package, Sparkles, CheckCircle, Lightbulb, AlertTriangle } from 'lucide-react';
import { createUserStory, UserStory, Feature, getFeatures, createFeature } from '@/lib/supabase';
import { CategorizationResult } from '@/lib/ai/story-categorizer';

interface CreateStoryDialogProps {
    projectId: string;
    workstreamId?: string;
    milestoneId?: string | null;
    /** Pre-select an epic when creating from Epic context */
    epicId?: string | null;
    /** Pre-select a feature when creating from Feature context */
    featureId?: string | null;
    /** Called when a UserStory is created */
    onUserStoryCreated?: (userStory: UserStory) => void;
}

const PERSONAS = [
    { value: 'member', label: '👤 Member' },
    { value: 'admin', label: '🛡️ Admin' },
    { value: 'staff', label: '💼 Staff' },
    { value: 'business', label: '🏢 Business' },
    { value: 'guest', label: '👥 Guest' },
];

const FEATURE_AREAS = [
    'auth',
    'events',
    'reservations',
    'analytics',
    'communications',
    'member_management',
    'billing',
    'integrations',
    'settings',
    'other',
];

const PRIORITIES = [
    { value: 'P0', label: 'P0 - Critical', color: 'bg-red-600' },
    { value: 'P1', label: 'P1 - High', color: 'bg-yellow-500' },
    { value: 'P2', label: 'P2 - Normal', color: 'bg-gray-500' },
];

export function CreateStoryDialog({
    projectId,
    milestoneId,
    epicId,
    featureId,
    onUserStoryCreated,
}: CreateStoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [narrative, setNarrative] = useState('');
    const [persona, setPersona] = useState<'member' | 'admin' | 'staff' | 'business' | 'guest'>('member');
    const [featureArea, setFeatureArea] = useState('other');
    const [priority, setPriority] = useState<'P0' | 'P1' | 'P2'>('P1');
    const [description, setDescription] = useState('');
    const [acceptanceCriteria, setAcceptanceCriteria] = useState('');

    // Feature selection state (when creating from Epic context)
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(featureId || null);
    const [availableFeatures, setAvailableFeatures] = useState<Feature[]>([]);
    const [loadingFeatures, setLoadingFeatures] = useState(false);

    // AI categorization state
    const [isCategorizing, setIsCategorizing] = useState(false);
    const [categorization, setCategorization] = useState<CategorizationResult | null>(null);
    const [isCreatingNewFeature, setIsCreatingNewFeature] = useState(false);

    // Load features when epic is provided
    useEffect(() => {
        if (epicId && open) {
            loadFeatures();
        }
    }, [epicId, open]);

    // Reset selectedFeatureId when featureId prop changes
    useEffect(() => {
        setSelectedFeatureId(featureId || null);
    }, [featureId]);

    const loadFeatures = async () => {
        if (!epicId) return;
        setLoadingFeatures(true);
        try {
            const features = await getFeatures(epicId);
            setAvailableFeatures(features);
        } catch (err) {
            console.error('Error loading features:', err);
        } finally {
            setLoadingFeatures(false);
        }
    };

    const resetForm = () => {
        setNarrative('');
        setPersona('member');
        setFeatureArea('other');
        setPriority('P1');
        setDescription('');
        setAcceptanceCriteria('');
        setSelectedFeatureId(featureId || null);
        setCategorization(null);
        setError(null);
    };

    const handleSuggestFeature = async () => {
        if (!epicId || !narrative.trim()) return;

        setIsCategorizing(true);
        setCategorization(null);

        try {
            const response = await fetch('/api/ai/categorize-story', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    epicId,
                    narrative: narrative.trim(),
                    persona,
                    acceptance_criteria: acceptanceCriteria.trim()
                        ? acceptanceCriteria.split('\n').filter(line => line.trim())
                        : null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to categorize story');
            }

            if (data.success && data.data) {
                setCategorization(data.data);
                // Auto-select the suggested feature if it's an existing one
                if (data.data.recommendation === 'existing' && data.data.suggested_feature_id) {
                    setSelectedFeatureId(data.data.suggested_feature_id);
                }
            }
        } catch (error) {
            console.error('Error categorizing story:', error);
            setError('Failed to get AI suggestion. Please select manually.');
        } finally {
            setIsCategorizing(false);
        }
    };

    const handleAcceptNewFeature = async () => {
        if (!categorization?.new_feature_suggestion || !epicId) return;

        setIsCreatingNewFeature(true);
        try {
            const newFeature = await createFeature({
                project_id: projectId,
                epic_id: epicId,
                name: categorization.new_feature_suggestion.name,
                description: categorization.new_feature_suggestion.description,
                priority: categorization.new_feature_suggestion.priority,
            });

            // Add to available features and select it
            setAvailableFeatures(prev => [...prev, newFeature]);
            setSelectedFeatureId(newFeature.id);
            setCategorization(null);
        } catch (error) {
            console.error('Error creating feature:', error);
            setError('Failed to create new feature. Please try again.');
        } finally {
            setIsCreatingNewFeature(false);
        }
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!narrative.trim()) {
            setError('User story narrative is required');
            return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
            // Create a proper UserStory in pm_user_stories table
            const createdUserStory = await createUserStory({
                project_id: projectId,
                narrative: narrative.trim(),
                persona,
                feature_area: featureArea,
                priority,
                status: 'Not Started',
                milestone_id: milestoneId || null,
                epic_id: epicId || null,
                feature_id: selectedFeatureId || null,
                acceptance_criteria: acceptanceCriteria.trim()
                    ? acceptanceCriteria.split('\n').filter(line => line.trim())
                    : null,
            });

            resetForm();
            setOpen(false);

            // Call the callback with the created UserStory
            if (onUserStoryCreated) {
                onUserStoryCreated(createdUserStory);
            }
        } catch (err) {
            console.error('Error creating user story:', err);
            setError('Failed to create user story. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                    <Plus className="w-4 h-4" />
                    Create Story
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl">Create User Story</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Narrative (main story text) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            User Story <span className="text-red-400">*</span>
                        </label>
                        <Textarea
                            value={narrative}
                            onChange={(e) => {
                                setNarrative(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder='As a [persona], I want to [action] so that [benefit]...'
                            className={`bg-gray-800 border-gray-700 min-h-[100px] ${error && !narrative.trim() ? 'border-red-500' : ''}`}
                        />
                        <p className="text-xs text-gray-500">
                            Format: "As a [user], I want [feature] so that [benefit]"
                        </p>
                    </div>

                    {/* Persona and Feature Area */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Persona</label>
                            <Select value={persona} onValueChange={(v) => setPersona(v as 'member' | 'admin' | 'staff' | 'business' | 'guest')}>
                                <SelectTrigger className="bg-gray-800 border-gray-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PERSONAS.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Feature Area</label>
                            <Select value={featureArea} onValueChange={setFeatureArea}>
                                <SelectTrigger className="bg-gray-800 border-gray-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FEATURE_AREAS.map((area) => (
                                        <SelectItem key={area} value={area}>
                                            {area.replace('_', ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Priority</label>
                        <Select
                            value={priority}
                            onValueChange={(v) => setPriority(v as 'P0' | 'P1' | 'P2')}
                        >
                            <SelectTrigger className="bg-gray-800 border-gray-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITIES.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${p.color}`} />
                                            {p.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Feature Selector (only when creating from Epic context) */}
                    {epicId && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-400" />
                                    Feature (optional)
                                </label>
                                {availableFeatures.length > 0 && narrative.trim() && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleSuggestFeature}
                                        disabled={isCategorizing}
                                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 gap-1 h-7 text-xs"
                                    >
                                        {isCategorizing ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3 h-3" />
                                                AI Suggest
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                            <Select
                                value={selectedFeatureId || 'none'}
                                onValueChange={(v) => {
                                    setSelectedFeatureId(v === 'none' ? null : v);
                                    setCategorization(null); // Clear categorization when manually changed
                                }}
                                disabled={loadingFeatures}
                            >
                                <SelectTrigger className="bg-gray-800 border-gray-700">
                                    <SelectValue placeholder={loadingFeatures ? 'Loading...' : 'Select a feature...'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        <span className="text-gray-400">No feature (unassigned)</span>
                                    </SelectItem>
                                    {availableFeatures.map((f) => (
                                        <SelectItem key={f.id} value={f.id}>
                                            <div className="flex items-center gap-2">
                                                <Package className="w-3 h-3 text-blue-400" />
                                                {f.name}
                                                {categorization?.suggested_feature_id === f.id && (
                                                    <span className="text-purple-400 text-xs">(AI suggested)</span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* AI Categorization Result */}
                            {categorization && (
                                <div className={`p-3 rounded-lg border ${
                                    categorization.used_fallback
                                        ? 'bg-yellow-950/30 border-yellow-700/50'
                                        : categorization.recommendation === 'existing'
                                            ? 'bg-green-950/30 border-green-700/50'
                                            : categorization.recommendation === 'new'
                                                ? 'bg-purple-950/30 border-purple-700/50'
                                                : 'bg-gray-800 border-gray-700'
                                }`}>
                                    {/* Fallback Warning */}
                                    {categorization.used_fallback && (
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-yellow-700/30">
                                            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                            <p className="text-xs text-yellow-300">
                                                AI analysis unavailable. Using keyword matching (less accurate).
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-2">
                                        {categorization.recommendation === 'existing' ? (
                                            <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${categorization.used_fallback ? 'text-yellow-400' : 'text-green-400'}`} />
                                        ) : (
                                            <Lightbulb className={`w-4 h-4 mt-0.5 flex-shrink-0 ${categorization.used_fallback ? 'text-yellow-400' : 'text-purple-400'}`} />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            {categorization.recommendation === 'existing' && (
                                                <p className={`text-sm ${categorization.used_fallback ? 'text-yellow-300' : 'text-green-300'}`}>
                                                    Suggested: <span className="font-medium">{categorization.suggested_feature_name}</span>
                                                    <span className={`ml-1 ${categorization.used_fallback ? 'text-yellow-400/70' : 'text-green-400/70'}`}>({categorization.confidence}% confidence)</span>
                                                </p>
                                            )}
                                            {categorization.recommendation === 'new' && categorization.new_feature_suggestion && (
                                                <div className="space-y-2">
                                                    <p className={`text-sm ${categorization.used_fallback ? 'text-yellow-300' : 'text-purple-300'}`}>
                                                        Suggest creating new feature: <span className="font-medium">{categorization.new_feature_suggestion.name}</span>
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleAcceptNewFeature}
                                                        disabled={isCreatingNewFeature}
                                                        className="gap-1 bg-purple-600 hover:bg-purple-700 h-7 text-xs"
                                                    >
                                                        {isCreatingNewFeature ? (
                                                            <>
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                Creating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="w-3 h-3" />
                                                                Create & Select
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">{categorization.reasoning}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-gray-500">
                                Group this story under a specific feature within the epic.
                            </p>
                        </div>
                    )}

                    {/* Acceptance Criteria */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Acceptance Criteria (optional)
                        </label>
                        <Textarea
                            value={acceptanceCriteria}
                            onChange={(e) => setAcceptanceCriteria(e.target.value)}
                            placeholder="Enter each criterion on a new line:&#10;- User can see their profile&#10;- User can edit their name&#10;- Changes are saved immediately"
                            className="bg-gray-800 border-gray-700 min-h-[80px]"
                        />
                        <p className="text-xs text-gray-500">
                            One criterion per line. These define when the story is "done".
                        </p>
                    </div>

                    {/* Additional Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Additional Details (optional)
                        </label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Any additional context or implementation notes..."
                            className="bg-gray-800 border-gray-700 min-h-[60px]"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!narrative.trim() || isSubmitting}
                            className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Story
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
