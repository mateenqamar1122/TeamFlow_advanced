import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Plus, Filter, ChevronLeft, ChevronRight, Clock, MapPin, Users, Edit, Trash2 } from 'lucide-react';
import { useCalendar, type CalendarEvent, type CreateEventData } from '@/hooks/useCalendar';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';

interface CalendarViewProps {
  height?: string;
}

export function CalendarView({ height = "600px" }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEvent, setNewEvent] = useState<CreateEventData>({
    title: '',
    description: '',
    start_date: new Date().toISOString(),
    event_type: 'meeting',
    all_day: false,
  });

  const {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    fetchTasksAndProjectsAsEvents
  } = useCalendar();

  // Get events for current view
  const getEventsForCurrentView = () => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return events.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate >= monthStart && eventDate <= monthEnd;
      });
    }
    return events;
  };

  // Get days for month view
  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };

  // Handle event creation
  const handleCreateEvent = async () => {
    if (!newEvent.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter an event title.",
        variant: "destructive",
      });
      return;
    }

    const result = await createEvent(newEvent);
    if (result) {
      setShowEventDialog(false);
      setNewEvent({
        title: '',
        description: '',
        start_date: new Date().toISOString(),
        event_type: 'meeting',
        all_day: false,
      });
      toast({
        title: "Event created",
        description: "Your event has been added to the calendar.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async (eventId: string) => {
    const success = await deleteEvent(eventId);
    if (success) {
      toast({
        title: "Event deleted",
        description: "The event has been removed from your calendar.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get event type color
  const getEventTypeColor = (type: CalendarEvent['event_type']) => {
    const colors = {
      task: 'bg-blue-100 text-blue-800 border-blue-200',
      project: 'bg-green-100 text-green-800 border-green-200',
      milestone: 'bg-purple-100 text-purple-800 border-purple-200',
      meeting: 'bg-orange-100 text-orange-800 border-orange-200',
      deadline: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[type] || colors.meeting;
  };

  // Navigation functions
  const goToPrevious = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const goToNext = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const currentEvents = getEventsForCurrentView();

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar View
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>

            {/* Add Event Button */}
            <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Event title..."
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Textarea
                      placeholder="Event description (optional)..."
                      value={newEvent.description || ''}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Start Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={newEvent.start_date.slice(0, 16)}
                        onChange={(e) => setNewEvent(prev => ({
                          ...prev,
                          start_date: new Date(e.target.value).toISOString()
                        }))}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">End Date & Time</label>
                      <Input
                        type="datetime-local"
                        value={newEvent.end_date?.slice(0, 16) || ''}
                        onChange={(e) => setNewEvent(prev => ({
                          ...prev,
                          end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined
                        }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Event Type</label>
                      <Select
                        value={newEvent.event_type}
                        onValueChange={(value: any) => setNewEvent(prev => ({ ...prev, event_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="deadline">Deadline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <Input
                        placeholder="Location (optional)..."
                        value={newEvent.location || ''}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="all-day"
                      checked={newEvent.all_day || false}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, all_day: e.target.checked }))}
                    />
                    <label htmlFor="all-day" className="text-sm font-medium">All Day Event</label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => setShowEventDialog(false)} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleCreateEvent} className="flex-1">
                      Create Event
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>

          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>

          <div className="text-sm text-muted-foreground">
            {currentEvents.length} events this month
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className={`${height} overflow-auto`}>
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-1 p-4">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {getDaysInMonth().map(day => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
                      isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                    } ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    } ${
                      isTodayDate ? 'bg-primary/5 border-primary' : 'border-border'
                    } hover:bg-accent`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                    } ${
                      isTodayDate ? 'text-primary font-bold' : ''
                    }`}>
                      {format(day, 'd')}
                    </div>

                    {/* Events for this day */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded border ${getEventTypeColor(event.event_type)} truncate`}
                          title={event.title}
                        >
                          {event.all_day ? (
                            event.title
                          ) : (
                            `${format(new Date(event.start_date), 'HH:mm')} ${event.title}`
                          )}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Event Details Sidebar */}
          {selectedDate && (
            <div className="border-t p-4">
              <h3 className="font-semibold mb-3">
                Events for {format(selectedDate, 'MMMM d, yyyy')}
              </h3>

              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-muted-foreground">No events scheduled for this day.</p>
              ) : (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge variant="secondary" className={getEventTypeColor(event.event_type)}>
                            {event.event_type}
                          </Badge>
                        </div>

                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {event.description}
                        </p>
                      )}

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {event.all_day ? (
                            'All day'
                          ) : (
                            `${format(new Date(event.start_date), 'HH:mm')}${
                              event.end_date ? ` - ${format(new Date(event.end_date), 'HH:mm')}` : ''
                            }`
                          )}
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        )}

                        {event.assignees && event.assignees.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <div className="flex -space-x-1">
                              {event.assignees.slice(0, 3).map((assigneeId, index) => (
                                <Avatar key={assigneeId} className="h-5 w-5 border-2 border-background">
                                  <AvatarFallback className="text-xs">
                                    {assigneeId.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {event.assignees.length > 3 && (
                                <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                                  +{event.assignees.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default CalendarView;
