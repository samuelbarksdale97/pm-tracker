'use client';

import { useState, useRef, useCallback } from 'react';
import {
    Upload,
    FileText,
    FileJson,
    AlertCircle,
    CheckCircle2,
    X,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    ImportResult,
    ImportedStory,
    parseCSV,
    parseJSON,
    readFileContent,
    detectFormat,
} from '@/lib/import-utils';
import { createUserStory } from '@/lib/supabase';

interface ImportDialogProps {
    projectId: string;
    featureId?: string;
    onImportComplete: (count: number) => void;
}

type ImportStage = 'upload' | 'preview' | 'importing' | 'complete';

export function ImportDialog({
    projectId,
    featureId,
    onImportComplete,
}: ImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [stage, setStage] = useState<ImportStage>('upload');
    const [result, setResult] = useState<ImportResult | null>(null);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importedCount, setImportedCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (file: File) => {
        const format = detectFormat(file);

        try {
            const content = await readFileContent(file);
            let parseResult: ImportResult;

            if (format === 'csv') {
                parseResult = parseCSV(content);
            } else if (format === 'json') {
                parseResult = parseJSON(content);
            } else {
                // Try JSON first, then CSV
                try {
                    parseResult = parseJSON(content);
                } catch {
                    parseResult = parseCSV(content);
                }
            }

            setResult(parseResult);
            setStage('preview');
        } catch (error) {
            setResult({
                success: false,
                stories: [],
                errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
                warnings: [],
            });
            setStage('preview');
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleImport = async () => {
        if (!result?.stories.length) return;

        setImporting(true);
        setStage('importing');
        setImportProgress(0);
        setImportedCount(0);

        let successCount = 0;

        for (let i = 0; i < result.stories.length; i++) {
            const story = result.stories[i];

            try {
                await createUserStory({
                    project_id: projectId,
                    feature_id: featureId || null,
                    narrative: story.narrative,
                    persona: story.persona,
                    priority: story.priority,
                    status: story.status || 'Not Started',
                    acceptance_criteria: story.acceptanceCriteria || [],
                    feature_area: story.feature || '',
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to import story: ${story.narrative}`, error);
            }

            setImportProgress(Math.round(((i + 1) / result.stories.length) * 100));
            setImportedCount(successCount);
        }

        setImporting(false);
        setStage('complete');
        onImportComplete(successCount);
    };

    const reset = () => {
        setStage('upload');
        setResult(null);
        setImportProgress(0);
        setImportedCount(0);
    };

    const handleClose = () => {
        setOpen(false);
        setTimeout(reset, 300);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Import Stories
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle>Import User Stories</DialogTitle>
                </DialogHeader>

                {/* Upload Stage */}
                {stage === 'upload' && (
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-400">
                            Import user stories from a CSV or JSON file. Stories will be added to this project.
                        </p>

                        {/* Drop zone */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                'border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer',
                                'hover:border-blue-500 hover:bg-blue-500/5 transition-all'
                            )}
                        >
                            <Upload className="w-10 h-10 mx-auto text-gray-500 mb-4" />
                            <p className="text-gray-300 mb-2">
                                Drop a file here or click to browse
                            </p>
                            <p className="text-xs text-gray-500">
                                Supports .csv and .json files
                            </p>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.json"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                            className="hidden"
                        />

                        {/* Format hints */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-300 mb-2">
                                    <FileText className="w-4 h-4" />
                                    CSV Format
                                </div>
                                <p className="text-gray-500">
                                    Columns: narrative, persona, priority, status, feature
                                </p>
                            </div>
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-300 mb-2">
                                    <FileJson className="w-4 h-4" />
                                    JSON Format
                                </div>
                                <p className="text-gray-500">
                                    Array of objects with narrative, persona, priority fields
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Stage */}
                {stage === 'preview' && result && (
                    <div className="space-y-4 py-4">
                        {/* Errors */}
                        {result.errors.length > 0 && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <div className="flex items-center gap-2 text-red-400 mb-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-medium">Errors</span>
                                </div>
                                <ul className="text-xs text-red-400 space-y-1">
                                    {result.errors.map((error, i) => (
                                        <li key={i}>• {error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Warnings */}
                        {result.warnings.length > 0 && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                <div className="flex items-center gap-2 text-amber-400 mb-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-medium">Warnings</span>
                                </div>
                                <ul className="text-xs text-amber-400 space-y-1">
                                    {result.warnings.slice(0, 5).map((warning, i) => (
                                        <li key={i}>• {warning}</li>
                                    ))}
                                    {result.warnings.length > 5 && (
                                        <li>• ...and {result.warnings.length - 5} more</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {/* Preview */}
                        {result.stories.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-gray-300">
                                        Found {result.stories.length} stories to import
                                    </span>
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {result.stories.slice(0, 10).map((story, i) => (
                                        <div
                                            key={i}
                                            className="p-2 bg-gray-800/50 rounded text-xs"
                                        >
                                            <p className="text-gray-300 line-clamp-2">
                                                {story.narrative}
                                            </p>
                                            <div className="flex gap-2 mt-1 text-gray-500">
                                                <span>{story.persona}</span>
                                                <span>•</span>
                                                <span>{story.priority}</span>
                                                {story.feature && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{story.feature}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {result.stories.length > 10 && (
                                        <p className="text-xs text-gray-500 text-center py-2">
                                            ...and {result.stories.length - 10} more
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between pt-4 border-t border-gray-700">
                            <Button variant="ghost" onClick={reset}>
                                Back
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={!result.success || result.stories.length === 0}
                            >
                                Import {result.stories.length} Stories
                            </Button>
                        </div>
                    </div>
                )}

                {/* Importing Stage */}
                {stage === 'importing' && (
                    <div className="py-8 text-center">
                        <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin mb-4" />
                        <p className="text-gray-300 mb-2">Importing stories...</p>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${importProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            {importedCount} of {result?.stories.length} imported
                        </p>
                    </div>
                )}

                {/* Complete Stage */}
                {stage === 'complete' && (
                    <div className="py-8 text-center">
                        <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                        <p className="text-lg text-white mb-2">Import Complete!</p>
                        <p className="text-gray-400 mb-6">
                            Successfully imported {importedCount} stories
                        </p>
                        <Button onClick={handleClose}>Done</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
