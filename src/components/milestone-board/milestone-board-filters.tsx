'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { MilestoneBoardFiltersProps } from './types';

export function MilestoneBoardFilters({
    searchQuery,
    onSearchChange,
    workstreamFilter,
    onWorkstreamChange,
    priorityFilter,
    onPriorityChange,
    workstreams,
    onClearFilters,
    hasActiveFilters,
}: MilestoneBoardFiltersProps) {
    return (
        <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                    placeholder="Search stories..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700"
                />
            </div>
            <Select value={workstreamFilter} onValueChange={onWorkstreamChange}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-700">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Workstream" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="all">All Workstreams</SelectItem>
                    {workstreams.map(ws => (
                        <SelectItem key={ws} value={ws}>{ws}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={onPriorityChange}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="P0">P0</SelectItem>
                    <SelectItem value="P1">P1</SelectItem>
                    <SelectItem value="P2">P2</SelectItem>
                </SelectContent>
            </Select>
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                >
                    Clear filters
                </Button>
            )}
        </div>
    );
}
