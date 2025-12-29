'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    FileText,
    Settings,
    Loader2,
    Save,
    AlertCircle,
    CheckCircle,
    Code,
    Users,
    Target,
    Lightbulb,
    AlertTriangle,
    X,
    Plus,
} from 'lucide-react';
import {
    ProjectWithContext,
    ProjectBrief,
    getProjectWithContext,
    updateProjectContext,
} from '@/lib/supabase';

interface ProjectContextEditorProps {
    projectId: string;
    onContextUpdated?: (project: ProjectWithContext) => void;
}

// Tag input component for arrays
function TagInput({
    tags,
    onChange,
    placeholder,
}: {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder: string;
}) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                onChange([...tags, inputValue.trim()]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 min-h-[32px]">
                {tags.map((tag, i) => (
                    <Badge
                        key={i}
                        variant="secondary"
                        className="bg-gray-700/80 text-gray-200 gap-1 px-3 py-1 text-sm break-words whitespace-normal max-w-full"
                    >
                        {tag}
                        <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-red-400 transition-colors ml-1"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="bg-gray-800/50 border-gray-700 text-sm"
            />
        </div>
    );
}

export function ProjectContextEditor({
    projectId,
    onContextUpdated,
}: ProjectContextEditorProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Project data
    const [project, setProject] = useState<ProjectWithContext | null>(null);

    // Context document (markdown/PRD)
    const [contextDocument, setContextDocument] = useState('');

    // Project brief fields
    const [vision, setVision] = useState('');
    const [targetUsers, setTargetUsers] = useState<string[]>([]);
    const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
    const [businessGoals, setBusinessGoals] = useState<string[]>([]);
    const [constraints, setConstraints] = useState<string[]>([]);

    // Tech stack
    const [techFrontend, setTechFrontend] = useState('');
    const [techBackend, setTechBackend] = useState('');
    const [techMobile, setTechMobile] = useState('');
    const [techAdmin, setTechAdmin] = useState('');
    const [techInfra, setTechInfra] = useState('');

    const loadProject = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getProjectWithContext(projectId);
            if (data) {
                setProject(data);
                setContextDocument(data.context_document || '');

                // Load project brief
                const brief = data.project_brief || {};
                setVision(brief.vision || '');
                setTargetUsers(brief.target_users || []);
                setKeyFeatures(brief.key_features || []);
                setBusinessGoals(brief.business_goals || []);
                setConstraints(brief.constraints || []);

                // Load tech stack
                const stack = brief.tech_stack || {};
                setTechFrontend(stack.frontend || '');
                setTechBackend(stack.backend || '');
                setTechMobile(stack.mobile || '');
                setTechAdmin(stack.admin || '');
                setTechInfra(stack.infrastructure || '');
            }
        } catch (err) {
            console.error('Error loading project:', err);
            setError('Failed to load project context');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // Load project when sheet opens
    useEffect(() => {
        if (open) {
            loadProject();
        }
    }, [open, loadProject]);

    const handleSave = async () => {
        if (!project) return;

        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const projectBrief: ProjectBrief = {
                vision: vision.trim() || undefined,
                target_users: targetUsers.length > 0 ? targetUsers : undefined,
                key_features: keyFeatures.length > 0 ? keyFeatures : undefined,
                business_goals: businessGoals.length > 0 ? businessGoals : undefined,
                constraints: constraints.length > 0 ? constraints : undefined,
                tech_stack: {
                    frontend: techFrontend.trim() || undefined,
                    backend: techBackend.trim() || undefined,
                    mobile: techMobile.trim() || undefined,
                    admin: techAdmin.trim() || undefined,
                    infrastructure: techInfra.trim() || undefined,
                },
            };

            // Clean up empty tech_stack
            if (Object.values(projectBrief.tech_stack || {}).every(v => !v)) {
                delete projectBrief.tech_stack;
            }

            const updated = await updateProjectContext(project.id, {
                context_document: contextDocument.trim() || null,
                project_brief: Object.keys(projectBrief).length > 0 ? projectBrief : null,
            });

            setProject(updated);
            setSuccess(true);
            onContextUpdated?.(updated);

            // Clear success after 3 seconds
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving project context:', err);
            setError('Failed to save project context');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Project Context
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-gray-950 border-gray-800 !w-[650px] !max-w-[650px] overflow-y-auto overflow-x-hidden p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-800/50">
                    <SheetTitle className="text-white flex items-center gap-2 text-lg">
                        <FileText className="w-5 h-5 text-blue-400" />
                        Project Context
                    </SheetTitle>
                    <p className="text-gray-400 text-sm">
                        Define project context that will be injected into AI task generation for better understanding.
                    </p>
                </SheetHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    </div>
                ) : (
                    <Tabs defaultValue="brief" className="flex-1">
                        <div className="px-6 pt-4">
                            <TabsList className="bg-gray-800/50 border border-gray-700/50 p-1">
                                <TabsTrigger value="brief" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
                                    Project Brief
                                </TabsTrigger>
                                <TabsTrigger value="document" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400">
                                    Full Document
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Project Brief Tab */}
                        <TabsContent value="brief" className="px-6 py-4 space-y-4">
                            {/* Vision */}
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
                                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                                    Vision Statement
                                </label>
                                <Textarea
                                    value={vision}
                                    onChange={(e) => setVision(e.target.value)}
                                    placeholder='e.g., "A mobile membership app that revolutionizes how nightclubs manage VIP relationships"'
                                    className="bg-gray-800/50 border-gray-700 min-h-[80px] text-sm"
                                />
                            </div>

                            {/* Target Users */}
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
                                    <Users className="w-4 h-4 text-blue-400" />
                                    Target Users
                                </label>
                                <TagInput
                                    tags={targetUsers}
                                    onChange={setTargetUsers}
                                    placeholder="Add user type and press Enter (e.g., 'VIP Members')"
                                />
                            </div>

                            {/* Key Features */}
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
                                    <Target className="w-4 h-4 text-green-400" />
                                    Key Features
                                </label>
                                <TagInput
                                    tags={keyFeatures}
                                    onChange={setKeyFeatures}
                                    placeholder="Add feature and press Enter (e.g., 'Reservation Management')"
                                />
                            </div>

                            {/* Tech Stack */}
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
                                    <Code className="w-4 h-4 text-purple-400" />
                                    Tech Stack
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Frontend</label>
                                        <Input
                                            value={techFrontend}
                                            onChange={(e) => setTechFrontend(e.target.value)}
                                            placeholder="e.g., React, Next.js"
                                            className="bg-gray-800/50 border-gray-700 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Backend</label>
                                        <Input
                                            value={techBackend}
                                            onChange={(e) => setTechBackend(e.target.value)}
                                            placeholder="e.g., Supabase, PostgreSQL"
                                            className="bg-gray-800/50 border-gray-700 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Mobile</label>
                                        <Input
                                            value={techMobile}
                                            onChange={(e) => setTechMobile(e.target.value)}
                                            placeholder="e.g., React Native, Expo"
                                            className="bg-gray-800/50 border-gray-700 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Admin Dashboard</label>
                                        <Input
                                            value={techAdmin}
                                            onChange={(e) => setTechAdmin(e.target.value)}
                                            placeholder="e.g., Next.js, shadcn/ui"
                                            className="bg-gray-800/50 border-gray-700 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-xs text-gray-500">Infrastructure</label>
                                        <Input
                                            value={techInfra}
                                            onChange={(e) => setTechInfra(e.target.value)}
                                            placeholder="e.g., Vercel, Supabase Edge Functions"
                                            className="bg-gray-800/50 border-gray-700 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Business Goals */}
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
                                    <Target className="w-4 h-4 text-orange-400" />
                                    Business Goals
                                </label>
                                <TagInput
                                    tags={businessGoals}
                                    onChange={setBusinessGoals}
                                    placeholder="Add goal and press Enter (e.g., 'Increase member retention by 30%')"
                                />
                            </div>

                            {/* Constraints */}
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    Constraints & Requirements
                                </label>
                                <TagInput
                                    tags={constraints}
                                    onChange={setConstraints}
                                    placeholder="Add constraint and press Enter (e.g., 'Must support offline mode')"
                                />
                            </div>
                        </TabsContent>

                        {/* Full Document Tab */}
                        <TabsContent value="document" className="px-6 py-4">
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800/50">
                                <label className="text-sm font-medium text-gray-300 mb-2 block">
                                    Project Documentation (Markdown)
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Paste your PRD, technical spec, or other project documentation here.
                                </p>
                                <Textarea
                                    value={contextDocument}
                                    onChange={(e) => setContextDocument(e.target.value)}
                                    placeholder={`# Project Overview\n\n## Background\nDescribe the project background...\n\n## Goals\n- Goal 1\n- Goal 2`}
                                    className="bg-gray-800/50 border-gray-700 min-h-[350px] font-mono text-sm"
                                />
                            </div>
                        </TabsContent>

                        {/* Status Messages */}
                        <div className="px-6 pb-2">
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-300 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-800/50 rounded-lg text-green-300 text-sm">
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    Project context saved successfully!
                                </div>
                            )}
                        </div>

                        {/* Save Button */}
                        <div className="px-6 py-4 border-t border-gray-800/50 bg-gray-900/30">
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Project Context
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                                This context will be automatically included in AI task generation.
                            </p>
                        </div>
                    </Tabs>
                )}
            </SheetContent>
        </Sheet>
    );
}
