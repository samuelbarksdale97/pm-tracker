declare module 'wx-react-gantt' {
    import { FC } from 'react';

    export interface GanttTask {
        id: string;
        text: string;
        start: Date;
        end: Date;
        progress?: number;
        type?: 'task' | 'milestone' | 'project';
        parent?: string;
        $custom?: Record<string, unknown>;
    }

    export interface GanttLink {
        id: string;
        source: string;
        target: string;
        type: string;
    }

    export interface GanttScale {
        unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
        step: number;
        format: string;
    }

    export interface GanttProps {
        tasks: GanttTask[];
        links?: GanttLink[];
        scales?: GanttScale[];
    }

    export const Gantt: FC<GanttProps>;
}
