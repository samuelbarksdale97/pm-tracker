'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus } from 'lucide-react';

interface EmptyStateProps {
    onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
    return (
        <Card className="bg-gray-900 border-gray-800 border-dashed min-w-[320px] flex-shrink-0 flex flex-col items-center justify-center p-8">
            <Calendar className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No milestones yet</h3>
            <p className="text-gray-600 text-sm text-center mb-4">
                Create your first milestone to organize your stories
            </p>
            <Button onClick={onCreateClick} className="gap-2">
                <Plus className="w-4 h-4" />
                Create First Milestone
            </Button>
        </Card>
    );
}
