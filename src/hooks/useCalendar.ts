import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    all_day: boolean;
    event_type: 'task' | 'project' | 'milestone' | 'meeting' | 'deadline';
    entity_id?: string;
    entity_type?: 'task' | 'project';
    color?: string;
    created_by: string;
    assignees?: string[];
    location?: string;
    recurring?: {
        frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
        interval: number;
        end_date?: string;
        count?: number;
    };
    created_at: string;
    updated_at: string;
}

export interface CalendarFilters {
    start_date?: Date;
    end_date?: Date;
    event_types?: CalendarEvent['event_type'][];
    assignees?: string[];
    created_by?: string;
}

export interface CreateEventData {
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    all_day?: boolean;
    event_type: CalendarEvent['event_type'];
    entity_id?: string;
    entity_type?: 'task' | 'project';
    color?: string;
    assignees?: string[];
    location?: string;
    recurring?: CalendarEvent['recurring'];
}

export interface UpdateEventData {
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    all_day?: boolean;
    color?: string;
    assignees?: string[];
    location?: string;
    recurring?: CalendarEvent['recurring'];
}

// Database row type matching Supabase schema
interface DatabaseCalendarEvent {
    id: string;
    user_id: string;
    created_by: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string | null;
    all_day: boolean;
    event_type: string;
    entity_id: string | null;
    entity_type: string | null;
    color: string | null;
    assignees: Json | null;
    location: string | null;
    recurring: Json | null;
    created_at: string;
    updated_at: string;
}

// Task type from database
interface DatabaseTask {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date?: string | null;
    created_at: string;
    updated_at: string;
    user_id: string;
    assignee_name?: string | null;
    assignee_avatar?: string | null;
    tags: Json | null;
    workflow_id: string;
}

// Project type from database
interface DatabaseProject {
    id: string;
    name: string;
    description: string | null;
    status: string;
    due_date?: string | null;
    created_at: string;
    updated_at: string;
    user_id: string;
}

