'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
    value?: Date | string | null;
    onChange?: (date: Date | null) => void;
    placeholder?: string;
    minDate?: Date;
    className?: string;
    disabled?: boolean;
}

export function DatePicker({
    value,
    onChange,
    placeholder = 'Pick a date',
    minDate,
    className,
    disabled,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    // Convert string to Date if needed
    // Parse date strings as local dates to avoid timezone issues
    const dateValue = React.useMemo(() => {
        if (!value) return null;
        if (value instanceof Date) return value;
        // Parse YYYY-MM-DD as local date, not UTC
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date(value);
    }, [value]);

    const handleSelect = (date: Date | null) => {
        onChange?.(date);
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange?.(null);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'w-full justify-start text-left font-normal',
                        'bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:text-white',
                        !dateValue && 'text-gray-500',
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                    {dateValue ? (
                        <span className="flex-1">{format(dateValue, 'PPP')}</span>
                    ) : (
                        <span className="flex-1">{placeholder}</span>
                    )}
                    {dateValue && (
                        <X
                            className="h-4 w-4 text-gray-400 hover:text-white ml-2"
                            onClick={handleClear}
                        />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    selected={dateValue}
                    onSelect={handleSelect}
                    minDate={minDate}
                />
            </PopoverContent>
        </Popover>
    );
}
