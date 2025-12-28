'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CreateMilestoneDialogProps } from './types';

export function CreateMilestoneDialog({
    open,
    onOpenChange,
    onCreate,
    isSubmitting,
}: CreateMilestoneDialogProps) {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setName('');
            setStartDate('');
            setEndDate('');
        }
    }, [open]);

    const handleCreate = () => {
        if (!name.trim() || !endDate) return;
        onCreate(name, startDate, endDate);
    };

    const isValidDates = !startDate || !endDate || new Date(endDate) >= new Date(startDate);
    const canSubmit = name.trim() && endDate && isValidDates && !isSubmitting;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader>
                    <DialogTitle className="text-white">Create Milestone</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-2 block">Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., MVP Complete"
                            className="bg-gray-800 border-gray-700"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Start Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-gray-800 border-gray-700"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Target Date *</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-gray-800 border-gray-700"
                            />
                        </div>
                    </div>
                    {!isValidDates && (
                        <p className="text-red-400 text-sm">End date must be after start date</p>
                    )}
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!canSubmit}
                        >
                            {isSubmitting ? 'Creating...' : 'Create'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
