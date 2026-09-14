import React, { useState, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  Clock,
  MapPin,
  FileSpreadsheet,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Lock,
  ShieldCheck,
  History,
  FileText,
  Filter,
  Columns,
  List,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Info,
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
  Ban,
  Flame,
  Sun,
  Edit3,
  Layers,
  PartyPopper,
  RotateCcw,
  Trash2,
  Megaphone,
  Users,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import {
  TimetableEntry,
  TimetableDiff,
  UserRole,
  DayAlterationType,
  WeeklyTimetableSchedule,
} from '../types';
import {
  LATEST_UNIVERSITY_BATCHES,
  BatchTimetableMetadata,
  filterTimetableByLabGroup,
} from '../data/latestTimetableDataset';
import { parseTimetablePDF, calculateTimetableDiffs } from '../lib/pdfTimetableParser';
import { uploadAcademicFile } from '../lib/storage';
import { dataService } from '../services/dataService';
import { useAuth } from '../lib/auth';
import {
  formatLocalDate,
  parseLocalDate,
  getTodayDateStr,
  getWeekDateRange,
  getWeekNumberFromDate,
} from '../lib/dateUtils';

interface SmartTimetableViewProps {
  currentRole: UserRole;
  timetable: TimetableEntry[];
  version: number;
  onNavigateToChangelog: () => void;
  onOpenAuthModal?: () => void;
}

export function SmartTimetableView({
  currentRole,
  timetable,
  version,
  onNavigateToChangelog,
  onOpenAuthModal,
}: SmartTimetableViewProps) {
  const { user } = useAuth();
  const canPublish = !!user && (user.role === 'cr' || user.role === 'admin' || user.role === 'faculty');

  // View Mode: 'agenda' (Daily Class Log & Date Alterations) | 'calendar' (Week Grid)
  const [viewMode, setViewMode] = useState<'agenda' | 'calendar'>('agenda');

  // Weekly Schedules from DataService
  const weeklySchedules = dataService.getWeeklySchedules();

  // Find Current Week (Week containing today: Sep 14, 2026 is Week 7)
  const todayStr = getTodayDateStr();
  const initialWeekIndex = useMemo(() => {
    return getWeekNumberFromDate(todayStr);
  }, [todayStr]);

  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(initialWeekIndex);
  const activeWeekSchedule = weeklySchedules.find((w) => w.weekNumber === selectedWeekNum) || weeklySchedules[0];

  // Date selection for Daily Class Log (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [filterType, setFilterType] = useState<string>('all');
  const [activeLabGroup, setActiveLabGroup] = useState<'all' | 'Group B2-A' | 'Group B2-B'>(
    user?.labGroup ? user.labGroup : 'Group B2-A'
  );

  React.useEffect(() => {
    if (user?.labGroup) {
      setActiveLabGroup(user.labGroup);
    }
  }, [user?.labGroup]);

  // Selected Class Inspector Modal
  const [selectedSlot, setSelectedSlot] = useState<TimetableEntry | null>(null);

  // Alter Schedule Modal (CR / Super-Admin feature)
  const [isAlterModalOpen, setIsAlterModalOpen] = useState(false);
  const [alterType, setAlterType] = useState<DayAlterationType>('swap');
  const [targetSlotId, setTargetSlotId] = useState<string>('');
  const [alteredSubject, setAlteredSubject] = useState('');
  const [alteredRoom, setAlteredRoom] = useState('');
  const [alteredFaculty, setAlteredFaculty] = useState('');
  const [alterStartTime, setAlterStartTime] = useState('10:00');
  const [alterEndTime, setAlterEndTime] = useState('11:00');
  const [alterReason, setAlterReason] = useState('');

  // PDF Import Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<'upload' | 'parsing' | 'review'>('upload');
  const [targetUploadWeek, setTargetUploadWeek] = useState<number>(selectedWeekNum);
  const [applyFromWeekOnwards, setApplyFromWeekOnwards] = useState<boolean>(true);
  const [fileName, setFileName] = useState('Final TT-I SEM- Odd SEM-2026-27.pdf');
  const [detectedBatches, setDetectedBatches] = useState<Record<string, BatchTimetableMetadata>>(LATEST_UNIVERSITY_BATCHES);
  const [selectedBatchKey, setSelectedBatchKey] = useState<string>('AR-I_B2');
  const [modalLabGroup, setModalLabGroup] = useState<'all' | 'Group B2-A' | 'Group B2-B'>('all');
  const [detectedDiffs, setDetectedDiffs] = useState<TimetableDiff[]>([]);
  const [changeReason, setChangeReason] = useState(
    'Official USAR University Timetable (Odd Semester 2026-27 w.e.f. 3rd Aug 2026)'
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const days = [
    { id: '1', label: 'Monday', short: 'Mon' },
    { id: '2', label: 'Tuesday', short: 'Tue' },
    { id: '3', label: 'Wednesday', short: 'Wed' },
    { id: '4', label: 'Thursday', short: 'Thu' },
    { id: '5', label: 'Friday', short: 'Fri' },
    { id: '6', label: 'Saturday', short: 'Sat' },
  ];

  // Days of the active week starting strictly from Monday
  const weekDays = useMemo(() => {
    const range = getWeekDateRange(selectedWeekNum);
    const mon = parseLocalDate(range.startDate);
    const dayList = [];
    const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const fullNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 6; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dateStr = formatLocalDate(d);
      const dayNum = i + 1; // 1 = Mon, 2 = Tue, ..., 6 = Sat
      dayList.push({
        dayNum,
        shortName: dayNames[i],
        fullName: fullNames[i],
        dateStr,
        formattedDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    return dayList;
  }, [selectedWeekNum]);

  // Effective schedule for the selected date
  const effectiveDaySchedule = useMemo(() => {
    return dataService.getEffectiveDaySchedule(selectedDate, activeLabGroup);
  }, [selectedDate, activeLabGroup, timetable, dataService.getState().dailyOverrides, dataService.getState().weeklySchedules]);

  // Active week's timetable slots filtered
  const activeWeekSlots = useMemo(() => {
    let list = activeWeekSchedule ? activeWeekSchedule.slots : timetable;
    if (activeLabGroup !== 'all') {
      list = filterTimetableByLabGroup(list, activeLabGroup);
    }
    if (filterType !== 'all') {
      list = list.filter((item) => item.type === filterType);
    }
    return list;
  }, [activeWeekSchedule, activeLabGroup, filterType, timetable]);

  const selectedDateObj = parseLocalDate(selectedDate);
  const formattedSelectedDate = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Shift selected date
  const handleShiftDate = (daysCount: number) => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + daysCount);
    const nextDateStr = formatLocalDate(d);
    setSelectedDate(nextDateStr);
    setSelectedWeekNum(getWeekNumberFromDate(nextDateStr));
  };

  // Switch week
  const handleSelectWeek = (weekNum: number) => {
    setSelectedWeekNum(weekNum);
    const range = getWeekDateRange(weekNum);
    setSelectedDate(range.startDate); // Set to Monday of that week
  };

  // Overrides registered for the selected date
  const dailyOverridesForSelectedDate = useMemo(() => {
    return dataService.getDailyOverrides(selectedDate);
  }, [selectedDate, dataService.getState().dailyOverrides]);

  // Full day override for this date if any
  const fullDayOverrideOnSelectedDate = useMemo(() => {
    return dailyOverridesForSelectedDate.find(
      (o) =>
        o.type === 'holiday' ||
        o.type === 'all_classes_cancelled' ||
        o.type === 'college_event' ||
        (!o.slotId && (o.type === 'cancelled' || o.type === 'mass_bunk'))
    );
  }, [dailyOverridesForSelectedDate]);

  // Remove daily override / restore regular classes
  const handleRemoveOverride = async (overrideId: string) => {
    if (!canPublish) return;
    await dataService.removeDailyOverride(overrideId);
    confetti({
      particleCount: 50,
      spread: 60,
    });
  };

  // Open Alteration Modal for a specific slot or general date
  const handleOpenAlterModal = (slot?: TimetableEntry, defaultType: DayAlterationType = 'swap') => {
    if (!canPublish) {
      if (!user && onOpenAuthModal) onOpenAuthModal();
      return;
    }
    if (slot) {
      setTargetSlotId(slot.id);
      setAlteredSubject(slot.subjectName);
      setAlteredRoom(slot.room);
      setAlteredFaculty(slot.faculty);
      setAlterStartTime(slot.startTime);
      setAlterEndTime(slot.endTime);
      setAlterType(defaultType);
      setAlterReason(defaultType === 'cancelled' ? 'Faculty unavailable / Class cancelled' : 'Teacher on leave / Rescheduled session');
    } else {
      setTargetSlotId('');
      if (defaultType === 'college_event' || defaultType === 'all_classes_cancelled') {
        setAlteredSubject('Srijan Clubs Orientation');
        setAlteredRoom('Main Auditorium');
        setAlteredFaculty('Student Council & Srijan Society');
        setAlterStartTime('09:00');
        setAlterEndTime('17:00');
        setAlterType(defaultType);
        setAlterReason('All regular academic classes suspended for university event.');
      } else {
        setAlteredSubject('Mathematics-I (Extra Session)');
        setAlteredRoom('A-403');
        setAlteredFaculty('Dr. Arti Singh');
        setAlterStartTime('14:00');
        setAlterEndTime('15:00');
        setAlterType(defaultType);
        setAlterReason('Make-up class for missed topics');
      }
    }
    setIsAlterModalOpen(true);
  };

  const handleSaveDailyAlteration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublish) return;

    const matchedSlot = activeWeekSlots.find((s) => s.id === targetSlotId);
    const publisherName = user ? `${user.name} (${user.role.toUpperCase()})` : 'USAR CR';

    let finalSubject = alteredSubject;
    let finalRoom = alteredRoom;
    let finalFaculty = alteredFaculty;

    if (alterType === 'holiday') {
      finalSubject = alteredSubject || 'University Holiday / Off-Day';
      finalRoom = 'Campus Closed';
      finalFaculty = 'Administration';
    } else if (alterType === 'all_classes_cancelled') {
      finalSubject = alteredSubject || 'All Classes Cancelled';
      finalRoom = alteredRoom || 'Campus';
      finalFaculty = alteredFaculty || publisherName;
    } else if (alterType === 'college_event') {
      finalSubject = alteredSubject || 'College Event / Function';
      finalRoom = alteredRoom || 'Main Auditorium';
      finalFaculty = alteredFaculty || 'Student Council / Organizers';
    } else if (alterType === 'mass_bunk') {
      finalSubject = matchedSlot ? `${matchedSlot.subjectName} (Mass Bunk)` : (alteredSubject || 'Full Day Mass Bunk');
    } else if (alterType === 'cancelled') {
      finalSubject = matchedSlot ? `${matchedSlot.subjectName} (Cancelled)` : (alteredSubject || 'Class Cancelled');
    }

    await dataService.addDailyOverride({
      date: selectedDate,
      slotId: (alterType === 'holiday' || alterType === 'all_classes_cancelled' || alterType === 'college_event') ? undefined : (targetSlotId || undefined),
      originalSubject: matchedSlot ? matchedSlot.subjectName : undefined,
      alteredSubject: finalSubject,
      alteredRoom: finalRoom,
      alteredFaculty: finalFaculty,
      startTime: alterStartTime,
      endTime: alterEndTime,
      type: alterType,
      reason: alterReason || 'Class alteration registered by CR',
      reportedBy: publisherName,
    });

    setIsAlterModalOpen(false);
    confetti({
      particleCount: 60,
      spread: 60,
    });
  };

  // Open Import Modal
  const handleStartUpload = () => {
    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    if (!canPublish) {
      alert('Access Restricted: Only designated Class Representatives (CR) and Administrators can upload or publish timetables.');
      return;
    }
    setTargetUploadWeek(selectedWeekNum);
    setUploadStep('upload');
    setIsUploadModalOpen(true);
  };

  const handleFileProcess = async (file: File) => {
    setFileName(file.name);
    setUploadStep('parsing');

    uploadAcademicFile('timetables', file, 'official-circulars').catch((err) => {
      console.warn('Storage upload background notice:', err);
    });

    try {
      const parsed = await parseTimetablePDF(file);
      setDetectedBatches(parsed);
      const targetBatch = parsed['AR-I_B2'] ? 'AR-I_B2' : Object.keys(parsed)[0];
      setSelectedBatchKey(targetBatch);
      const targetSlots = parsed[targetBatch]?.slots || [];
      const diffs = calculateTimetableDiffs(activeWeekSlots, targetSlots);
      setDetectedDiffs(diffs);
      setUploadStep('review');
    } catch (err) {
      console.error('PDF parsing error:', err);
      const fallbackBatch = LATEST_UNIVERSITY_BATCHES['AR-I_B2'];
      setDetectedBatches(LATEST_UNIVERSITY_BATCHES);
      setSelectedBatchKey('AR-I_B2');
      const diffs = calculateTimetableDiffs(activeWeekSlots, fallbackBatch.slots);
      setDetectedDiffs(diffs);
      setUploadStep('review');
    }
  };

  const handleApproveAndPublish = async () => {
    if (!canPublish) {
      alert('Access Restricted: You must be signed in as a verified Class Representative (CR) or Admin.');
      return;
    }
    setIsPublishing(true);
    const batchMeta = detectedBatches[selectedBatchKey] || LATEST_UNIVERSITY_BATCHES['AR-I_B2'];
    let slotsToApply = batchMeta.slots;

    if (modalLabGroup !== 'all') {
      slotsToApply = filterTimetableByLabGroup(slotsToApply, modalLabGroup);
    }

    const versionTag = `v${version + 1} (${fileName})`;

    await dataService.applyScheduleToWeek(
      targetUploadWeek,
      slotsToApply,
      versionTag,
      applyFromWeekOnwards,
      changeReason
    );

    setIsPublishing(false);
    setIsUploadModalOpen(false);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Class Schedule & Timetable
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {activeWeekSchedule.versionTag}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Weekly timetable versioning, date-by-date class alterations, and official PDF matrix reader.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Daily Class Log</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Week Grid</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToChangelog}
            className="text-xs"
          >
            <History className="h-3.5 w-3.5 mr-1 text-zinc-400" />
            Audit Ledger
          </Button>

          {/* CR / Admin PDF Upload Button */}
          {canPublish ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleStartUpload}
              className="text-xs font-semibold shadow-sm"
            >
              <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
              Upload TT for Week {selectedWeekNum}
            </Button>
          ) : !user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAuthModal && onOpenAuthModal()}
              className="text-xs font-medium text-amber-300 border-amber-900/60 bg-amber-950/20 hover:bg-amber-950/40"
            >
              <Lock className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
              Sign In to Update
            </Button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/70 text-xs text-zinc-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
              <span>CR Protected</span>
            </div>
          )}
        </div>
      </div>

      {/* Week Selector Ribbon */}
      <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <span className="text-[11px] font-mono font-bold uppercase text-zinc-400 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-zinc-400" />
            Semester Week Version ({weeklySchedules.length} Weeks from Aug 3, 2026)
          </span>
          <span className="text-xs font-semibold text-white font-mono">
            {activeWeekSchedule.weekLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {weeklySchedules.map((w) => {
            const isSelected = w.weekNumber === selectedWeekNum;
            const isCurrent = todayStr >= w.startDate && todayStr <= w.endDate;

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
                      isSelected ? 'bg-zinc-950/20 text-zinc-950' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
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

      {/* ========================================================================= */}
      {/* 1. DAILY CLASS LOG & ALTERATION VIEW                                      */}
      {/* ========================================================================= */}
      {viewMode === 'agenda' && (
        <div className="space-y-4">
          {/* Date Navigator Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleShiftDate(-1)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">
                <CalendarIcon className="h-4 w-4 text-zinc-400" />
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

              <button
                onClick={() => handleSelectWeek(1)}
                className="hidden sm:inline-flex px-2.5 py-1.5 rounded-lg text-xs font-mono bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Jump to Aug 3 (Week 1)
              </button>
            </div>

            {/* CR Alteration Button */}
            {canPublish && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleOpenAlterModal()}
                className="text-xs font-semibold shadow-sm"
              >
                <Edit3 className="h-3.5 w-3.5 mr-1" />
                Alter / Log Schedule for This Date
              </Button>
            )}
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
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-emerald-400'}`} />
                    )}
                  </div>
                  <span className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-zinc-800 font-semibold' : 'text-zinc-500'}`}>
                    {day.formattedDay}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Date Header Info & Lab Filter */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{formattedSelectedDate}</span>
              {selectedDate === todayStr && (
                <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded">
                  TODAY
                </span>
              )}
            </h2>

            <div className="flex items-center gap-1.5">
              {(['all', 'Group B2-A', 'Group B2-B'] as const).map((grp) => (
                <button
                  key={grp}
                  onClick={() => setActiveLabGroup(grp)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeLabGroup === grp
                      ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {grp === 'all' ? 'All Groups' : grp.replace('Group ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Classes List */}
          <div className="space-y-3">
            {/* If there's a full-day override (e.g. Srijan Orientation, Fest, Mass Bunk, Holiday, All Classes Cancelled) */}
            {fullDayOverrideOnSelectedDate && (
              <div
                className={`relative rounded-2xl border p-5 sm:p-6 transition-all shadow-lg ${
                  fullDayOverrideOnSelectedDate.type === 'college_event'
                    ? 'border-indigo-800/80 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-zinc-950'
                    : fullDayOverrideOnSelectedDate.type === 'all_classes_cancelled'
                    ? 'border-amber-800/80 bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950'
                    : fullDayOverrideOnSelectedDate.type === 'mass_bunk'
                    ? 'border-red-800/80 bg-gradient-to-br from-red-950/30 via-zinc-900 to-zinc-950'
                    : 'border-emerald-800/80 bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        fullDayOverrideOnSelectedDate.type === 'college_event'
                          ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
                          : fullDayOverrideOnSelectedDate.type === 'all_classes_cancelled'
                          ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                          : fullDayOverrideOnSelectedDate.type === 'mass_bunk'
                          ? 'bg-red-950/80 border-red-700 text-red-300'
                          : 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                      }`}
                    >
                      {fullDayOverrideOnSelectedDate.type === 'college_event' ? (
                        <PartyPopper className="h-6 w-6" />
                      ) : fullDayOverrideOnSelectedDate.type === 'all_classes_cancelled' ? (
                        <Megaphone className="h-6 w-6" />
                      ) : fullDayOverrideOnSelectedDate.type === 'mass_bunk' ? (
                        <Flame className="h-6 w-6" />
                      ) : (
                        <Sun className="h-6 w-6" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            fullDayOverrideOnSelectedDate.type === 'college_event'
                              ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                              : fullDayOverrideOnSelectedDate.type === 'all_classes_cancelled'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : fullDayOverrideOnSelectedDate.type === 'mass_bunk'
                              ? 'bg-red-950 text-red-300 border-red-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {fullDayOverrideOnSelectedDate.type === 'college_event'
                            ? 'COLLEGE EVENT / FUNCTION'
                            : fullDayOverrideOnSelectedDate.type === 'all_classes_cancelled'
                            ? 'ALL CLASSES CANCELLED'
                            : fullDayOverrideOnSelectedDate.type === 'mass_bunk'
                            ? 'MASS BUNK'
                            : 'CAMPUS HOLIDAY'}
                        </span>

                        <span className="text-xs font-mono text-zinc-400">
                          {fullDayOverrideOnSelectedDate.startTime} – {fullDayOverrideOnSelectedDate.endTime}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                        {fullDayOverrideOnSelectedDate.alteredSubject}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-zinc-300 flex-wrap pt-1">
                        {fullDayOverrideOnSelectedDate.alteredRoom && (
                          <span className="flex items-center gap-1 font-medium text-zinc-200">
                            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                            {fullDayOverrideOnSelectedDate.alteredRoom}
                          </span>
                        )}
                        {fullDayOverrideOnSelectedDate.alteredFaculty && (
                          <span className="flex items-center gap-1 font-medium text-zinc-200">
                            <Users className="h-3.5 w-3.5 text-zinc-400" />
                            {fullDayOverrideOnSelectedDate.alteredFaculty}
                          </span>
                        )}
                      </div>

                      {fullDayOverrideOnSelectedDate.reason && (
                        <p className="text-xs text-zinc-300 pt-1 leading-relaxed">
                          <strong className="text-zinc-200">Note: </strong>
                          {fullDayOverrideOnSelectedDate.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {canPublish && (
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAlterModal(undefined, fullDayOverrideOnSelectedDate.type)}
                        className="text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1 text-zinc-400" />
                        Edit Details
                      </Button>
                      <button
                        onClick={() => handleRemoveOverride(fullDayOverrideOnSelectedDate.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 transition-colors cursor-pointer"
                        title="Restore regular classes and remove this event override"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore Regular Classes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Individual class list when no full-day override, or showing normal schedule */}
            {!fullDayOverrideOnSelectedDate && (
              <>
                {effectiveDaySchedule.length === 0 ? (
                  <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
                    <CalendarDays className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-zinc-300">No classes scheduled on this date</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Sunday or official off-day for USAR AR-1 B2.
                    </p>
                  </div>
                ) : (
                  effectiveDaySchedule.map((slot) => {
                    const isHoliday = slot.subjectId === 'holiday';
                    const isMassBunk = slot.subjectName.includes('MASS BUNK');
                    const isCancelled = slot.subjectName.includes('CANCELLED');
                    const matchedOverride = dailyOverridesForSelectedDate.find((o) => o.slotId === slot.id);

                    return (
                      <div
                        key={slot.id}
                        className={`relative rounded-xl border p-4 sm:p-5 transition-all ${
                          isHoliday
                            ? 'border-emerald-800/60 bg-emerald-950/20'
                            : isMassBunk
                            ? 'border-red-800/60 bg-red-950/20'
                            : isCancelled
                            ? 'border-amber-800/60 bg-amber-950/20'
                            : slot.isChanged
                            ? 'border-purple-800/60 bg-purple-950/20'
                            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 min-w-[84px] shrink-0">
                              <span className="font-mono text-sm font-bold text-white">
                                {slot.startTime}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                to {slot.endTime}
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {slot.subjectCode && (
                                  <span className="font-mono text-xs font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                                    {slot.subjectCode}
                                  </span>
                                )}
                                <h3 className="text-base font-bold text-white">{slot.subjectName}</h3>

                                {isHoliday && (
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                    HOLIDAY
                                  </span>
                                )}
                                {isMassBunk && (
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                                    MASS BUNK
                                  </span>
                                )}
                                {isCancelled && (
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                    CANCELLED
                                  </span>
                                )}
                                {slot.previousSubject && (
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                    SWAPPED
                                  </span>
                                )}
                                {slot.labGroup && slot.labGroup !== 'all' && (
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
                                    {slot.labGroup}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2 flex-wrap">
                                <span className="flex items-center gap-1 text-zinc-200 font-medium">
                                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                                  {slot.room}
                                </span>
                                <span>
                                  Faculty: <strong className="text-zinc-300 font-medium">{slot.faculty}</strong>
                                </span>
                              </div>

                              {slot.changeNote && (
                                <div className="mt-2.5 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2">
                                  <Info className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-semibold text-white">Log Note: </span>
                                    <span>{slot.changeNote}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {canPublish && !isHoliday && (
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {matchedOverride && (
                                <button
                                  onClick={() => handleRemoveOverride(matchedOverride.id)}
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-red-300 transition-colors cursor-pointer"
                                  title="Revert back to regular class"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAlterModal(slot)}
                                className="text-xs"
                              >
                                Alter Slot
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WEEK GRID VIEW                                                         */}
      {/* ========================================================================= */}
      {viewMode === 'calendar' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm">
          <div className="grid grid-cols-6 border-b border-zinc-800 bg-zinc-900/60 text-center">
            {days.map((day) => (
              <div key={day.id} className="p-3 border-r border-zinc-800 last:border-r-0">
                <span className="text-xs sm:text-sm font-semibold text-white">
                  {day.label}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-6 divide-x divide-zinc-800 min-h-[560px] bg-zinc-950">
            {days.map((day) => {
              const dayNum = Number(day.id);
              const daySlots = activeWeekSlots
                .filter((slot) => slot.dayOfWeek === dayNum)
                .sort((a, b) => {
                  const [aH, aM] = a.startTime.split(':').map(Number);
                  const [bH, bM] = b.startTime.split(':').map(Number);
                  return aH * 60 + aM - (bH * 60 + bM);
                });

              return (
                <div key={day.id} className="p-2.5 space-y-2.5">
                  {daySlots.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-400">
                      <span className="text-xs font-mono">No sessions</span>
                    </div>
                  ) : (
                    daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`group relative p-2.5 rounded-lg border text-left transition-all cursor-pointer hover:border-zinc-700 ${
                          slot.type === 'lab'
                            ? 'border-emerald-800/60 bg-emerald-950/20'
                            : slot.type === 'tutorial'
                            ? 'border-purple-800/60 bg-purple-950/20'
                            : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-mono text-[11px] font-semibold text-zinc-300">
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                            {slot.type}
                          </span>
                        </div>

                        {slot.subjectCode && (
                          <span className="text-[10px] font-mono font-bold text-zinc-400 block">
                            {slot.subjectCode}
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 mt-0.5">
                          {slot.subjectName}
                        </h4>

                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1 font-medium text-zinc-200 truncate">
                            <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                            {slot.room}
                          </span>
                          {slot.labGroup && slot.labGroup !== 'all' && (
                            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-1 py-0.2 rounded shrink-0">
                              {slot.labGroup.replace('Group ', '')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CR DAILY ALTERATION MODAL                                              */}
      {/* ========================================================================= */}
      {isAlterModalOpen && (
        <Modal
          isOpen={isAlterModalOpen}
          onClose={() => setIsAlterModalOpen(false)}
          title={`Alter Schedule for ${formattedSelectedDate}`}
          description="Log class substitutions, cancel lectures, record mass bunks, or declare holidays for this date."
          maxWidth="md"
        >
          <form onSubmit={handleSaveDailyAlteration} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">Action Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'swap', label: 'Swap Subject', icon: RefreshCw },
                  { id: 'cancelled', label: 'Cancel Class', icon: Ban },
                  { id: 'all_classes_cancelled', label: 'Cancel All Classes', icon: Megaphone },
                  { id: 'college_event', label: 'College Event / Function', icon: PartyPopper },
                  { id: 'mass_bunk', label: 'Mass Bunk', icon: Flame },
                  { id: 'extra_class', label: 'Extra Lecture', icon: Plus },
                  { id: 'holiday', label: 'Campus Holiday', icon: Sun },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = alterType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const newType = item.id as DayAlterationType;
                        setAlterType(newType);
                        if (newType === 'college_event' && !alteredSubject) {
                          setAlteredSubject('Srijan Clubs Orientation');
                          setAlteredRoom('Main Auditorium');
                          setAlteredFaculty('Student Council / Srijan');
                          setAlterReason('All regular classes suspended for annual club orientations.');
                        } else if (newType === 'all_classes_cancelled' && !alteredSubject) {
                          setAlteredSubject('All Classes Cancelled / Suspended');
                          setAlteredRoom('Campus');
                          setAlterReason('Classes cancelled as announced by CR / Administration.');
                        }
                      }}
                      className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-100 text-zinc-950 font-bold border-zinc-100 shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Event Presets if College Event or All Classes Cancelled */}
            {(alterType === 'college_event' || alterType === 'all_classes_cancelled') && (
              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-2">
                <span className="text-[11px] font-mono text-zinc-400 block font-semibold">
                  QUICK PRESETS (Click to apply):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    {
                      name: 'Srijan Clubs Orientation',
                      room: 'Main Auditorium',
                      faculty: 'Student Council & Srijan Society',
                      reason: 'All classes suspended for orientation sessions and society recruitments.',
                    },
                    {
                      name: 'Freshers Party 2026',
                      room: 'Campus Grounds / Audi',
                      faculty: 'USAR Student Council',
                      reason: 'Annual welcoming event for first-year engineering students.',
                    },
                    {
                      name: 'Anugoonj Annual Fest',
                      room: 'GGSIPU Main Stage',
                      faculty: 'University Cultural Committee',
                      reason: 'University-wide cultural festival participation.',
                    },
                    {
                      name: 'College Assembly / Function',
                      room: 'Main Seminar Hall',
                      faculty: 'USAR Administration',
                      reason: 'Dean Address & Departmental Academic Assembly.',
                    },
                    {
                      name: 'Mass Bunk / Off-Day',
                      room: 'Campus Closed',
                      faculty: 'USAR AR-1 Batch',
                      reason: 'Batch-wide consensus mass bunk.',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setAlteredSubject(preset.name);
                        setAlteredRoom(preset.room);
                        setAlteredFaculty(preset.faculty);
                        setAlterReason(preset.reason);
                      }}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700/60"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(alterType === 'swap' || alterType === 'cancelled' || alterType === 'mass_bunk') && (
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Target Scheduled Class</label>
                <select
                  value={targetSlotId}
                  onChange={(e) => {
                    setTargetSlotId(e.target.value);
                    const s = activeWeekSlots.find((t) => t.id === e.target.value);
                    if (s) {
                      setAlterStartTime(s.startTime);
                      setAlterEndTime(s.endTime);
                    }
                  }}
                  className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white"
                >
                  <option value="">-- Choose scheduled slot --</option>
                  {activeWeekSlots
                    .filter((t) => t.dayOfWeek === selectedDateObj.getDay())
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.startTime} - {s.endTime}: {s.subjectName} ({s.room})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {(alterType === 'swap' || alterType === 'extra_class' || alterType === 'college_event' || alterType === 'all_classes_cancelled') && (
              <div className="space-y-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    {alterType === 'college_event'
                      ? 'Event / Function Name'
                      : alterType === 'all_classes_cancelled'
                      ? 'Cancellation Title'
                      : alterType === 'swap'
                      ? 'Substitute Subject Taken'
                      : 'Extra Subject Name'}
                  </label>
                  <Input
                    type="text"
                    placeholder={
                      alterType === 'college_event'
                        ? 'e.g. Srijan Clubs Orientation'
                        : alterType === 'all_classes_cancelled'
                        ? 'e.g. All Classes Cancelled'
                        : 'e.g. Mathematics-I (Extra Tutorial)'
                    }
                    value={alteredSubject}
                    onChange={(e) => setAlteredSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Venue / Room</label>
                    <Input
                      type="text"
                      placeholder="e.g. Main Auditorium / A-403"
                      value={alteredRoom}
                      onChange={(e) => setAlteredRoom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Organizer / Faculty</label>
                    <Input
                      type="text"
                      placeholder="e.g. Student Council / Dr. Arti Singh"
                      value={alteredFaculty}
                      onChange={(e) => setAlteredFaculty(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Start Time</label>
                    <Input
                      type="text"
                      placeholder="09:00"
                      value={alterStartTime}
                      onChange={(e) => setAlterStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">End Time</label>
                    <Input
                      type="text"
                      placeholder="17:00"
                      value={alterEndTime}
                      onChange={(e) => setAlterEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Reason / Student Context (Displayed in Log)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. All classes suspended due to club orientation activities."
                value={alterReason}
                onChange={(e) => setAlterReason(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsAlterModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" type="submit">
                Record Alteration
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 4. CLASS INSPECTION MODAL                                                 */}
      {/* ========================================================================= */}
      {selectedSlot && (
        <Modal
          isOpen={!!selectedSlot}
          onClose={() => setSelectedSlot(null)}
          title={selectedSlot.subjectName}
          description={`${selectedSlot.subjectCode || 'AR-101'} • ${selectedSlot.type.toUpperCase()}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs text-zinc-300">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400 block font-mono text-[10px]">TIME WINDOW</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                  {selectedSlot.startTime} – {selectedSlot.endTime}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400 block font-mono text-[10px]">LOCATION</span>
                <span className="text-sm font-bold text-zinc-200 mt-0.5 block flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  {selectedSlot.room}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-400 block font-mono text-[10px]">FACULTY IN-CHARGE</span>
              <span className="text-sm font-semibold text-white mt-0.5 block">
                {selectedSlot.faculty}
              </span>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-zinc-800">
              <Button variant="default" size="sm" onClick={() => setSelectedSlot(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 5. PDF IMPORT FOR SPECIFIC WEEK MODAL (CR & ADMIN ONLY)                   */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title={`Upload University Timetable (PDF)`}
          description={`Targeting Week ${targetUploadWeek} (${activeWeekSchedule.weekLabel})`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {uploadStep === 'upload' && (
              <div className="space-y-4">
                {/* Week Selection for Upload */}
                <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-2">
                  <span className="text-zinc-300 font-semibold block">Select Target Semester Week:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 text-[11px] block mb-1">Target Week</label>
                      <select
                        value={targetUploadWeek}
                        onChange={(e) => setTargetUploadWeek(Number(e.target.value))}
                        className="w-full h-8 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-white"
                      >
                        {weeklySchedules.map((w) => (
                          <option key={w.id} value={w.weekNumber}>
                            Week {w.weekNumber}: {w.startDate} to {w.endDate}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id="applyForward"
                        checked={applyFromWeekOnwards}
                        onChange={(e) => setApplyFromWeekOnwards(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-zinc-100 cursor-pointer"
                      />
                      <label htmlFor="applyForward" className="text-zinc-300 text-xs cursor-pointer">
                        Apply from this week onward as default
                      </label>
                    </div>
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) handleFileProcess(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-zinc-200 bg-zinc-800/40'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
                    }}
                  />
                  <UploadCloud className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-white">
                    Drop university timetable PDF here
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Upload official PDF issued for Week {targetUploadWeek} (w.e.f. August 3 or revised dates).
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {uploadStep === 'parsing' && (
              <div className="p-8 text-center space-y-3">
                <div className="h-6 w-6 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
                <h3 className="text-sm font-semibold text-white">Parsing University Matrix for Week {targetUploadWeek}...</h3>
                <p className="text-xs text-zinc-400">Extracting slots for USAR AR-1 B2.</p>
              </div>
            )}

            {uploadStep === 'review' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-400 block">Target Week</span>
                    <strong className="text-white font-semibold">Week {targetUploadWeek} ({applyFromWeekOnwards ? 'and subsequent weeks' : 'this week only'})</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Detected Diffs</span>
                    <strong className="text-amber-400 font-semibold">{detectedDiffs.length} updates found</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <Button variant="outline" size="sm" onClick={() => setUploadStep('upload')}>
                    Back
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleApproveAndPublish}
                    isLoading={isPublishing}
                    disabled={!canPublish}
                    className="font-bold"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Publish to Week {targetUploadWeek}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
