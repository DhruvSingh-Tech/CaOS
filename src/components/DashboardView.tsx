import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  MapPin,
  Megaphone,
  CheckSquare,
  AlarmClock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Vote,
  ShieldCheck,
  ChevronRight,
  CalendarDays,
  Percent,
  Calculator,
  UserCheck,
  LogIn,
  PartyPopper,
  Flame,
  Sun,
  Ban,
  CheckCircle2,
  BarChart3,
  Users,
  Layers,
  RefreshCw,
  Sliders,
  Trophy,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import {
  TimetableEntry,
  Announcement,
  Assignment,
  Exam,
  AuditLogEntry,
  AttendanceRecord,
  Poll,
  UserRole,
} from '../types';
import { useAuth } from '../lib/auth';
import { dataService } from '../services/dataService';
import { getTodayDateStr, parseLocalDate } from '../lib/dateUtils';

interface DashboardViewProps {
  currentRole: UserRole;
  timetable: TimetableEntry[];
  announcements: Announcement[];
  assignments: Assignment[];
  exams: Exam[];
  auditLog: AuditLogEntry[];
  attendance: AttendanceRecord[];
  polls?: Poll[];
  onNavigate: (view: string) => void;
  onOpenAI: () => void;
  onOpenAuthModal?: () => void;
}

