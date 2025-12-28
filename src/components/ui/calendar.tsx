'use client';

import * as React from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
    isBefore,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarProps {
    selected?: Date | null;
    onSelect?: (date: Date | null) => void;
    minDate?: Date;
    className?: string;
}

export function Calendar({ selected, onSelect, minDate, className }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = React.useState(selected || new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows: Date[][] = [];
    let days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            days.push(day);
            day = addDays(day, 1);
        }
        rows.push(days);
        days = [];
    }

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleSelectDate = (date: Date) => {
        if (minDate && isBefore(date, minDate)) return;
        onSelect?.(date);
    };

    const handleClear = () => {
        onSelect?.(null);
    };

    return (
        <div className={cn('p-3', className)}>
            {/* Header with month navigation */}
            <div className="flex items-center justify-between mb-4">
                <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="font-semibold text-white">
                    {format(currentMonth, 'MMMM yyyy')}
                </div>
                <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Day names header */}
            <div className="grid grid-cols-7 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((dayName) => (
                    <div
                        key={dayName}
                        className="text-center text-xs font-medium text-gray-500 py-1"
                    >
                        {dayName}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="space-y-1">
                {rows.map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-7 gap-1">
                        {week.map((date, dayIdx) => {
                            const isCurrentMonth = isSameMonth(date, currentMonth);
                            const isSelected = selected && isSameDay(date, selected);
                            const isTodayDate = isToday(date);
                            const isDisabled = minDate && isBefore(date, minDate);

                            return (
                                <button
                                    key={dayIdx}
                                    type="button"
                                    onClick={() => handleSelectDate(date)}
                                    disabled={isDisabled}
                                    className={cn(
                                        'w-8 h-8 rounded-full text-sm font-medium transition-all',
                                        'flex items-center justify-center',
                                        !isCurrentMonth && 'text-gray-600',
                                        isCurrentMonth && !isSelected && !isTodayDate && 'text-gray-300 hover:bg-gray-700',
                                        isTodayDate && !isSelected && 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50',
                                        isSelected && 'bg-blue-600 text-white hover:bg-blue-500',
                                        isDisabled && 'opacity-30 cursor-not-allowed hover:bg-transparent'
                                    )}
                                >
                                    {format(date, 'd')}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Footer with Today and Clear buttons */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
                <button
                    type="button"
                    onClick={() => {
                        setCurrentMonth(new Date());
                        onSelect?.(new Date());
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                    Today
                </button>
                {selected && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
