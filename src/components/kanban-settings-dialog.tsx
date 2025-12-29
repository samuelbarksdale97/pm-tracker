'use client';

import { useState, useEffect } from 'react';
import { Settings2, GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';
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
    KanbanColumn,
    getKanbanColumns,
    saveKanbanColumns,
    resetKanbanColumns,
    DEFAULT_COLUMNS,
} from '@/lib/kanban-config';

interface KanbanSettingsDialogProps {
    onColumnsChange: () => void;
}

export function KanbanSettingsDialog({ onColumnsChange }: KanbanSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [columns, setColumns] = useState<KanbanColumn[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        if (open) {
            setColumns(getKanbanColumns());
        }
    }, [open]);

    const handleVisibilityToggle = (status: KanbanColumn['status']) => {
        setColumns(prev =>
            prev.map(col =>
                col.status === status ? { ...col, visible: !col.visible } : col
            )
        );
    };

    const handleLabelChange = (status: KanbanColumn['status'], label: string) => {
        setColumns(prev =>
            prev.map(col =>
                col.status === status ? { ...col, label } : col
            )
        );
    };

    const handleWipLimitChange = (status: KanbanColumn['status'], value: string) => {
        const wipLimit = value ? parseInt(value, 10) : undefined;
        setColumns(prev =>
            prev.map(col =>
                col.status === status ? { ...col, wipLimit: wipLimit && wipLimit > 0 ? wipLimit : undefined } : col
            )
        );
    };

    const handleColorChange = (status: KanbanColumn['status'], color: string) => {
        setColumns(prev =>
            prev.map(col =>
                col.status === status ? { ...col, color } : col
            )
        );
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newColumns = [...columns];
        const [dragged] = newColumns.splice(draggedIndex, 1);
        newColumns.splice(index, 0, dragged);

        // Update order values
        newColumns.forEach((col, idx) => {
            col.order = idx;
        });

        setColumns(newColumns);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleSave = () => {
        saveKanbanColumns(columns);
        onColumnsChange();
        setOpen(false);
    };

    const handleReset = () => {
        resetKanbanColumns();
        setColumns([...DEFAULT_COLUMNS]);
    };

    const colorOptions = [
        '#6B7280', // Gray
        '#3B82F6', // Blue
        '#8B5CF6', // Purple
        '#EF4444', // Red
        '#F59E0B', // Amber
        '#10B981', // Green
        '#EC4899', // Pink
        '#06B6D4', // Cyan
    ];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="w-4 h-4" />
                    Customize Columns
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
                <DialogHeader>
                    <DialogTitle>Kanban Board Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-sm text-gray-400">
                        Customize which columns are visible, their labels, colors, and WIP limits.
                        Drag to reorder.
                    </p>

                    <div className="space-y-2">
                        {columns.map((column, index) => (
                            <div
                                key={column.status}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                    'flex items-center gap-3 p-3 rounded-lg border transition-all',
                                    column.visible
                                        ? 'bg-gray-800 border-gray-700'
                                        : 'bg-gray-800/50 border-gray-700/50 opacity-60',
                                    draggedIndex === index && 'opacity-50 scale-[0.98]'
                                )}
                            >
                                {/* Drag handle */}
                                <GripVertical className="w-4 h-4 text-gray-500 cursor-grab flex-shrink-0" />

                                {/* Color picker */}
                                <div className="relative flex-shrink-0">
                                    <input
                                        type="color"
                                        value={column.color}
                                        onChange={(e) => handleColorChange(column.status, e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6"
                                    />
                                    <div
                                        className="w-6 h-6 rounded-full border-2 border-gray-600"
                                        style={{ backgroundColor: column.color }}
                                    />
                                </div>

                                {/* Label input */}
                                <input
                                    type="text"
                                    value={column.label}
                                    onChange={(e) => handleLabelChange(column.status, e.target.value)}
                                    className="flex-1 bg-gray-700 border-none rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />

                                {/* WIP Limit */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-xs text-gray-500">WIP</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="99"
                                        value={column.wipLimit || ''}
                                        onChange={(e) => handleWipLimitChange(column.status, e.target.value)}
                                        placeholder="-"
                                        className="w-12 bg-gray-700 border-none rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Visibility toggle */}
                                <button
                                    onClick={() => handleVisibilityToggle(column.status)}
                                    className={cn(
                                        'p-1.5 rounded transition-colors',
                                        column.visible
                                            ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                                            : 'text-gray-600 hover:text-gray-400 hover:bg-gray-700'
                                    )}
                                    title={column.visible ? 'Hide column' : 'Show column'}
                                >
                                    {column.visible ? (
                                        <Eye className="w-4 h-4" />
                                    ) : (
                                        <EyeOff className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Status legend */}
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                        Column status values (Not Started, In Progress, etc.) cannot be changed as they map to story statuses.
                    </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-700">
                    <Button
                        variant="ghost"
                        onClick={handleReset}
                        className="text-gray-400 hover:text-white gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Defaults
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
