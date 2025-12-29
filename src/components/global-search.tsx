'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, Layers, Box, FileText, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

interface SearchResult {
    id: string;
    type: 'epic' | 'feature' | 'story';
    name: string;
    description?: string;
    priority?: string;
    status?: string;
    // Hierarchy path
    epicName?: string;
    featureName?: string;
    epicId?: string;
    featureId?: string;
}

interface GlobalSearchProps {
    projectId: string;
    onSelectResult: (result: SearchResult) => void;
}

export function GlobalSearch({ projectId, onSelectResult }: GlobalSearchProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut to open search (Cmd+K or Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [open]);

    // Search function
    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        const searchResults: SearchResult[] = [];

        try {
            // Search epics
            const { data: epics } = await supabase
                .from('pm_epics')
                .select('id, name, description, status, priority')
                .eq('project_id', projectId)
                .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
                .limit(5);

            if (epics) {
                epics.forEach(epic => {
                    searchResults.push({
                        id: epic.id,
                        type: 'epic',
                        name: epic.name,
                        description: epic.description,
                        priority: epic.priority,
                        status: epic.status,
                    });
                });
            }

            // Search features
            const { data: features } = await supabase
                .from('pm_features')
                .select(`
                    id, name, description, status, priority,
                    epic:pm_epics!epic_id(id, name)
                `)
                .eq('project_id', projectId)
                .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
                .limit(5);

            if (features) {
                features.forEach((feature: any) => {
                    searchResults.push({
                        id: feature.id,
                        type: 'feature',
                        name: feature.name,
                        description: feature.description,
                        priority: feature.priority,
                        status: feature.status,
                        epicName: feature.epic?.name,
                        epicId: feature.epic?.id,
                    });
                });
            }

            // Search user stories
            const { data: stories } = await supabase
                .from('pm_user_stories')
                .select(`
                    id, narrative, status, priority, feature_area,
                    epic:pm_epics!epic_id(id, name),
                    feature:pm_features!feature_id(id, name)
                `)
                .eq('project_id', projectId)
                .or(`narrative.ilike.%${searchQuery}%,feature_area.ilike.%${searchQuery}%`)
                .limit(10);

            if (stories) {
                stories.forEach((story: any) => {
                    searchResults.push({
                        id: story.id,
                        type: 'story',
                        name: story.narrative,
                        priority: story.priority,
                        status: story.status,
                        epicName: story.epic?.name,
                        epicId: story.epic?.id,
                        featureName: story.feature?.name,
                        featureId: story.feature?.id,
                    });
                });
            }

            setResults(searchResults);
            setSelectedIndex(0);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            search(query);
        }, 200);

        return () => clearTimeout(timer);
    }, [query, search]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            handleSelect(results[selectedIndex]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const handleSelect = (result: SearchResult) => {
        onSelectResult(result);
        setOpen(false);
    };

    const getTypeIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'epic': return <Layers className="w-4 h-4 text-purple-400" />;
            case 'feature': return <Box className="w-4 h-4 text-blue-400" />;
            case 'story': return <FileText className="w-4 h-4 text-green-400" />;
        }
    };

    const getTypeColor = (type: SearchResult['type']) => {
        switch (type) {
            case 'epic': return 'bg-purple-500/20 text-purple-400';
            case 'feature': return 'bg-blue-500/20 text-blue-400';
            case 'story': return 'bg-green-500/20 text-green-400';
        }
    };

    return (
        <>
            {/* Search Trigger Button */}
            <Button
                variant="outline"
                className="relative h-9 w-64 justify-start text-sm text-gray-400 bg-gray-900 border-gray-700 hover:bg-gray-800 hover:text-gray-300"
                onClick={() => setOpen(true)}
            >
                <Search className="mr-2 h-4 w-4" />
                <span>Search...</span>
                <kbd className="absolute right-2 pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-gray-700 bg-gray-800 px-1.5 font-mono text-xs text-gray-400 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>

            {/* Search Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl p-0 gap-0 bg-gray-900 border-gray-700">
                    <DialogHeader className="px-4 pt-4 pb-2">
                        <DialogTitle className="text-white">Search Everything</DialogTitle>
                    </DialogHeader>

                    {/* Search Input */}
                    <div className="px-4 pb-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search epics, features, and stories..."
                                className="pl-10 pr-10 h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                            />
                            {query && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                                    onClick={() => setQuery('')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="max-h-96 overflow-y-auto px-2 pb-2">
                        {loading ? (
                            <div className="py-8 text-center text-gray-400">
                                Searching...
                            </div>
                        ) : results.length === 0 && query ? (
                            <div className="py-8 text-center text-gray-400">
                                No results found for "{query}"
                            </div>
                        ) : results.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                Type to search across all epics, features, and stories
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {results.map((result, index) => (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => handleSelect(result)}
                                        className={cn(
                                            'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                                            index === selectedIndex
                                                ? 'bg-gray-800'
                                                : 'hover:bg-gray-800/50'
                                        )}
                                    >
                                        <div className="mt-0.5">
                                            {getTypeIcon(result.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <Badge className={cn('text-xs', getTypeColor(result.type))}>
                                                    {result.type}
                                                </Badge>
                                                {result.priority && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {result.priority}
                                                    </Badge>
                                                )}
                                                {result.status && (
                                                    <span className="text-xs text-gray-500">
                                                        {result.status}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-white truncate">
                                                {result.name}
                                            </div>
                                            {(result.epicName || result.featureName) && (
                                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                                    {result.epicName && (
                                                        <>
                                                            <span>{result.epicName}</span>
                                                            {result.featureName && <ChevronRight className="w-3 h-3" />}
                                                        </>
                                                    )}
                                                    {result.featureName && (
                                                        <span>{result.featureName}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↓</kbd>
                            <span>to navigate</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">↵</kbd>
                            <span>to select</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">esc</kbd>
                            <span>to close</span>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
