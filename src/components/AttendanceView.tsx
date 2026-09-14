import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Percent,
  Layers,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Check,
  X,
  Plus,
  HelpCircle,
  FileText,
  UserCheck,
  UserX,
  Filter,
  Calculator,
  Sliders,
  Award,
  PartyPopper,
  Megaphone,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  AttendanceRecord,
  SessionAttendanceStatus,
  ConductedClassSession,
  SubjectAttendanceSummary,
} from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../lib/auth';
import {
  formatLocalDate,
  parseLocalDate,
  getTodayDateStr,
  getWeekDateRange,
  getWeekNumberFromDate,
  formatHumanDate,
} from '../lib/dateUtils';

interface AttendanceViewProps {
  attendance: AttendanceRecord[];
}

export function AttendanceView({ attendance: _legacyAttendance }: AttendanceViewProps) {
  const { user } = useAuth();

  // Active Tab: 'timeline' (Day & Week Ledger) | 'subjects' (Subject Intelligence) | 'simulator' (Predictive Simulator)
  const [activeTab, setActiveTab] = useState<'timeline' | 'subjects' | 'simulator'>('timeline');

  // Lab Group Selection
  const [activeLabGroup, setActiveLabGroup] = useState<'all' | 'Group B2-A' | 'Group B2-B'>(
    user?.labGroup ? user.labGroup : 'Group B2-A'
  );

  React.useEffect(() => {
    if (user?.labGroup) {
      setActiveLabGroup(user.labGroup);
    }
  }, [user?.labGroup]);

  // Timetable Weeks
  const weeklySchedules = dataService.getWeeklySchedules();
  const todayStr = getTodayDateStr();
  const currentWeekNumber = getWeekNumberFromDate(todayStr);

  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(currentWeekNumber);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Subject filter in Timeline view
  const [timelineSubjectFilter, setTimelineSubjectFilter] = useState<string>('all');

  // Expanded Subject in Subject View (for past class history)
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  // Simulator State
  const [simFutureConducted, setSimFutureConducted] = useState<number>(10);
  const [simFutureAttended, setSimFutureAttended] = useState<number>(8);

  // Re-render trigger on attendance mark
  const [refreshKey, setRefreshKey] = useState(0);

  // Compute Subject Summaries
  const subjectSummaries = useMemo(() => {
    return dataService.getSubjectAttendanceSummaries(activeLabGroup);
  }, [activeLabGroup, refreshKey]);

  // Total Semester Aggregates
  const totalConducted = subjectSummaries.reduce((acc, s) => acc + s.conducted, 0);
  const totalAttended = subjectSummaries.reduce((acc, s) => acc + s.attended, 0);
  const totalAbsent = subjectSummaries.reduce((acc, s) => acc + s.absent, 0);
  const totalLeaves = subjectSummaries.reduce((acc, s) => acc + s.leaves, 0);
  const overallPercentage =
    totalConducted === 0 ? 100 : Number(((totalAttended / totalConducted) * 100).toFixed(1));
  const isOverallEligible = overallPercentage >= 75;

  // Conducted Sessions for Selected Week / Selected Date
  const activeWeekRange = getWeekDateRange(selectedWeekNum);

  // 6 Day Pills for Selected Week (Mon - Sat)
  const weekDays = useMemo(() => {
    const mon = parseLocalDate(activeWeekRange.startDate);
    const dayList = [];
    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const fullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dateStr = formatLocalDate(d);
      dayList.push({
        dayNum: i + 1,
        shortName: dayNames[i],
        fullName: fullNames[i],
        dateStr,
        formattedDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    return dayList;
  }, [activeWeekRange.startDate]);

  // Conducted sessions for selected date
  const sessionsOnSelectedDate = useMemo(() => {
    const all = dataService.getConductedSessions(selectedDate, selectedDate, activeLabGroup);
    if (timelineSubjectFilter === 'all') return all;
    return all.filter((s) => s.subjectId === timelineSubjectFilter || s.subjectName.toLowerCase().includes(timelineSubjectFilter.toLowerCase()));
  }, [selectedDate, activeLabGroup, timelineSubjectFilter, refreshKey]);

  // Student Attendance Map
  const sessionAttMap = dataService.getStudentSessionAttendance();

  // Mark Individual Session Attendance
  const handleMarkSession = async (
    session: ConductedClassSession,
    status: SessionAttendanceStatus
  ) => {
    await dataService.markSessionAttendance(
      session.date,
      session.slotId,
      session.subjectId,
      session.subjectName,
      status
    );
    setRefreshKey((k) => k + 1);
    if (status === 'present') {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.8 },
      });
    }
  };

  // Batch Mark Day as All Present
  const handleMarkAllDayPresent = async () => {
    await dataService.bulkMarkDayAttendance(selectedDate, 'present', activeLabGroup);
    setRefreshKey((k) => k + 1);
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  // Batch Mark Week as All Present
  const handleMarkAllWeekPresent = async () => {
    await dataService.bulkMarkWeekAttendance(selectedWeekNum, 'present', activeLabGroup);
    setRefreshKey((k) => k + 1);
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Switch Selected Week
  const handleSelectWeek = (weekNum: number) => {
    setSelectedWeekNum(weekNum);
    const range = getWeekDateRange(weekNum);
    setSelectedDate(range.startDate);
  };

  // Shift Selected Date
  const handleShiftDate = (delta: number) => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + delta);
    const nextDateStr = formatLocalDate(d);
    setSelectedDate(nextDateStr);
    setSelectedWeekNum(getWeekNumberFromDate(nextDateStr));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ========================================================================= */}
      {/* HEADER SECTION                                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Attendance Intelligence
            </h1>
            <Badge variant="outline" className="font-mono text-xs border-zinc-700">
              Odd Sem 2026-27 (w.e.f. Aug 3)
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Exact timetable-derived attendance ledger, GGSIPU 75% threshold manager, and smart bunk calculator.
          </p>
        </div>

        {/* Group Selector & Tab Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lab Group Selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {(['all', 'Group B2-A', 'Group B2-B'] as const).map((grp) => (
              <button
                key={grp}
                onClick={() => setActiveLabGroup(grp)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  activeLabGroup === grp
                    ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {grp === 'all' ? 'All Groups' : grp.replace('Group ', '')}
              </button>
            ))}
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Date Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Percent className="h-3.5 w-3.5" />
              <span>Subject 75% Rules</span>
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Bunk Simulator</span>
            </button>
          </div>
        </div>
      </div>

      {!user && (
        <div className="p-3.5 rounded-xl border border-amber-900/40 bg-amber-950/20 text-xs text-amber-300 flex items-center justify-between">
          <span>You are viewing in <strong>Local Guest Mode</strong>. Sign in to automatically sync attendance across your devices.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP STATS CARDS                                                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Overall Percentage */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>SEMESTER ATTENDANCE</span>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="flex items-baseline gap-2.5 pt-1">
            <span className={`text-3xl font-bold font-mono ${isOverallEligible ? 'text-white' : 'text-rose-400'}`}>
              {overallPercentage}%
            </span>
            <Badge
              variant={isOverallEligible ? 'default' : 'destructive'}
              className="font-mono text-[10px]"
            >
              {isOverallEligible ? 'SAFE (≥75%)' : 'DEBARRED RISK'}
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-400 pt-1">
            {totalAttended} attended out of {totalConducted} conducted classes
          </p>
          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-2 border border-zinc-800">
            <div
              className={`h-full transition-all ${isOverallEligible ? 'bg-emerald-400' : 'bg-rose-500'}`}
              style={{ width: `${Math.min(100, overallPercentage)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Conducted Sessions */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>CONDUCTION TIMELINE</span>
            <CalendarDays className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-bold font-mono text-white">{totalConducted}</span>
            <span className="text-xs text-zinc-400 font-medium">Class Sessions</span>
          </div>
          <p className="text-[11px] text-zinc-400 pt-1">
            Calculated day-by-day since Aug 3, 2026 (Week {currentWeekNumber})
          </p>
        </div>

        {/* Card 3: Missed Classes */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>ABSENCES & BUNKS</span>
            <UserX className="h-4 w-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-bold font-mono text-white">{totalAbsent}</span>
            <span className="text-xs text-zinc-400 font-medium">Classes Missed</span>
          </div>
          <p className="text-[11px] text-zinc-400 pt-1">
            {totalLeaves > 0 ? `+ ${totalLeaves} Official/Medical Leaves recorded` : 'Excludes official campus holidays'}
          </p>
        </div>

        {/* Card 4: Subject Status */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>SUBJECT HEALTH</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              {subjectSummaries.filter((s) => s.isEligible).length}
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              / {subjectSummaries.length} Subjects Safe
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 pt-1">
            {subjectSummaries.filter((s) => !s.isEligible).length > 0
              ? `${subjectSummaries.filter((s) => !s.isEligible).length} subjects below 75% cutoff`
              : 'All subjects currently meet GGSIPU cutoff'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DATE & SESSION TIMELINE (PAST ATTENDANCE LOG)                     */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* Week Selector Ribbon */}
          <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-zinc-400" />
                Select Semester Week ({weeklySchedules.length} Weeks w.e.f. Aug 3, 2026)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white font-mono">
                  {activeWeekRange.label}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllWeekPresent}
                  className="text-[11px] h-7 px-2.5 bg-zinc-800/80 hover:bg-zinc-700"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                  Mark Full Week Present
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {weeklySchedules.map((w) => {
                const isSelected = w.weekNumber === selectedWeekNum;
                const isCurrent = currentWeekNumber === w.weekNumber;

                return (
                  <button
                    key={w.id}
                    onClick={() => handleSelectWeek(w.weekNumber)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <span>Week {w.weekNumber}</span>
                    {isCurrent && (
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                          isSelected
                            ? 'bg-zinc-950/20 text-zinc-950'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        CURRENT
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Navigator Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleShiftDate(-1)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">
                <CalendarDays className="h-4 w-4 text-zinc-400" />
                <input
                  type="date"
                  min="2026-08-03"
                  value={selectedDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    setSelectedDate(val);
                    setSelectedWeekNum(getWeekNumberFromDate(val));
                  }}
                  className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => handleShiftDate(1)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setSelectedDate(todayStr);
                  setSelectedWeekNum(getWeekNumberFromDate(todayStr));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-zinc-100 text-zinc-950 font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                Today
              </button>
            </div>

            {/* Batch Mark Day as Present Button */}
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleMarkAllDayPresent}
                className="text-xs font-semibold shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                Mark All Sessions Today Present
              </Button>
            </div>
          </div>

          {/* Week Days Strip (Monday to Saturday) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {weekDays.map((day) => {
              const isSelected = selectedDate === day.dateStr;
              const isToday = todayStr === day.dateStr;

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-100 border-white text-zinc-950 shadow-md ring-1 ring-white/20'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider">{day.shortName}</span>
                    {isToday && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-emerald-400'}`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-mono mt-0.5 ${
                      isSelected ? 'text-zinc-800 font-semibold' : 'text-zinc-500'
                    }`}
                  >
                    {day.formattedDay}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Date Header Info & Subject Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pt-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{formatHumanDate(selectedDate)}</span>
              {selectedDate === todayStr && (
                <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded">
                  TODAY
                </span>
              )}
            </h2>

            {/* Subject Filter */}
            <div className="flex items-center gap-2 text-xs">
              <Filter className="h-3.5 w-3.5 text-zinc-400" />
              <select
                value={timelineSubjectFilter}
                onChange={(e) => setTimelineSubjectFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {subjectSummaries.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectCode} - {s.subjectName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conducted Class Sessions List */}
          <div className="space-y-3">
            {sessionsOnSelectedDate.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
                <CalendarDays className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-zinc-300">No classes conducted on this date</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Sunday or gazetted university off-day for USAR AR-1 B2.
                </p>
              </div>
            ) : (
              sessionsOnSelectedDate.map((session) => {
                const sessionId = `session_${session.date}_${session.slotId}`;
                const attRec = sessionAttMap[sessionId];
                const currentStatus: SessionAttendanceStatus = attRec ? attRec.status : 'present';

                const isCollegeEvent =
                  session.isCollegeEvent ||
                  session.subjectId === 'college_event' ||
                  session.subjectName.toLowerCase().includes('orientation') ||
                  session.subjectName.toLowerCase().includes('induction') ||
                  session.subjectName.toLowerCase().includes('fest') ||
                  session.subjectName.toLowerCase().includes('function') ||
                  (session.changeNote ? (
                    session.changeNote.toLowerCase().includes('induction') ||
                    session.changeNote.toLowerCase().includes('orientation') ||
                    session.changeNote.toLowerCase().includes('fest') ||
                    session.changeNote.toLowerCase().includes('function')
                  ) : false);

                const isAllClassesCancelled =
                  session.isAllClassesCancelled ||
                  session.subjectId === 'all_classes_cancelled' ||
                  session.subjectName.toLowerCase().includes('all classes cancelled') ||
                  session.subjectName.toLowerCase().includes('no classes held');

                if (isCollegeEvent || isAllClassesCancelled) {
                  const eventTitle =
                    (session.subjectName === 'University Holiday / Off-Day' ||
                      session.subjectName === 'University Holiday' ||
                      session.subjectName === 'Off-Day / University Holiday')
                      ? (session.changeNote || 'Student Induction Program / College Event')
                      : session.subjectName;

                  const noteText =
                    session.changeNote && session.changeNote !== eventTitle
                      ? session.changeNote
                      : 'College Event / Special Activity — No classes held';

                  return (
                    <div
                      key={session.id}
                      className="rounded-xl border border-indigo-900/50 bg-gradient-to-r from-indigo-950/30 via-purple-950/20 to-zinc-950 p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-indigo-900/40 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                          {isAllClassesCancelled ? (
                            <Megaphone className="h-4 w-4" />
                          ) : (
                            <PartyPopper className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{eventTitle}</h4>
                          <span className="text-xs text-zinc-400">{noteText}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-indigo-300 border-indigo-800/80 bg-indigo-950/60 font-mono text-xs font-bold">
                        NO CLASSES HELD
                      </Badge>
                    </div>
                  );
                }

                if (session.isHoliday) {
                  return (
                    <div
                      key={session.id}
                      className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-900/40 border border-amber-800/60 flex items-center justify-center text-amber-400">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-amber-200">{session.subjectName}</h4>
                          <span className="text-xs text-amber-400/80">{session.changeNote || 'Campus Off-Day / Gazetted Holiday'}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-amber-400 border-amber-800/60 font-mono text-xs">
                        UNIVERSITY HOLIDAY
                      </Badge>
                    </div>
                  );
                }

                if (session.isCancelled || session.isMassBunk) {
                  return (
                    <div
                      key={session.id}
                      className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-rose-900/40 border border-rose-800/60 flex items-center justify-center text-rose-400">
                          <XCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-rose-300">
                              {session.startTime} – {session.endTime}
                            </span>
                            <h4 className="text-sm font-bold text-white">{session.subjectName}</h4>
                          </div>
                          <span className="text-xs text-rose-300/80">{session.changeNote}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-rose-400 border-rose-800/60 font-mono text-xs">
                        {session.isMassBunk ? 'MASS BUNK' : 'CANCELLED'}
                      </Badge>
                    </div>
                  );
                }

                return (
                  <div
                    key={session.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition-all hover:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-zinc-300">
                          {session.startTime} – {session.endTime}
                        </span>
                        {session.subjectCode && (
                          <Badge variant="outline" className="font-mono text-[10px] text-zinc-400">
                            {session.subjectCode}
                          </Badge>
                        )}
                        <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          {session.type}
                        </span>
                        {session.labGroup && session.labGroup !== 'all' && (
                          <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-900/60 px-1.5 py-0.2 rounded">
                            {session.labGroup.replace('Group ', '')}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white">{session.subjectName}</h4>

                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-zinc-500" />
                          {session.room}
                        </span>
                        <span>•</span>
                        <span>{session.faculty}</span>
                      </div>
                    </div>

                    {/* Quick 1-Click Status Selector */}
                    <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg p-1 self-start sm:self-auto">
                      {/* Present */}
                      <button
                        onClick={() => handleMarkSession(session, 'present')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          currentStatus === 'present'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold shadow-sm ring-1 ring-emerald-500/20'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Present</span>
                      </button>

                      {/* Absent */}
                      <button
                        onClick={() => handleMarkSession(session, 'absent')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          currentStatus === 'absent'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold shadow-sm ring-1 ring-rose-500/20'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                        <X className="h-3.5 w-3.5 text-rose-400" />
                        <span>Absent</span>
                      </button>

                      {/* Leave / Duty */}
                      <button
                        onClick={() => handleMarkSession(session, 'leave')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          currentStatus === 'leave'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800 font-bold shadow-sm ring-1 ring-amber-500/20'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                        <span>Duty / Leave</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUBJECT 75% BREAKDOWN & BUNK COUNTER                               */}
      {/* ========================================================================= */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-zinc-400">
              Showing official subject tallies conducted since August 3, 2026.
            </span>
            <Badge variant="outline" className="font-mono text-xs text-zinc-300">
              Cutoff: 75% per course
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectSummaries.map((sub) => {
              const isExpanded = expandedSubjectId === sub.subjectId;

              return (
                <div
                  key={sub.subjectId}
                  className={`rounded-xl border transition-all ${
                    sub.isEligible
                      ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                      : 'border-rose-900/60 bg-rose-950/10 hover:border-rose-800'
                  } p-5 space-y-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {sub.subjectCode && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {sub.subjectCode}
                          </Badge>
                        )}
                        <span className="text-xs text-zinc-400">{sub.faculty}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{sub.subjectName}</h4>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {sub.attended} attended / {sub.conducted} conducted classes
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-baseline gap-1 justify-end font-mono">
                        <span
                          className={`text-2xl font-bold ${
                            sub.isEligible ? 'text-white' : 'text-rose-400'
                          }`}
                        >
                          {sub.percentage}%
                        </span>
                      </div>
                      <Badge
                        variant={sub.isEligible ? 'default' : 'destructive'}
                        className="font-mono text-[9px] mt-0.5"
                      >
                        {sub.isEligible ? 'ELIGIBLE' : 'DEBARRED RISK'}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress Bar with 75% target marker */}
                  <div className="relative pt-1">
                    <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                      <div
                        className={`h-full transition-all ${
                          sub.isEligible ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, sub.percentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Bunk Indicator & Class Needed */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                    <span className="font-medium text-zinc-300">
                      {sub.isEligible ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Can safely bunk <strong>{sub.bunksAvailable}</strong> upcoming lecture
                          {sub.bunksAvailable !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Must attend next <strong>{sub.classesNeeded}</strong> consecutive lecture
                          {sub.classesNeeded !== 1 ? 's' : ''}
                        </span>
                      )}
                    </span>

                    <button
                      onClick={() => setExpandedSubjectId(isExpanded ? null : sub.subjectId)}
                      className="text-xs font-mono text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      {isExpanded ? 'Hide History' : 'View Sessions'}
                    </button>
                  </div>

                  {/* Expanded Session History for this Subject */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-zinc-800 space-y-2 animate-fade-in">
                      <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase block">
                        Conducted Class History
                      </span>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {dataService
                          .getConductedSessions('2026-08-03', todayStr, activeLabGroup)
                          .filter(
                            (s) =>
                              s.subjectId === sub.subjectId ||
                              s.subjectName.toLowerCase() === sub.subjectName.toLowerCase()
                          )
                          .map((sess) => {
                            const att =
                              sessionAttMap[`session_${sess.date}_${sess.slotId}`] ||
                              sessionAttMap[`att_${sess.date}_${sess.slotId}`];
                            const st = att ? att.status : 'present';

                            return (
                              <div
                                key={sess.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs"
                              >
                                <div>
                                  <span className="font-mono text-white font-semibold">
                                    {sess.date}
                                  </span>
                                  <span className="text-zinc-500 ml-2">
                                    {sess.startTime}–{sess.endTime}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleMarkSession(sess, 'present')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                                      st === 'present'
                                        ? 'bg-emerald-950 text-emerald-400 font-bold border border-emerald-800'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                  >
                                    P
                                  </button>
                                  <button
                                    onClick={() => handleMarkSession(sess, 'absent')}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                                      st === 'absent'
                                        ? 'bg-rose-950 text-rose-400 font-bold border border-rose-800'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                  >
                                    A
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ATTENDANCE & BUNK SIMULATOR                                        */}
      {/* ========================================================================= */}
      {activeTab === 'simulator' && (
        <div className="max-w-3xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">End-Semester Attendance Simulator</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Simulate upcoming lecture attendance to plan your leaves and ensure you stay above the 75% GGSIPU examination threshold.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            {/* Future Conducted Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-300">Future Classes to be Conducted:</span>
                <span className="font-mono text-emerald-400 font-bold">{simFutureConducted}</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={simFutureConducted}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSimFutureConducted(val);
                  if (simFutureAttended > val) setSimFutureAttended(val);
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Future Attended Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-zinc-300">Future Classes You Plan to Attend:</span>
                <span className="font-mono text-emerald-400 font-bold">{simFutureAttended}</span>
              </div>
              <input
                type="range"
                min="0"
                max={simFutureConducted}
                value={simFutureAttended}
                onChange={(e) => setSimFutureAttended(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Simulation Output Card */}
          {(() => {
            const projectedConducted = totalConducted + simFutureConducted;
            const projectedAttended = totalAttended + simFutureAttended;
            const projectedPercentage =
              projectedConducted === 0
                ? 100
                : Number(((projectedAttended / projectedConducted) * 100).toFixed(1));
            const isProjectedEligible = projectedPercentage >= 75;

            return (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 text-center">
                <span className="text-xs font-mono uppercase text-zinc-400">
                  PROJECTED END-SEMESTER ATTENDANCE
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span
                    className={`text-4xl sm:text-5xl font-bold font-mono ${
                      isProjectedEligible ? 'text-white' : 'text-rose-400'
                    }`}
                  >
                    {projectedPercentage}%
                  </span>
                  <Badge
                    variant={isProjectedEligible ? 'default' : 'destructive'}
                    className="font-mono text-xs"
                  >
                    {isProjectedEligible ? 'EXAM ELIGIBLE' : 'DEBARRED RISK'}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400">
                  Total {projectedAttended} attended out of {projectedConducted} total classes (
                  {totalAttended} current + {simFutureAttended} simulated).
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
