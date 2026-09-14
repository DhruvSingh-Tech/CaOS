import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Calendar,
  FolderGit2,
  Megaphone,
  CheckSquare,
  Users,
  X,
  ArrowRight,
  Command,
} from 'lucide-react';
import { dataService } from '../services/dataService';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (viewId: string) => void;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  onNavigate,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    subjects: any[];
    timetable: any[];
    resources: any[];
    announcements: any[];
    assignments: any[];
  }>({
    subjects: [],
    timetable: [],
    resources: [],
    announcements: [],
    assignments: [],
  });

  useEffect(() => {
    if (!query.trim()) {
      setResults({
        subjects: [],
        timetable: [],
        resources: [],
        announcements: [],
        assignments: [],
      });
      return;
    }

    const state = dataService.getState();
    const q = query.toLowerCase();

    setResults({
      subjects: state.subjects.filter(
        (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      ),
      timetable: state.timetable.filter(
        (t) =>
          t.subjectName.toLowerCase().includes(q) ||
          t.room.toLowerCase().includes(q) ||
          t.faculty.toLowerCase().includes(q)
      ),
      resources: state.resources.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.topic.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q)
      ),
      announcements: state.announcements.filter(
        (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
      ),
      assignments: state.assignments.filter(
        (asg) =>
          asg.title.toLowerCase().includes(q) || asg.subjectName.toLowerCase().includes(q)
      ),
    });
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (viewId: string) => {
    onNavigate(viewId);
    onClose();
    setQuery('');
  };

  const totalMatches =
    results.subjects.length +
    results.timetable.length +
    results.resources.length +
    results.announcements.length +
    results.assignments.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
      <div
        className="fixed inset-0 bg-black/80 animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl z-10 overflow-hidden animate-fade-in">
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 border-b border-zinc-800">
          <Search className="h-5 w-5 text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Search syllabus, timetable, notes, circulars, faculty..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="h-14 w-full bg-transparent text-sm text-white placeholder:text-zinc-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4 text-xs">
          {!query && (
            <div className="py-8 text-center text-zinc-400">
              <Command className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
              <p>Type keywords to search across USAR AR-1 B2.</p>
            </div>
          )}

          {query && totalMatches === 0 && (
            <div className="py-8 text-center text-zinc-400">
              <p>No matching academic records found for "{query}".</p>
            </div>
          )}

          {/* Subjects */}
          {results.subjects.length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1.5 px-2">
                Curriculum Subjects
              </div>
              <div className="space-y-1">
                {results.subjects.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect('syllabus')}
                    className="p-2.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="h-4 w-4 text-zinc-400" />
                      <span className="font-semibold text-white">{item.name}</span>
                      <span className="font-mono text-zinc-400 font-bold">({item.code})</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">{item.facultyName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timetable */}
          {results.timetable.length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1.5 px-2">
                Timetable Slots
              </div>
              <div className="space-y-1">
                {results.timetable.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect('timetable')}
                    className="p-2.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-zinc-400" />
                      <span className="font-semibold text-white">{item.subjectName}</span>
                      <span className="font-mono text-zinc-400">{item.room}</span>
                    </div>
                    <span className="text-zinc-400 font-mono">{item.startTime} – {item.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {results.resources.length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-zinc-400 mb-1.5 px-2">
                Notes & PYQs
              </div>
              <div className="space-y-1">
                {results.resources.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect('resources')}
                    className="p-2.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderGit2 className="h-4 w-4 text-zinc-400" />
                      <span className="font-semibold text-white">{item.title}</span>
                    </div>
                    <span className="text-zinc-400">{item.subjectName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