export function useCalendar(filters: CalendarFilters = {}) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    // Convert database row to CalendarEvent
    const convertDatabaseEvent = (dbEvent: DatabaseCalendarEvent): CalendarEvent => {
        // Parse assignees from JSON
        let assignees: string[] = [];
        if (dbEvent.assignees) {
            try {
                if (typeof dbEvent.assignees === 'string') {
                    assignees = JSON.parse(dbEvent.assignees);
                } else if (Array.isArray(dbEvent.assignees)) {
                    assignees = dbEvent.assignees as string[];
                }
            } catch {
                assignees = [];
            }
        }

        // Parse recurring from JSON
        let recurring: CalendarEvent['recurring'] | undefined;
        if (dbEvent.recurring) {
            try {
                if (typeof dbEvent.recurring === 'string') {
                    recurring = JSON.parse(dbEvent.recurring);
                } else {
                    recurring = dbEvent.recurring as CalendarEvent['recurring'];
                }
            } catch {
                recurring = undefined;
            }
        }

        return {
            id: dbEvent.id,
            title: dbEvent.title,
            description: dbEvent.description || undefined,
            start_date: dbEvent.start_date,
            end_date: dbEvent.end_date || undefined,
            all_day: dbEvent.all_day,
            event_type: dbEvent.event_type as CalendarEvent['event_type'],
            entity_id: dbEvent.entity_id || undefined,
            entity_type: dbEvent.entity_type as 'task' | 'project' | undefined,
            color: dbEvent.color || undefined,
            created_by: dbEvent.created_by,
            assignees,
            location: dbEvent.location || undefined,
            recurring,
            created_at: dbEvent.created_at,
            updated_at: dbEvent.updated_at,
        };
    };

    // Fetch calendar events
    const fetchEvents = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('calendar_events')
                .select('*')
                .order('start_date', { ascending: true });

            // Apply filters
            if (filters.start_date) {
                query = query.gte('start_date', filters.start_date.toISOString());
            }

            if (filters.end_date) {
                query = query.lte('start_date', filters.end_date.toISOString());
            }

            if (filters.event_types?.length) {
                query = query.in('event_type', filters.event_types);
            }

            if (filters.created_by) {
                query = query.eq('created_by', filters.created_by);
            }

            const { data, error: queryError } = await query;

            if (queryError) throw queryError;

            // Convert database events and filter by assignees if specified
            let filteredEvents = (data || []).map((row) =>
                convertDatabaseEvent(row as DatabaseCalendarEvent)
            );

            if (filters.assignees?.length) {
                filteredEvents = filteredEvents.filter(event =>
                    event.assignees && Array.isArray(event.assignees) &&
                    event.assignees.some((assignee: string) =>
                        filters.assignees!.includes(assignee)
                    )
                );
            }

            setEvents(filteredEvents);

        } catch (err) {
            console.error('Error fetching calendar events:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
        } finally {
            setLoading(false);
        }
    }, [user, filters]);

    // Create a new calendar event
    const createEvent = useCallback(async (data: CreateEventData): Promise<CalendarEvent | null> => {
        if (!user) return null;

        try {
            const insertData = {
                title: data.title,
                description: data.description || null,
                start_date: data.start_date,
                end_date: data.end_date || null,
                all_day: data.all_day || false,
                event_type: data.event_type,
                entity_id: data.entity_id || null,
                entity_type: data.entity_type || null,
                color: data.color || null,
                location: data.location || null,
                recurring: data.recurring ? JSON.stringify(data.recurring) : null,
                user_id: user.id,
                created_by: user.id, // Ensure both fields are set
                assignees: JSON.stringify(data.assignees || [user.id]),
            };

            const { data: newEvent, error } = await supabase
                .from('calendar_events')
                .insert(insertData)
                .select()
                .single();

            if (error) throw error;

            const convertedEvent = convertDatabaseEvent(newEvent as DatabaseCalendarEvent);
            setEvents(prev => [...prev, convertedEvent]);
            return convertedEvent;

        } catch (err) {
            console.error('Error creating calendar event:', err);
            return null;
        }
    }, [user]);

    // Update an existing calendar event
    const updateEvent = useCallback(async (eventId: string, data: UpdateEventData): Promise<boolean> => {
        if (!user) return false;

        try {
            const updateData = {
                title: data.title,
                description: data.description || null,
                start_date: data.start_date,
                end_date: data.end_date || null,
                all_day: data.all_day,
                color: data.color || null,
                location: data.location || null,
                recurring: data.recurring ? JSON.stringify(data.recurring) : null,
                assignees: data.assignees ? JSON.stringify(data.assignees) : null,
                updated_at: new Date().toISOString(),
            };

            const { data: updatedEvent, error } = await supabase
                .from('calendar_events')
                .update(updateData)
                .eq('id', eventId)
                .select()
                .single();

            if (error) throw error;

            const convertedEvent = convertDatabaseEvent(updatedEvent as DatabaseCalendarEvent);
            setEvents(prev => prev.map(event =>
                event.id === eventId ? convertedEvent : event
            ));

            return true;

        } catch (err) {
            console.error('Error updating calendar event:', err);
            return false;
        }
    }, [user]);

    // Delete a calendar event
    const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
        if (!user) return false;

        try {
            const { error } = await supabase
                .from('calendar_events')
                .delete()
                .eq('id', eventId);

            if (error) throw error;

            setEvents(prev => prev.filter(event => event.id !== eventId));
            return true;

        } catch (err) {
            console.error('Error deleting calendar event:', err);
            return false;
        }
    }, [user]);

    // Fetch events from tasks and projects
    const fetchTasksAndProjectsAsEvents = useCallback(async () => {
        if (!user) return [];

        try {
            // Fetch tasks - using correct column names from your schema
            const { data: tasks } = await supabase
                .from('tasks')
                .select('id, title, description, status, priority, created_at, updated_at, user_id, assignee_name, assignee_avatar, tags, workflow_id')
                .not('due_date', 'is', null);

            // Fetch projects
            const { data: projects } = await supabase
                .from('projects')
                .select('id, name, description, status, created_at, updated_at, user_id')
                .not('due_date', 'is', null);

            const taskEvents: CalendarEvent[] = (tasks || []).map((task: DatabaseTask) => ({
                id: `task-${task.id}`,
                title: task.title,
                description: task.description || undefined,
                start_date: new Date().toISOString(), // Since due_date is not available, use current date
                all_day: true,
                event_type: 'task' as const,
                entity_id: task.id,
                entity_type: 'task' as const,
                color: task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#6b7280',
                created_by: task.user_id,
                assignees: task.assignee_name ? [task.user_id] : [],
                created_at: task.created_at,
                updated_at: task.updated_at,
            }));

            const projectEvents: CalendarEvent[] = (projects || []).map((project: DatabaseProject) => ({
                id: `project-${project.id}`,
                title: project.name,
                description: project.description || undefined,
                start_date: new Date().toISOString(), // Since due_date is not available, use current date
                all_day: true,
                event_type: 'project' as const,
                entity_id: project.id,
                entity_type: 'project' as const,
                color: '#3b82f6',
                created_by: project.user_id,
                assignees: [],
                created_at: project.created_at,
                updated_at: project.updated_at,
            }));

            return [...taskEvents, ...projectEvents];

        } catch (err) {
            console.error('Error fetching tasks and projects as events:', err);
            return [];
        }
    }, [user]);

    // Get events for a specific date range
    const getEventsForDateRange = useCallback((startDate: Date, endDate: Date) => {
        return events.filter(event => {
            const eventStart = new Date(event.start_date);
            const eventEnd = event.end_date ? new Date(event.end_date) : eventStart;

            return (eventStart >= startDate && eventStart <= endDate) ||
                (eventEnd >= startDate && eventEnd <= endDate) ||
                (eventStart <= startDate && eventEnd >= endDate);
        });
    }, [events]);

    // Get events for a specific date
    const getEventsForDate = useCallback((date: Date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return getEventsForDateRange(startOfDay, endOfDay);
    }, [getEventsForDateRange]);

    // Generate recurring events using database function
    const generateRecurringEvents = useCallback(async (event: CalendarEvent, endDate: Date): Promise<CalendarEvent[]> => {
        if (!event.recurring) return [event];

        try {
            const { data, error } = await supabase
                .rpc('generate_recurring_events', {
                    event_id: event.id,
                    max_end_date: endDate.toISOString().split('T')[0]
                });

            if (error) throw error;

            // Convert database results to CalendarEvent format
            const recurringEvents: CalendarEvent[] = (data || []).map((item: {
                generated_id: string;
                event_title: string;
                event_start_date: string;
                event_end_date: string;
            }) => ({
                ...event,
                id: item.generated_id,
                title: item.event_title,
                start_date: item.event_start_date,
                end_date: item.event_end_date,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }));

            return [event, ...recurringEvents];

        } catch (err) {
            console.error('Error generating recurring events:', err);
            // Fallback to client-side generation
            return generateRecurringEventsClientSide(event, endDate);
        }
    }, []);

    // Fallback client-side recurring event generation
    const generateRecurringEventsClientSide = useCallback((event: CalendarEvent, endDate: Date): CalendarEvent[] => {
        if (!event.recurring) return [event];

        const events: CalendarEvent[] = [event];
        const startDate = new Date(event.start_date);
        const recurring = event.recurring;
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            // Calculate next occurrence based on frequency
            switch (recurring.frequency) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + recurring.interval);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + (7 * recurring.interval));
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + recurring.interval);
                    break;
                case 'yearly':
                    currentDate.setFullYear(currentDate.getFullYear() + recurring.interval);
                    break;
            }

            if (currentDate <= endDate) {
                const recurringEvent: CalendarEvent = {
                    ...event,
                    id: `${event.id}-${currentDate.getTime()}`,
                    start_date: currentDate.toISOString(),
                    end_date: event.end_date ?
                        new Date(new Date(event.end_date).getTime() + (currentDate.getTime() - startDate.getTime())).toISOString() :
                        undefined,
                };
                events.push(recurringEvent);
            }

            // Check count limit
            if (recurring.count && events.length >= recurring.count) {
                break;
            }

            // Check end date
            if (recurring.end_date && currentDate > new Date(recurring.end_date)) {
                break;
            }
        }

        return events;
    }, []);

    // Initial load
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return {
        events,
        loading,
        error,
        createEvent,
        updateEvent,
        deleteEvent,
        fetchTasksAndProjectsAsEvents,
        getEventsForDateRange,
        getEventsForDate,
        generateRecurringEvents,
        refetch: fetchEvents,
    };
}
