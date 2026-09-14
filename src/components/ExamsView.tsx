import React from 'react';
import {
  AlarmClock,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Award,
  AlertTriangle,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Exam } from '../types';

interface ExamsViewProps {
  exams: Exam[];
  onNavigateToSyllabus: () => void;
}

export function ExamsView({ exams, onNavigateToSyllabus }: ExamsViewProps) {
  const getDaysRemaining = (examDateStr: string) => {
    const examDate = new Date(examDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    examDate.setHours(0, 0, 0, 0);
    const diffTime = examDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Exam & Assessment Tracker
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Mid-Semester 2026
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Countdowns, testing halls, and unit coverage for internal assessments and semester exams.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateToSyllabus}
          className="text-xs"
        >
          <BookOpen className="h-4 w-4 mr-1.5 text-zinc-400" />
          Check Exam Syllabus
        </Button>
      </div>

      {/* Hero Countdown Card */}
      {exams.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-zinc-400">
                NEXT UPCOMING ASSESSMENT
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{exams[0].title}</h2>
              <p className="text-xs sm:text-sm text-zinc-300">
                Syllabus covered: <span className="text-white font-medium">{exams[0].syllabusCovered}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center min-w-[110px]">
                <div className="text-3xl sm:text-4xl font-bold text-white font-mono">
                  {getDaysRemaining(exams[0].examDate)}
                </div>
                <div className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5">
                  Days Remaining
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Exams List */}
      <div className="space-y-3.5">
        {exams.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <GraduationCap className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No upcoming exams scheduled</h3>
            <p className="text-xs text-zinc-400 mt-1">Mid-term and end-sem dates will appear here once announced.</p>
          </div>
        ) : (
          exams.map((exam) => {
            const daysLeft = getDaysRemaining(exam.examDate);

            return (
              <div
                key={exam.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                      {exam.examType.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-white">{exam.title}</h3>
                  </div>

                  <p className="text-xs text-zinc-300 mt-1">
                    Coverage: {exam.syllabusCovered} • Total: {exam.totalMarks} Marks
                  </p>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2.5">
                    <span>
                      Date: <strong className="text-white font-mono">{exam.examDate}</strong>
                    </span>
                    <span>•</span>
                    <span>Time: <strong className="text-white font-mono">{exam.startTime} – {exam.endTime}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                      {exam.room}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono self-end sm:self-center">
                  <span className="text-xl font-bold text-white block">{daysLeft}d</span>
                  <span className="text-[10px] text-zinc-400 uppercase">Left</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
