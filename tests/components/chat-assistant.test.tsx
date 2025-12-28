import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatAssistant } from '@/components/ai/chat-assistant';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ChatAssistant', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    describe('UI Rendering', () => {
        it('renders the floating chat button', () => {
            render(<ChatAssistant />);

            // Should have at least one button (the floating button)
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });

        it('opens chat panel when button is clicked', () => {
            render(<ChatAssistant />);

            // Get the first button (floating button)
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[0]);

            // Should show the Project Architect header
            expect(screen.getByText('Project Architect')).toBeInTheDocument();
        });

        it('displays quick action buttons in empty state', () => {
            render(<ChatAssistant />);

            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[0]);

            // Should show quick action suggestions
            expect(screen.getByText('Project overview')).toBeInTheDocument();
            expect(screen.getByText("What's blocked?")).toBeInTheDocument();
            expect(screen.getByText('P0 tasks')).toBeInTheDocument();
        });

        it('has an input field for typing messages', () => {
            render(<ChatAssistant />);

            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[0]);

            const input = screen.getByPlaceholderText('Ask about the project...');
            expect(input).toBeInTheDocument();
        });
    });

    describe('Message Sending', () => {
        it('sends message when Enter is pressed', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    response: 'Test response from AI',
                    suggestedActions: [],
                    referencedItems: [],
                }),
            });

            render(<ChatAssistant />);

            // Open chat
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[0]);

            // Type and send message
            const input = screen.getByPlaceholderText('Ask about the project...');
            fireEvent.change(input, { target: { value: 'Hello' } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

            // Should call the API
            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                }));
            });
        });

        it('displays user message in chat history', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    response: 'AI Response',
                    suggestedActions: [],
                    referencedItems: [],
                }),
            });

            render(<ChatAssistant />);

            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[0]);

            const input = screen.getByPlaceholderText('Ask about the project...');
            fireEvent.change(input, { target: { value: 'Test message' } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

            // User message should appear
            await waitFor(() => {
                expect(screen.getByText('Test message')).toBeInTheDocument();
            });
        });

        it('displays AI response in chat history', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    response: 'This is the AI response',
                    suggestedActions: [],
                    referencedItems: [],
                }),
            });

            render(<ChatAssistant />);

            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[0]);

            const input = screen.getByPlaceholderText('Ask about the project...');
            fireEvent.change(input, { target: { value: 'Hello' } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

            // AI response should appear
            await waitFor(() => {
                expect(screen.getByText('This is the AI response')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('shows error message when API fails', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            render(<ChatAssistant />);

            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[0]);

            const input = screen.getByPlaceholderText('Ask about the project...');
            fireEvent.change(input, { target: { value: 'Hello' } });
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

            // Error message should appear
            await waitFor(() => {
                expect(screen.getByText(/encountered an error/i)).toBeInTheDocument();
            });
        });
    });
});
