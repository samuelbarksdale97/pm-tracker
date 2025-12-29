'use client';

import { Lightbulb } from 'lucide-react';
import { MillerLayout } from '@/components/miller-columns';
import { ImportDialog } from '@/components/import-dialog';
import { TeamMember } from '@/lib/supabase';

interface PlanTabProps {
    projectId: string;
    teamMembers: TeamMember[];
    onRefresh: () => void;
}

export function PlanTab({
    projectId,
    teamMembers,
    onRefresh,
}: PlanTabProps) {
    return (
        <div className="space-y-4">
            {/* Tab Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-semibold text-white">Plan</h2>
                </div>
                <ImportDialog
                    projectId={projectId}
                    onImportComplete={(count) => {
                        if (count > 0) onRefresh();
                    }}
                />
            </div>

            {/* Epics View */}
            <MillerLayout
                projectId={projectId}
                teamMembers={teamMembers}
                onRefresh={onRefresh}
            />
        </div>
    );
}
