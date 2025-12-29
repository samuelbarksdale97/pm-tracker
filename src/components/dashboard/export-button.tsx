'use client';

import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    generateExportData,
    downloadAsJSON,
    downloadAsCSV,
} from '@/lib/export-utils';
import { getUserStories, getEpicsWithCounts, getFeatures } from '@/lib/supabase';

interface ExportButtonProps {
    projectId: string;
    projectName: string;
}

export function ExportButton({ projectId, projectName }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'json' | 'csv') => {
        setIsExporting(true);
        try {
            // Fetch all data
            const [userStories, epics] = await Promise.all([
                getUserStories(projectId),
                getEpicsWithCounts(projectId),
            ]);

            // Fetch features for each epic
            const featuresPromises = epics.map(epic => getFeatures(epic.id));
            const featuresArrays = await Promise.all(featuresPromises);
            const features = featuresArrays.flat();

            // Generate export data
            const exportData = generateExportData({
                projectName,
                userStories,
                epics,
                features,
            });

            // Download in requested format
            if (format === 'json') {
                downloadAsJSON(exportData, `${projectName.toLowerCase().replace(/\s+/g, '-')}-export`);
            } else {
                downloadAsCSV(exportData, `${projectName.toLowerCase().replace(/\s+/g, '-')}-stories`);
            }
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                    className="gap-2 border-gray-700 text-gray-300 hover:text-white"
                >
                    {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                <DropdownMenuItem
                    onClick={() => handleExport('json')}
                    className="gap-2 cursor-pointer"
                >
                    <FileJson className="w-4 h-4 text-blue-400" />
                    Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleExport('csv')}
                    className="gap-2 cursor-pointer"
                >
                    <FileSpreadsheet className="w-4 h-4 text-green-400" />
                    Export Stories as CSV
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
