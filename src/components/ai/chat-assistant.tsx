'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}

interface SuggestedAction {
    type: string;
    preview: Record<string, unknown>;
    confirmationRequired: boolean;
}

export function ChatAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const sendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setSuggestedActions([]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            const data = await response.json();

            if (data.error && !data.response) {
                throw new Error(data.error);
            }

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

            if (data.suggestedActions?.length > 0) {
                setSuggestedActions(data.suggestedActions);
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I encountered an error processing your request. Please try again.",
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const quickActions = [
        { label: "Project overview", query: "Give me a project overview" },
        { label: "What's blocked?", query: "What tasks are currently blocked?" },
        { label: "P0 tasks", query: "Show me all P0 priority tasks" },
    ];

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${isOpen
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500'
                    }`}
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <MessageCircle className="w-6 h-6 text-white" />
                )}
            </button>

            {/* Chat Panel */}
            <div
                className={`fixed bottom-24 right-6 z-40 w-[420px] transition-all duration-300 transform ${isOpen
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
            >
                <Card className="bg-gray-900 border-gray-800 shadow-2xl overflow-hidden flex flex-col h-[600px]">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-violet-900/50 to-indigo-900/50">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                            <h3 className="font-semibold text-white">Project Architect</h3>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Ask anything about the project
                        </p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center py-8">
                                <Sparkles className="w-12 h-12 text-violet-400/50 mx-auto mb-4" />
                                <p className="text-gray-400 text-sm mb-4">
                                    Hi! I'm your Project Architect. I can help you:
                                </p>
                                <ul className="text-gray-500 text-xs space-y-1 mb-6">
                                    <li>• Understand project status and blockers</li>
                                    <li>• Find specific tasks or user stories</li>
                                    <li>• Create new items with proper structure</li>
                                    <li>• Get onboarded quickly</li>
                                </ul>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {quickActions.map((action, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setInput(action.query);
                                                inputRef.current?.focus();
                                            }}
                                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full text-xs text-gray-300 transition-colors"
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${msg.role === 'user'
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-gray-800 text-gray-100'
                                            }`}
                                    >
                                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                </div>
                            ))
                        )}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-800 rounded-2xl px-4 py-3">
                                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                </div>
                            </div>
                        )}

                        {/* Suggested Actions */}
                        {suggestedActions.length > 0 && (
                            <div className="space-y-2">
                                {suggestedActions.map((action, i) => (
                                    <Card key={i} className="bg-gray-800 border-gray-700 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="text-violet-400 border-violet-400/50">
                                                {action.type.replace('_', ' ')}
                                            </Badge>
                                            <span className="text-xs text-gray-500">Requires confirmation</span>
                                        </div>
                                        <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto">
                                            {JSON.stringify(action.preview, null, 2)}
                                        </pre>
                                        <div className="flex gap-2 mt-2">
                                            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-xs">
                                                Confirm & Create
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-xs">
                                                Edit First
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                        <div className="flex gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about the project..."
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                                rows={1}
                                disabled={isLoading}
                            />
                            <Button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                className="bg-violet-600 hover:bg-violet-500 rounded-xl px-4"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
}