export function DashboardView({
  currentRole,
  timetable,
  announcements,
  assignments,
  exams,
  auditLog,
  attendance: _legacyAttendance,
  polls = [],
  onNavigate,
  onOpenAI,
  onOpenAuthModal,
}: DashboardViewProps) {
  const { user } = useAuth();
  const [attendanceSimBonus, setAttendanceSimBonus] = useState(0);

  // Group selection for today's dashboard schedule
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'Group B2-A' | 'Group B2-B'>(
    user?.labGroup || 'Group B2-A'
  );

  React.useEffect(() => {
    if (user?.labGroup) {
      setSelectedGroup(user.labGroup);
    }
  }, [user?.labGroup]);

  // Today's Date Info
  const todayStr = getTodayDateStr();
  const todayDateObj = parseLocalDate(todayStr);
  const now = new Date();

  const formattedDate = todayDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const hour = now.getHours();
  const greetingTime =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const displayName = user ? user.name.split(' ')[0] : 'Guest';

  // Check if today has any daily overrides (College Event, Holiday, All Cancelled, Mass Bunk)
  const fullDayEvent = useMemo(() => {
    const overrides = dataService.getDailyOverrides(todayStr);
    return overrides.find(
      (o) =>
        o.type === 'holiday' ||
        o.type === 'college_event' ||
        o.type === 'all_classes_cancelled' ||
        (!o.slotId && (o.type === 'cancelled' || o.type === 'mass_bunk'))
    );
  }, [todayStr, dataService.getState().dailyOverrides]);

  const isTodayHoliday = fullDayEvent?.type === 'holiday';
  const isTodayCollegeEvent = fullDayEvent?.type === 'college_event';
  const isTodayAllCancelled = fullDayEvent?.type === 'all_classes_cancelled';
  const isTodayMassBunk = fullDayEvent?.type === 'mass_bunk';
  const isWeekend = todayDateObj.getDay() === 0;

  // Effective schedule for today derived dynamically from DataService
  const todaySchedule = useMemo(() => {
    return dataService.getEffectiveDaySchedule(todayStr, selectedGroup);
  }, [
    todayStr,
    selectedGroup,
    timetable,
    dataService.getState().dailyOverrides,
    dataService.getState().weeklySchedules,
  ]);

  // Next Class Calculation
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const regularSlots = useMemo(() => {
    if (fullDayEvent || isWeekend) return [];
    return todaySchedule.filter((s) => s.subjectId !== 'holiday' && s.subjectId !== 'college_event' && s.subjectId !== 'all_classes_cancelled');
  }, [todaySchedule, fullDayEvent, isWeekend]);

  const activeNextClass = useMemo(() => {
    if (regularSlots.length === 0) return null;

    // Find class currently in progress or upcoming next
    for (const slot of regularSlots) {
      const [sH, sM] = slot.startTime.split(':').map(Number);
      const [eH, eM] = slot.endTime.split(':').map(Number);
      const startMin = sH * 60 + sM;
      const endMin = eH * 60 + eM;

      if (currentMinutes >= startMin && currentMinutes < endMin) {
        return {
          ...slot,
          status: 'in_progress' as const,
          countdown: 'In Progress Now',
        };
      }
      if (currentMinutes < startMin) {
        const diff = startMin - currentMinutes;
        const countdown = diff < 60 ? `in ${diff} mins` : `in ${Math.floor(diff / 60)}h ${diff % 60}m`;
        return {
          ...slot,
          status: 'upcoming' as const,
          countdown,
        };
      }
    }

    // If day is over, return null
    return null;
  }, [regularSlots, currentMinutes]);

  // Live Attendance Statistics
  const subjectSummaries = useMemo(() => {
    return dataService.getSubjectAttendanceSummaries(selectedGroup);
  }, [selectedGroup, dataService.getState().sessionAttendance, dataService.getState().dailyOverrides]);

  const liveAttended = subjectSummaries.reduce((acc, s) => acc + s.attended, 0) + attendanceSimBonus;
  const liveConducted = subjectSummaries.reduce((acc, s) => acc + s.conducted, 0) + (attendanceSimBonus > 0 ? attendanceSimBonus : 0);
  const overallPercentage = liveConducted === 0 ? 100 : Math.round((liveAttended / liveConducted) * 100);

  const pendingAssignments = assignments.filter((a) => a.status !== 'completed');
  const urgentAnnouncements = announcements.filter((a) => a.priority === 'urgent');

  // Interactive Poll Voting on Dashboard
  const activePolls = useMemo(() => {
    return (polls.length > 0 ? polls : dataService.getState().polls || []).slice(0, 2);
  }, [polls, dataService.getState().polls]);

  const handleVotePoll = (pollId: string, optionIndex: number) => {
    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    dataService.votePoll(pollId, optionIndex);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner: Dynamic Greeting & Quick Command Deck */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-xs font-mono font-medium mb-2.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {formattedDate} • USAR AR-1 B2
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {greetingTime}, {displayName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              {isTodayCollegeEvent
                ? `Special Campus Event today (${fullDayEvent?.alteredSubject || 'College Function'}). Regular classes are suspended.`
                : isTodayHoliday
                ? `Campus is closed today for ${fullDayEvent?.alteredSubject || 'University Holiday'}. Enjoy your break!`
                : isTodayAllCancelled
                ? 'All academic classes have been cancelled for today.'
                : isWeekend
                ? 'It is Sunday! No academic sessions scheduled today.'
                : `You have ${regularSlots.length} academic sessions scheduled today.`}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('attendance')}
              className="text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
            >
              <UserCheck className="h-3.5 w-3.5 text-zinc-400 mr-1" />
              Log Attendance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('whats-changed')}
              className="text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
            >
              <Clock className="h-3.5 w-3.5 text-zinc-400 mr-1" />
              What's Changed?
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onOpenAI}
              className="text-xs font-semibold shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1 text-zinc-950" />
              Ask AI
            </Button>
          </div>
        </div>

        {/* Guest Onboarding Callout if Logged Out */}
        {!user && (
          <div className="mt-5 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                <LogIn className="h-4 w-4" />
              </div>
              <p className="text-xs text-zinc-300">
                You are currently in <strong className="text-white">Guest Mode</strong>. Sign in to record your attendance, submit coursework, and participate in class polls.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={onOpenAuthModal}
              className="text-xs shrink-0"
            >
              Sign In Now
            </Button>
          </div>
        )}
      </div>

      {/* Top Priority Live Class Poll Banner if Active */}
      {activePolls.length > 0 && activePolls[0].status === 'active' && (
        <div
          onClick={() => onNavigate('polls')}
          className="rounded-2xl border border-purple-700/80 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-zinc-950 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-purple-600 transition-all shadow-lg ring-1 ring-purple-500/20"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-purple-950 border border-purple-600 text-purple-300 flex items-center justify-center shrink-0 animate-pulse">
              <Vote className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                  LIVE CLASS POLL IN PROGRESS
                </span>
                <span className="text-xs font-mono text-zinc-300">
                  Closes {new Date(activePolls[0].expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                {activePolls[0].question}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              variant="default"
              size="sm"
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold"
            >
              Cast Your Vote
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Urgent Broadcast Notice if Active */}
      {urgentAnnouncements.length > 0 && (
        <div
          onClick={() => onNavigate('announcements')}
          className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-amber-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                  URGENT NOTICE
                </span>
                <span className="text-xs font-bold text-white">
                  {urgentAnnouncements[0].title}
                </span>
              </div>
              <p className="text-xs text-zinc-300 line-clamp-1 mt-0.5">
                {urgentAnnouncements[0].content}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
        </div>
      )}

      {/* Bento Grid: 3-Column Interactive Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Live Session Radar & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* ========================================================================= */}
          {/* Hero Radar Card (Dynamic based on Events / Holidays / Active Session)     */}
          {/* ========================================================================= */}
          {isTodayCollegeEvent ? (
            <div className="rounded-2xl border border-indigo-800/80 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-zinc-950 p-6 backdrop-blur-sm shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-900/60">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-950 border border-indigo-700 text-indigo-300 flex items-center justify-center shrink-0">
                    <PartyPopper className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-indigo-300 border-indigo-700 bg-indigo-950/80 font-mono text-[10px] font-bold">
                        NO CLASSES HELD • COLLEGE EVENT
                      </Badge>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                      {fullDayEvent?.alteredSubject || 'Student Induction Program / College Function'}
                    </h2>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-1.5 text-center shrink-0">
                  <div className="text-[10px] font-mono text-zinc-400">VENUE</div>
                  <div className="text-xs font-bold text-white flex items-center justify-center gap-1 font-mono">
                    <MapPin className="h-3 w-3 text-zinc-400" />
                    {fullDayEvent?.alteredRoom || 'Main Auditorium'}
                  </div>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 block font-mono text-[10px]">TIME WINDOW</span>
                  <span className="font-mono font-semibold text-white mt-0.5 block">
                    {fullDayEvent?.startTime || '09:00'} – {fullDayEvent?.endTime || '17:00'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 block font-mono text-[10px]">ORGANIZER</span>
                  <span className="font-semibold text-white mt-0.5 block truncate">
                    {fullDayEvent?.alteredFaculty || fullDayEvent?.reportedBy || 'Student Council / USAR'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 block font-mono text-[10px]">ACADEMIC STATUS</span>
                  <span className="font-semibold text-emerald-400 mt-0.5 block">
                    Classes Suspended
                  </span>
                </div>
              </div>
            </div>
          ) : isTodayHoliday ? (
            <div className="rounded-2xl border border-amber-800/80 bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 p-6 backdrop-blur-sm shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-amber-950 border border-amber-700 text-amber-300 flex items-center justify-center shrink-0">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-amber-400 border-amber-700 bg-amber-950/80 font-mono text-[10px] font-bold">
                      CAMPUS CLOSED • UNIVERSITY HOLIDAY
                    </Badge>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                      {fullDayEvent?.alteredSubject || 'University Holiday / Off-Day'}
                    </h2>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-1.5 text-center shrink-0">
                  <div className="text-[10px] font-mono text-zinc-400">STATUS</div>
                  <div className="text-xs font-bold text-amber-400 font-mono">
                    Campus Closed
                  </div>
                </div>
              </div>

              <p className="pt-3 text-xs text-zinc-300 leading-relaxed">
                {fullDayEvent?.reason || 'Official university holiday — Enjoy your break! No classes conducted today.'}
              </p>
            </div>
          ) : isTodayAllCancelled ? (
            <div className="rounded-2xl border border-rose-800/80 bg-gradient-to-br from-rose-950/30 via-zinc-900 to-zinc-950 p-6 backdrop-blur-sm shadow-xl">
              <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-800">
                <div className="h-10 w-10 rounded-xl bg-rose-950 border border-rose-700 text-rose-300 flex items-center justify-center shrink-0">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <Badge variant="outline" className="text-rose-400 border-rose-700 bg-rose-950/80 font-mono text-[10px] font-bold">
                    ALL CLASSES CANCELLED TODAY
                  </Badge>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                    {fullDayEvent?.alteredSubject || 'All Academic Classes Suspended'}
                  </h2>
                </div>
              </div>
              <p className="pt-3 text-xs text-zinc-300 leading-relaxed">
                {fullDayEvent?.reason || 'Classes cancelled as notified by Class Representatives / Faculty.'}
              </p>
            </div>
          ) : isWeekend ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-800">
                <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <Badge variant="outline" className="text-zinc-400 border-zinc-700 font-mono text-[10px]">
                    WEEKEND BREAK
                  </Badge>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    Sunday — No Classes Scheduled
                  </h2>
                </div>
              </div>
              <p className="pt-3 text-xs text-zinc-400">
                Campus is closed for regular lectures. Prepare for upcoming assignments or review notes.
              </p>
            </div>
          ) : activeNextClass ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <span className="text-[11px] font-mono font-semibold uppercase text-zinc-400">
                    {activeNextClass.status === 'in_progress' ? 'CURRENT ACTIVE SESSION' : 'NEXT UPCOMING SESSION'}
                  </span>
                  <div className="flex items-baseline gap-2.5 mt-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {activeNextClass.subjectName}
                    </h2>
                    <Badge
                      variant={activeNextClass.status === 'in_progress' ? 'default' : 'secondary'}
                      className="font-mono text-[11px]"
                    >
                      {activeNextClass.countdown}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-1.5 text-center">
                    <div className="text-[10px] font-mono text-zinc-400">ROOM</div>
                    <div className="text-sm font-bold text-white flex items-center justify-center gap-1 font-mono">
                      <MapPin className="h-3 w-3 text-zinc-400" />
                      {activeNextClass.room}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 block font-mono text-[10px]">TIME WINDOW</span>
                  <span className="font-mono font-semibold text-white mt-0.5 block">
                    {activeNextClass.startTime} – {activeNextClass.endTime}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 block font-mono text-[10px]">FACULTY</span>
                  <span className="font-semibold text-white mt-0.5 block truncate">
                    {activeNextClass.faculty}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 block font-mono text-[10px]">SESSION TYPE</span>
                  <span className="font-semibold text-zinc-200 mt-0.5 block uppercase">
                    {activeNextClass.type}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-white">All Lectures Completed for Today 🎉</h2>
              <p className="text-xs text-zinc-400 mt-1">
                You have completed all scheduled classes for {formattedDate}.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* Today's Schedule Timeline                                                 */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-zinc-400" />
                  Today's Timeline ({formattedDate})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Chronological schedule for USAR AR-1 B2
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Lab Group Selector */}
                <div className="flex items-center p-0.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  {(['all', 'Group B2-A', 'Group B2-B'] as const).map((grp) => (
                    <button
                      key={grp}
                      onClick={() => setSelectedGroup(grp)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        selectedGroup === grp
                          ? 'bg-zinc-800 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {grp === 'all' ? 'All' : grp.replace('Group ', '')}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('timetable')}
                  className="text-xs"
                >
                  Full TT
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>

            <div className="space-y-2.5">
              {isTodayCollegeEvent ? (
                <div className="p-5 rounded-xl border border-indigo-900/60 bg-indigo-950/20 text-center space-y-2">
                  <PartyPopper className="h-6 w-6 text-indigo-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">{fullDayEvent?.alteredSubject}</h4>
                  <p className="text-xs text-zinc-400">{fullDayEvent?.reason || 'All regular academic classes suspended for university event.'}</p>
                </div>
              ) : isTodayHoliday ? (
                <div className="p-5 rounded-xl border border-amber-900/60 bg-amber-950/20 text-center space-y-2">
                  <Sun className="h-6 w-6 text-amber-400 mx-auto" />
                  <h4 className="text-sm font-bold text-amber-200">{fullDayEvent?.alteredSubject}</h4>
                  <p className="text-xs text-zinc-400">{fullDayEvent?.reason || 'Campus off-day / Gazetted holiday.'}</p>
                </div>
              ) : isTodayAllCancelled ? (
                <div className="p-5 rounded-xl border border-rose-900/60 bg-rose-950/20 text-center space-y-2">
                  <Ban className="h-6 w-6 text-rose-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">{fullDayEvent?.alteredSubject}</h4>
                  <p className="text-xs text-zinc-400">{fullDayEvent?.reason || 'All classes cancelled today.'}</p>
                </div>
              ) : todaySchedule.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl">
                  No classes scheduled for today. Enjoy your day!
                </div>
              ) : (
                todaySchedule.map((item) => {
                  const [sH, sM] = item.startTime.split(':').map(Number);
                  const [eH, eM] = item.endTime.split(':').map(Number);
                  const isCurrent = currentMinutes >= sH * 60 + sM && currentMinutes < eH * 60 + eM;
                  const isPast = currentMinutes >= eH * 60 + eM;

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-emerald-700/80 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                          : isPast
                          ? 'border-zinc-800/60 bg-zinc-950/50 opacity-75'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="rounded-md bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-center min-w-[72px]">
                          <span className="text-xs font-mono font-bold text-white block">
                            {item.startTime}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 block">
                            {item.endTime}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {item.subjectName}
                            </span>
                            <span className="text-[9px] uppercase font-mono font-semibold px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                              {item.type}
                            </span>
                            {item.labGroup && item.labGroup !== 'all' && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                                {item.labGroup.replace('Group ', '')}
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse">
                                LIVE NOW
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 block mt-0.5">
                            {item.faculty} • {item.room}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 self-end sm:self-center mt-2 sm:mt-0">
                        {item.room}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Side Widgets (Live Polls, Attendance Health, Due Coursework) */}
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* LIVE CLASS POLLS WIDGET (Direct interactive voting on Dashboard)          */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Vote className="h-4 w-4 text-purple-400" />
                  Live Class Polls
                </h3>
                <span className="text-xs text-zinc-400">Decisions & Timetable Consensus</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('polls')}
                className="text-xs p-1 text-purple-300 hover:text-purple-200"
              >
                All Polls <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>

            {activePolls.length === 0 ? (
              <div className="p-5 text-center text-xs text-zinc-400 bg-zinc-950 rounded-xl border border-zinc-800">
                <Vote className="h-6 w-6 text-zinc-500 mx-auto mb-1.5" />
                <p>No active polls right now.</p>
                {user && (user.role === 'cr' || user.role === 'admin') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('polls')}
                    className="text-[11px] mt-2.5"
                  >
                    Create Class Poll
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {activePolls.map((poll) => {
                  const totalVotes = poll.options.reduce((acc, o) => acc + o.votes, 0);
                  const hasVoted = user && poll.options.some((o) => o.votedUserIds?.includes(user.id));

                  return (
                    <div
                      key={poll.id}
                      className={`p-4 rounded-xl border space-y-3 ${
                        poll.status === 'declared'
                          ? 'border-amber-800/80 bg-gradient-to-br from-amber-950/20 via-zinc-900 to-zinc-950'
                          : 'border-zinc-800 bg-zinc-950'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {poll.status === 'declared' && (
                            <span className="text-[9px] font-mono font-bold text-amber-400 uppercase bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800 block w-fit mb-1">
                              DECISION DECLARED
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-white leading-snug">
                            {poll.question}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                        </span>
                      </div>

                      {/* Declaration message if declared */}
                      {poll.status === 'declared' && poll.declarationMessage && (
                        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200">
                          <span className="font-bold flex items-center gap-1 text-amber-300">
                            <Trophy className="h-3 w-3 text-amber-400" />
                            CR Announcement:
                          </span>
                          <p className="mt-0.5 leading-tight">"{poll.declarationMessage}"</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        {poll.options.map((option, idx) => {
                          const percentage = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
                          const isWinner = poll.status === 'declared' && poll.winningOptionId === option.id;
                          const isUserPick = user && (poll.userVotedOptionId === option.id || option.votedUserIds?.includes(user.id));
                          const canVote = poll.status === 'active';

                          return (
                            <button
                              key={idx}
                              onClick={() => canVote && handleVotePoll(poll.id, idx)}
                              className={`relative w-full overflow-hidden rounded-lg p-2 text-left transition-all border text-xs ${
                                isWinner
                                  ? 'border-amber-500 bg-amber-950/40 text-amber-200 font-bold'
                                  : isUserPick
                                  ? 'border-purple-600 bg-purple-950/40 text-white font-semibold'
                                  : canVote
                                  ? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-300 cursor-pointer'
                                  : 'border-zinc-800/60 bg-zinc-900/40 text-zinc-400 cursor-default'
                              }`}
                            >
                              {/* Percentage Progress Bar Fill */}
                              <div
                                className={`absolute inset-y-0 left-0 transition-all ${
                                  isWinner
                                    ? 'bg-amber-600/30'
                                    : isUserPick
                                    ? 'bg-purple-600/30'
                                    : 'bg-zinc-800/40'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />

                              <div className="relative z-10 flex items-center justify-between">
                                <span className="flex items-center gap-1.5 truncate">
                                  {isWinner ? (
                                    <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                  ) : isUserPick ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                  ) : null}
                                  <span className="truncate">{option.text}</span>
                                </span>
                                <span className="font-mono text-[11px] font-semibold text-zinc-300 ml-2 shrink-0">
                                  {percentage}%
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-900">
                        <span>By {poll.createdBy}</span>
                        <span>{poll.status === 'declared' ? 'Voting concluded' : hasVoted ? 'Your vote is recorded' : 'Click to vote'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* Attendance Health (75% Safe Threshold) Widget                             */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-400" />
                  Attendance Radar
                </h3>
                <span className="text-xs text-zinc-400">75% GGSIPU Policy</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('attendance')}
                className="text-xs p-1 text-emerald-300 hover:text-emerald-200"
              >
                Ledger <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-2">
              <div
                className={`text-3xl font-bold font-mono ${
                  overallPercentage >= 75 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {overallPercentage}%
              </div>
              <p className="text-xs text-zinc-400">
                {overallPercentage >= 75
                  ? 'Safe for mid-term & end-term exams.'
                  : 'Action needed: Below 75% statutory requirement.'}
              </p>
              <div className="text-[11px] font-mono text-zinc-400 pt-1">
                {liveAttended} attended out of {liveConducted} conducted
              </div>
            </div>

            {/* Quick interactive simulator */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>Simulate Next Sessions:</span>
                <span className="font-mono text-white">
                  {attendanceSimBonus >= 0 ? `+${attendanceSimBonus}` : attendanceSimBonus} Sessions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAttendanceSimBonus((b) => Math.max(-5, b - 1))}
                  className="flex-1 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                >
                  Miss (-1)
                </button>
                <button
                  onClick={() => setAttendanceSimBonus((b) => b + 1)}
                  className="flex-1 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                >
                  Attend (+1)
                </button>
                <button
                  onClick={() => setAttendanceSimBonus(0)}
                  className="px-2 py-1 text-xs rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Due Coursework & Submissions                                              */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-zinc-400" />
                  Due Coursework
                </h3>
                <span className="text-xs text-zinc-400">
                  {pendingAssignments.length} Pending
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('assignments')}
                className="text-xs p-1"
              >
                View All <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>

            <div className="space-y-2.5">
              {pendingAssignments.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400 bg-zinc-950 rounded-xl border border-zinc-800">
                  All assignments completed!
                </div>
              ) : (
                pendingAssignments.slice(0, 3).map((asg) => (
                  <div
                    key={asg.id}
                    onClick={() => onNavigate('assignments')}
                    className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white truncate max-w-[170px]">
                        {asg.title}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400">
                        {new Date(asg.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 block mt-1">
                      {asg.subjectName}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Active Poll Action Pill */}
      {activePolls.length > 0 && activePolls[0].status === 'active' && (
        <div
          onClick={() => onNavigate('polls')}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-2xl shadow-purple-950/60 border border-purple-400/40 cursor-pointer transition-all hover:scale-105 animate-bounce-subtle"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <Vote className="h-4 w-4" />
          <span className="text-xs font-bold font-mono">Live Poll Active: Vote Now</span>
        </div>
      )}
    </div>
  );
}
