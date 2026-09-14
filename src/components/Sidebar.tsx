import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  History,
  BookOpen,
  FolderGit2,
  Megaphone,
  CheckSquare,
  AlarmClock,
  Percent,
  HelpCircle,
  Calendar,
  Vote,
  Users,
  ChevronRight,
  ShieldCheck,
  Crown,
  UserCheck,
  X,
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../lib/auth';
import { dataService } from '../services/dataService';

import { getTodayDateStr } from '../lib/dateUtils';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentRole: UserRole;
  pendingAssignmentsCount: number;
  unreadChangesCount: number;
  activePollsCount: number;
  onOpenAuthModal?: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export function Sidebar({
  currentView,
  onNavigate,
  currentRole,
  pendingAssignmentsCount,
  unreadChangesCount,
  activePollsCount,
  onOpenAuthModal,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}: SidebarProps) {
  const { user } = useAuth();
  const timetable = dataService.getTimetable();

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  // Dynamic next class calculation respecting holidays and event overrides
  const nextClassInfo = useMemo(() => {
    const todayStr = getTodayDateStr();
    const now = new Date();
    if (now.getDay() === 0) {
      return {
        subject: 'Sunday Off',
        room: 'Weekend',
        timeText: 'Enjoy your break',
        isUpcoming: false,
      };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todaySlots = dataService.getEffectiveDaySchedule(todayStr, user?.labGroup || 'all');

    const fullDayEvent = dataService.getDailyOverrides(todayStr).find(
      (o) =>
        o.type === 'holiday' ||
        o.type === 'college_event' ||
        o.type === 'all_classes_cancelled' ||
        (!o.slotId && (o.type === 'cancelled' || o.type === 'mass_bunk'))
    );

    if (fullDayEvent) {
      if (fullDayEvent.type === 'holiday') {
        return {
          subject: fullDayEvent.alteredSubject || 'University Holiday',
          room: 'Campus Closed',
          timeText: 'Off-day',
          isUpcoming: false,
        };
      }
      if (fullDayEvent.type === 'college_event') {
        return {
          subject: fullDayEvent.alteredSubject || 'College Event',
          room: fullDayEvent.alteredRoom || 'Auditorium',
          timeText: 'No classes held',
          isUpcoming: false,
        };
      }
      if (fullDayEvent.type === 'all_classes_cancelled') {
        return {
          subject: 'All Classes Cancelled',
          room: 'Campus',
          timeText: 'No classes',
          isUpcoming: false,
        };
      }
      if (fullDayEvent.type === 'mass_bunk') {
        return {
          subject: 'Mass Bunk',
          room: 'Off-day',
          timeText: 'No classes',
          isUpcoming: false,
        };
      }
    }

    if (todaySlots.length === 0) {
      return {
        subject: 'No classes today',
        room: 'Off-day',
        timeText: 'Enjoy your break',
        isUpcoming: false,
      };
    }

    if (
      todaySlots.length === 1 &&
      (todaySlots[0].subjectId === 'holiday' ||
        todaySlots[0].subjectId === 'college_event' ||
        todaySlots[0].subjectId === 'all_classes_cancelled')
    ) {
      const s = todaySlots[0];
      return {
        subject: s.subjectName,
        room: s.room,
        timeText: s.subjectId === 'holiday' ? 'Off-day' : 'No classes held',
        isUpcoming: false,
      };
    }

    for (const cls of todaySlots) {
      const [h, m] = cls.startTime.split(':').map(Number);
      const classStartMinutes = h * 60 + m;
      if (classStartMinutes > currentMinutes) {
        const diffMins = classStartMinutes - currentMinutes;
        const timeText = diffMins < 60 ? `in ${diffMins} mins` : `in ${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
        return {
          subject: cls.subjectName,
          room: cls.room,
          timeText,
          isUpcoming: true,
        };
      }
    }

    const firstClass = todaySlots[0];
    return {
      subject: firstClass.subjectName,
      room: firstClass.room,
      timeText: `at ${firstClass.startTime}`,
      isUpcoming: false,
    };
  }, [user?.labGroup, dataService.getState().dailyOverrides, dataService.getState().weeklySchedules, timetable]);

  const activeRole = user?.role || currentRole;

  const navSections = [
    {
      title: 'CORE ACADEMICS',
      items: [
        {
          id: 'dashboard',
          label: 'This Week',
          icon: LayoutDashboard,
        },
        {
          id: 'timetable',
          label: 'Smart Timetable',
          icon: CalendarDays,
          badge: `v${dataService.getTimetableVersion()}`,
        },
        {
          id: 'whats-changed',
          label: "What's Changed?",
          icon: History,
          badge: unreadChangesCount > 0 ? `${unreadChangesCount}` : undefined,
          badgeVariant: 'destructive' as const,
        },
        {
          id: 'announcements',
          label: 'Notice Board',
          icon: Megaphone,
        },
      ],
    },
    {
      title: 'STUDY & TRACKING',
      items: [
        {
          id: 'syllabus',
          label: 'Syllabus Hub',
          icon: BookOpen,
        },
        {
          id: 'resources',
          label: 'Drive Vault & Notes',
          icon: FolderGit2,
          badge: 'Drive',
        },
        {
          id: 'assignments',
          label: 'Assignments',
          icon: CheckSquare,
          badge: pendingAssignmentsCount > 0 ? `${pendingAssignmentsCount}` : undefined,
        },
        {
          id: 'exams',
          label: 'Exams & Quizzes',
          icon: AlarmClock,
          badge: 'Mid-Sem',
        },
        {
          id: 'attendance',
          label: 'Attendance (75%)',
          icon: Percent,
        },
        {
          id: 'calendar',
          label: 'Academic Calendar',
          icon: Calendar,
        },
      ],
    },
    {
      title: 'CLASS COMMUNITY',
      items: [
        {
          id: 'doubts',
          label: 'Doubt Forum',
          icon: HelpCircle,
        },
        {
          id: 'polls',
          label: 'Class Polls',
          icon: Vote,
          badge: activePollsCount > 0 ? `${activePollsCount}` : undefined,
        },
        {
          id: 'faculty',
          label: 'Faculty & Links',
          icon: Users,
        },
      ],
    },
  ];

  if (activeRole === 'admin') {
    navSections.push({
      title: 'SUPER-ADMIN',
      items: [
        {
          id: 'admin',
          label: 'Governance Console',
          icon: Crown,
          badge: 'Admin',
        },
      ],
    });
  } else if (activeRole === 'cr') {
    navSections.push({
      title: 'REPRESENTATIVE',
      items: [
        {
          id: 'admin',
          label: 'Class Roster',
          icon: UserCheck,
          badge: 'CR',
        },
      ],
    });
  }

  return (
    <aside
      className={
        isMobileDrawer
          ? 'w-full h-full flex flex-col p-4 bg-zinc-950 overflow-y-auto'
          : 'w-64 flex-shrink-0 hidden lg:flex flex-col border-r border-zinc-800/80 bg-zinc-950/60 p-4 min-h-[calc(100vh-4rem)]'
      }
    >
      {/* Mobile Drawer Header with Close Button */}
      {isMobileDrawer && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm tracking-tight">Navigation</span>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              USAR AR-1 B2
            </span>
          </div>
          <button
            onClick={onCloseMobileDrawer}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* User Identity / Guest Card */}
      {user ? (
        <div className="mb-4 p-3 rounded-xl border border-zinc-800 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center font-bold text-white text-xs border border-zinc-700 shrink-0">
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              {user.role === 'admin' && (
                <div className="absolute bottom-0 right-0 bg-red-600 text-white rounded-tl p-0.5">
                  <Crown className="h-2.5 w-2.5" />
                </div>
              )}
              {user.role === 'cr' && (
                <div className="absolute bottom-0 right-0 bg-amber-500 text-zinc-950 rounded-tl p-0.5">
                  <ShieldCheck className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white truncate">
                  {user.name}
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                {user.rollNo || user.classBatch}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <h4 className="text-xs font-semibold text-white">USAR AR-1 B2</h4>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
            Sign in to access your student attendance records, notes, and CR alerts.
          </p>
          <button
            type="button"
            onClick={() => {
              if (onOpenAuthModal) onOpenAuthModal();
              if (onCloseMobileDrawer) onCloseMobileDrawer();
            }}
            className="w-full py-1.5 px-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium shadow-sm transition-all cursor-pointer"
          >
            Sign In to CaOS
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-mono font-semibold tracking-wider text-zinc-400">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded ${
                          isActive
                            ? 'bg-zinc-950/10 text-zinc-950'
                            : item.badgeVariant === 'destructive'
                            ? 'bg-red-950/50 text-red-400 border border-red-800/60'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`h-3 w-3 transition-transform ${
                        isActive ? 'opacity-100 text-zinc-950 translate-x-0.5' : 'opacity-0 group-hover:opacity-100 text-zinc-500'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer: Next Class Live Radar */}
      <div className="mt-auto pt-4 border-t border-zinc-900 text-xs">
        <div
          onClick={() => onNavigate('timetable')}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono font-medium text-zinc-400">NEXT SESSION</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="text-xs font-semibold text-white truncate">
            {nextClassInfo.subject}
          </p>
          <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
            <span>{nextClassInfo.room}</span>
            <span className="font-mono text-zinc-300 font-medium">{nextClassInfo.timeText}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
