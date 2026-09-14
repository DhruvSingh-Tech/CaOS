import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SmartTimetableView } from './components/SmartTimetableView';
import { WhatsChangedView } from './components/WhatsChangedView';
import { SyllabusView } from './components/SyllabusView';
import { NotesRepositoryView } from './components/NotesRepositoryView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { AssignmentsView } from './components/AssignmentsView';
import { ExamsView } from './components/ExamsView';
import { AttendanceView } from './components/AttendanceView';
import { DoubtSystemView } from './components/DoubtSystemView';
import { PollsView } from './components/PollsView';
import { CalendarView } from './components/CalendarView';
import { FacultyAndLinksView } from './components/FacultyAndLinksView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { AuthModal } from './components/AuthModal';

import { dataService } from './services/dataService';
import { UserRole } from './types';
import { useAuth } from './lib/auth';

export function App() {
  const { user } = useAuth();
  const [appState, setAppState] = useState(dataService.getState());

  // Modal dialog states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Router navigation hook
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveView = () => {
    const path = location.pathname.replace('/', '');
    return path === '' ? 'dashboard' : path;
  };

  const currentView = getActiveView();

  useEffect(() => {
    const unsubscribe = dataService.subscribe((newState) => {
      if (newState) {
        setAppState(newState);
      } else {
        setAppState(dataService.getState());
      }
    });
    return () => unsubscribe();
  }, []);

  // Global Command+K Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (viewId: string) => {
    setIsMobileNavOpen(false);
    navigate(viewId === 'dashboard' ? '/' : `/${viewId}`);
  };

  const currentRole: UserRole = user?.role || 'student';
  const safeState = appState || dataService.getState();

  const pendingAssignmentsCount = (safeState.assignments || []).filter(
    (a) => a.status !== 'completed'
  ).length;
  const activePollsCount = (safeState.polls || []).length;
  const unreadChangesCount = (safeState.auditLog || []).filter(
    (l) => l.timestamp.includes('Today') || l.timestamp.includes('Just now')
  ).length;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onNavigateTo={handleNavigate}
        unreadChangesCount={unreadChangesCount}
        onToggleMobileMenu={() => setIsMobileNavOpen((prev) => !prev)}
        isMobileMenuOpen={isMobileNavOpen}
      />

      {/* Mobile Slide-Over Navigation Drawer */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />
          {/* Drawer Content */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-zinc-950 border-r border-zinc-800 shadow-2xl z-10">
            <Sidebar
              currentView={currentView}
              onNavigate={handleNavigate}
              currentRole={currentRole}
              pendingAssignmentsCount={pendingAssignmentsCount}
              unreadChangesCount={unreadChangesCount}
              activePollsCount={activePollsCount}
              onOpenAuthModal={() => {
                setIsMobileNavOpen(false);
                setIsAuthOpen(true);
              }}
              isMobileDrawer={true}
              onCloseMobileDrawer={() => setIsMobileNavOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 max-w-[1720px] w-full mx-auto">
        {/* Left Sidebar (Desktop) */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          currentRole={currentRole}
          pendingAssignmentsCount={pendingAssignmentsCount}
          unreadChangesCount={unreadChangesCount}
          activePollsCount={activePollsCount}
          onOpenAuthModal={() => setIsAuthOpen(true)}
        />

        {/* Main Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardView
                  currentRole={currentRole}
                  timetable={safeState.timetable || []}
                  announcements={safeState.announcements || []}
                  assignments={safeState.assignments || []}
                  exams={safeState.exams || []}
                  auditLog={safeState.auditLog || []}
                  attendance={safeState.attendance || []}
                  polls={safeState.polls || []}
                  onNavigate={handleNavigate}
                  onOpenAI={() => setIsAIOpen(true)}
                  onOpenAuthModal={() => setIsAuthOpen(true)}
                />
              }
            />

            <Route
              path="/timetable"
              element={
                <SmartTimetableView
                  currentRole={currentRole}
                  timetable={safeState.timetable || []}
                  version={safeState.timetableVersion || 1}
                  onNavigateToChangelog={() => handleNavigate('whats-changed')}
                  onOpenAuthModal={() => setIsAuthOpen(true)}
                />
              }
            />

            <Route
              path="/whats-changed"
              element={<WhatsChangedView auditLog={safeState.auditLog || []} />}
            />

            <Route
              path="/syllabus"
              element={
                <SyllabusView
                  syllabus={safeState.syllabus || []}
                  subjects={safeState.subjects || []}
                  resources={safeState.resources || []}
                  onNavigateToResources={() => handleNavigate('resources')}
                />
              }
            />

            <Route
              path="/resources"
              element={
                <NotesRepositoryView
                  resources={
                    safeState.resources && safeState.resources.length > 0
                      ? safeState.resources
                      : dataService.getResources()
                  }
                  subjects={safeState.subjects || []}
                  currentRole={currentRole}
                />
              }
            />

            <Route
              path="/announcements"
              element={
                <AnnouncementsView
                  announcements={safeState.announcements || []}
                  currentRole={currentRole}
                />
              }
            />

            <Route
              path="/assignments"
              element={
                <AssignmentsView
                  assignments={safeState.assignments || []}
                  subjects={safeState.subjects || []}
                  currentRole={currentRole}
                />
              }
            />

            <Route
              path="/exams"
              element={
                <ExamsView
                  exams={safeState.exams || []}
                  onNavigateToSyllabus={() => handleNavigate('syllabus')}
                />
              }
            />

            <Route
              path="/attendance"
              element={<AttendanceView attendance={safeState.attendance || []} />}
            />

            <Route
              path="/doubts"
              element={
                <DoubtSystemView
                  doubts={safeState.doubts || []}
                  subjects={safeState.subjects || []}
                  currentRole={currentRole}
                />
              }
            />

            <Route
              path="/polls"
              element={<PollsView polls={safeState.polls || []} currentRole={currentRole} />}
            />

            <Route path="/calendar" element={<CalendarView />} />

            <Route
              path="/faculty"
              element={
                <FacultyAndLinksView
                  faculty={safeState.faculty || []}
                  quickLinks={safeState.quickLinks || []}
                />
              }
            />

            {/* Admin Console with Route Guard */}
            <Route
              path="/admin"
              element={
                user && (user.role === 'admin' || user.role === 'cr') ? (
                  <AdminDashboardView />
                ) : (
                  <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/60 max-w-xl mx-auto my-12 space-y-4">
                    <div className="h-12 w-12 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 flex items-center justify-center mx-auto">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Restricted Access</h2>
                    <p className="text-xs text-zinc-400">
                      The Governance Console is restricted to verified Class Representatives (CR) and Super-Administrators.
                    </p>
                    <button
                      onClick={() => setIsAuthOpen(true)}
                      className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold"
                    >
                      Sign In with Authorized Account
                    </button>
                  </div>
                )
              }
            />

            {/* Fallback to Dashboard */}
            <Route
              path="*"
              element={
                <DashboardView
                  currentRole={currentRole}
                  timetable={appState.timetable}
                  announcements={appState.announcements}
                  assignments={appState.assignments}
                  exams={appState.exams}
                  auditLog={appState.auditLog}
                  attendance={appState.attendance}
                  polls={appState.polls}
                  onNavigate={handleNavigate}
                  onOpenAI={() => setIsAIOpen(true)}
                  onOpenAuthModal={() => setIsAuthOpen(true)}
                />
              }
            />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(viewId) => {
          setIsSearchOpen(false);
          handleNavigate(viewId);
        }}
      />

      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
}
