import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  AlertTriangle,
  Clock,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { dataService } from '../services/dataService';

interface CalendarEvent {
  id: string;
  date: number;
  month: number;
  year: number;
  dayName: string;
  title: string;
  type: 'class' | 'holiday' | 'exam' | 'deadline' | 'practical';
  time?: string;
  room?: string;
  description: string;
}

export function CalendarView() {
  const [filterType, setFilterType] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const exams = dataService.getExams();
  const assignments = dataService.getAssignments();

  const dynamicEvents: CalendarEvent[] = useMemo(() => {
    const list: CalendarEvent[] = [];

    exams.forEach((ex) => {
      const d = new Date(ex.examDate);
      list.push({
        id: `exam-${ex.id}`,
        date: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
        title: ex.title,
        type: 'exam',
        time: `${ex.startTime} – ${ex.endTime}`,
        room: `Room ${ex.room}`,
        description: `Syllabus: ${ex.syllabusCovered} (${ex.totalMarks} Marks)`,
      });
    });

    assignments.forEach((asg) => {
      const d = new Date(asg.dueDate);
      list.push({
        id: `asg-${asg.id}`,
        date: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
        title: `Submission: ${asg.title}`,
        type: 'deadline',
        time: '11:59 PM',
        room: asg.subjectName,
        description: asg.description,
      });
    });

    list.push({
      id: 'mstone-1',
      date: 3,
      month: 7,
      year: 2026,
      dayName: 'Monday',
      title: 'Odd Semester 2026-27 Classes Commence',
      type: 'class',
      time: '09:00 AM – 05:00 PM',
      room: 'USAR Campus',
      description: 'Official USAR AR-1 B2 schedule active w.e.f. 3rd August 2026.',
    });

    list.push({
      id: 'mstone-2',
      date: 2,
      month: 9,
      year: 2026,
      dayName: 'Friday',
      title: 'Gandhi Jayanti Holiday',
      type: 'holiday',
      time: 'All Day',
      room: 'Gazetted Holiday',
      description: 'No academic classes or laboratories.',
    });

    return list;
  }, [exams, assignments]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const currentMonthEvents = dynamicEvents.filter(
    (ev) => ev.month === currentMonth && ev.year === currentYear
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Academic Calendar
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Semester Timeline
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Official timeline syncing exams, coursework deadlines, and university holidays.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-7 w-7 text-zinc-400 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-xs text-white px-2 font-mono">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7 text-zinc-400 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {currentMonthEvents.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <CalendarIcon className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No scheduled events</h3>
            <p className="text-xs text-zinc-400 mt-1">
              No exams or major submissions for {monthNames[currentMonth]} {currentYear}.
            </p>
          </div>
        ) : (
          currentMonthEvents.map((ev) => (
            <div
              key={ev.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-2 text-center min-w-[64px]">
                  <span className="text-lg font-mono font-bold text-white block">{ev.date}</span>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">
                    {monthNames[ev.month].slice(0, 3)}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                      {ev.type}
                    </span>
                    <h3 className="text-base font-bold text-white">{ev.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">{ev.description}</p>
                  <span className="text-xs font-mono text-zinc-400 block mt-1.5">{ev.time} • {ev.room}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
