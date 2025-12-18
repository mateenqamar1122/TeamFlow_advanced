import { CalendarView } from "@/components/CalendarView";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, Clock, Users } from "lucide-react";

export default function Calendar() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <CalendarIcon className="h-10 w-10 text-primary" />
            Calendar
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your events, tasks, and project deadlines in one centralized calendar view.
          </p>
        </div>

        <div className="flex gap-2">
          {/*<Button variant="outline" size="sm">*/}
          {/*  <Clock className="h-4 w-4 mr-2" />*/}
          {/*  Today*/}
          {/*</Button>*/}
          {/*<Button size="sm">*/}
          {/*  <Plus className="h-4 w-4 mr-2" />*/}
          {/*  New Event*/}
          {/*</Button>*/}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Events</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Events</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
      </div>

      <CalendarView height="calc(100vh - 400px)" />
    </div>
  );
}
