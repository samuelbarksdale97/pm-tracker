'use client';

import { useState, useRef } from 'react';
import { format } from 'date-fns';
import {
    Download,
    Upload,
    Database,
    AlertCircle,
    CheckCircle2,
    Loader2,
    FileJson,
    Trash2,
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
    BackupData,
    RestoreResult,
    createBackup,
    downloadBackup,
    readBackupFile,
    restoreBackup,
} from '@/lib/backup-utils';

interface BackupRestoreDialogProps {
    projectId: string;
    projectName: string;
    onRestoreComplete: () => void;
}

type DialogMode = 'menu' | 'backup' | 'restore' | 'restoreConfirm' | 'restoring' | 'complete';

export function BackupRestoreDialog({
    projectId,
    projectName,
    onRestoreComplete,
}: BackupRestoreDialogProps) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<DialogMode>('menu');
    const [loading, setLoading] = useState(false);
    const [backupData, setBackupData] = useState<BackupData | null>(null);
    const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
    const [clearExisting, setClearExisting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackup = async () => {
        setLoading(true);
        setMode('backup');

        try {
            const backup = await createBackup(projectId, projectName);
            downloadBackup(backup);
            setBackupData(backup);
            setMode('complete');
        } catch (error) {
            console.error('Backup failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (file: File) => {
        try {
            const backup = await readBackupFile(file);
            setBackupData(backup);
            setMode('restoreConfirm');
        } catch (error) {
            console.error('Failed to read backup:', error);
        }
    };

    const handleRestore = async () => {
        if (!backupData) return;

        setLoading(true);
        setMode('restoring');

        try {
            const result = await restoreBackup(backupData, projectId, {
                clearExisting,
                skipExisting: !clearExisting,
            });
            setRestoreResult(result);
            setMode('complete');
            if (result.success) {
                onRestoreComplete();
            }
        } catch (error) {
            console.error('Restore failed:', error);
            setRestoreResult({
                success: false,
                restored: { epics: 0, features: 0, userStories: 0, goals: 0 },
                skipped: { epics: 0, features: 0, userStories: 0, goals: 0 },
                errors: [`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
            });
            setMode('complete');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setMode('menu');
        setBackupData(null);
        setRestoreResult(null);
        setClearExisting(false);
    };

    const handleClose = () => {
        setOpen(false);
        setTimeout(reset, 300);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Database className="w-4 h-4" />
                    Backup
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle>Backup & Restore</DialogTitle>
                </DialogHeader>

                {/* Menu */}
                {mode === 'menu' && (
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-400">
                            Create a backup of your project data or restore from a previous backup.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={handleBackup}
                                className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <Download className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <div className="font-medium text-white">Create Backup</div>
                                    <div className="text-xs text-gray-500">
                                        Download a full backup of epics, features, stories, and goals
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <div className="font-medium text-white">Restore Backup</div>
                                    <div className="text-xs text-gray-500">
                                        Restore from a previously downloaded backup file
                                    </div>
                                </div>
                            </button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Backup in progress */}
                {mode === 'backup' && loading && (
                    <div className="py-8 text-center">
                        <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin mb-4" />
                        <p className="text-gray-300">Creating backup...</p>
                    </div>
                )}

                {/* Restore confirmation */}
                {mode === 'restoreConfirm' && backupData && (
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-gray-800/50 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <FileJson className="w-8 h-8 text-blue-400" />
                                <div>
                                    <div className="font-medium text-white">{backupData.projectName}</div>
                                    <div className="text-xs text-gray-500">
                                        Created {format(new Date(backupData.timestamp), 'MMM d, yyyy h:mm a')}
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-gray-700/50 rounded p-2">
                                    <span className="text-gray-400">Epics:</span>{' '}
                                    <span className="text-white">{backupData.metadata.epicCount}</span>
                                </div>
                                <div className="bg-gray-700/50 rounded p-2">
                                    <span className="text-gray-400">Features:</span>{' '}
                                    <span className="text-white">{backupData.metadata.featureCount}</span>
                                </div>
                                <div className="bg-gray-700/50 rounded p-2">
                                    <span className="text-gray-400">Stories:</span>{' '}
                                    <span className="text-white">{backupData.metadata.storyCount}</span>
                                </div>
                                <div className="bg-gray-700/50 rounded p-2">
                                    <span className="text-gray-400">Goals:</span>{' '}
                                    <span className="text-white">{backupData.metadata.goalCount}</span>
                                </div>
                            </div>
                        </div>

                        {/* Clear existing option */}
                        <label className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg cursor-pointer">
                            <input
                                type="checkbox"
                                checked={clearExisting}
                                onChange={(e) => setClearExisting(e.target.checked)}
                                className="mt-1"
                            />
                            <div>
                                <div className="flex items-center gap-2 text-red-400 font-medium">
                                    <Trash2 className="w-4 h-4" />
                                    Clear existing data
                                </div>
                                <p className="text-xs text-red-400/70 mt-1">
                                    Warning: This will delete all existing epics, features, stories, and goals before restoring.
                                </p>
                            </div>
                        </label>

                        <div className="flex justify-between pt-4 border-t border-gray-700">
                            <Button variant="ghost" onClick={reset}>
                                Cancel
                            </Button>
                            <Button onClick={handleRestore}>
                                Restore Backup
                            </Button>
                        </div>
                    </div>
                )}

                {/* Restoring */}
                {mode === 'restoring' && (
                    <div className="py-8 text-center">
                        <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin mb-4" />
                        <p className="text-gray-300">Restoring data...</p>
                    </div>
                )}

                {/* Complete */}
                {mode === 'complete' && (
                    <div className="py-6 text-center">
                        {restoreResult ? (
                            <>
                                {restoreResult.success ? (
                                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                                ) : (
                                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                                )}
                                <p className="text-lg text-white mb-2">
                                    {restoreResult.success ? 'Restore Complete!' : 'Restore Failed'}
                                </p>
                                <div className="text-sm text-gray-400 mb-4">
                                    Restored: {restoreResult.restored.epics} epics,{' '}
                                    {restoreResult.restored.features} features,{' '}
                                    {restoreResult.restored.userStories} stories,{' '}
                                    {restoreResult.restored.goals} goals
                                </div>
                                {restoreResult.errors.length > 0 && (
                                    <div className="text-left p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 max-h-24 overflow-y-auto mb-4">
                                        {restoreResult.errors.slice(0, 5).map((err, i) => (
                                            <div key={i}>• {err}</div>
                                        ))}
                                        {restoreResult.errors.length > 5 && (
                                            <div>...and {restoreResult.errors.length - 5} more</div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                                <p className="text-lg text-white mb-2">Backup Created!</p>
                                <p className="text-sm text-gray-400 mb-4">
                                    Your backup file has been downloaded.
                                </p>
                            </>
                        )}
                        <Button onClick={handleClose}>Done</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
