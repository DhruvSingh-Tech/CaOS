import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Megaphone,
  Pin,
  Clock,
  Plus,
  AlertTriangle,
  Bell,
  Calendar,
  Lock,
  Trash2,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Announcement, AnnouncementCategory, AnnouncementPriority, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../lib/auth';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  currentRole: UserRole;
}

export function AnnouncementsView({ announcements, currentRole }: AnnouncementsViewProps) {
  const { user } = useAuth();
  const isCRorAdmin = user?.role === 'cr' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('important');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [expiryDays, setExpiryDays] = useState('2');
  const [isPinned, setIsPinned] = useState(false);

  const now = new Date();

  const activeAnnouncements = announcements.filter((a) => {
    if (!a.validUntil) return true;
    return new Date(a.validUntil) >= now;
  });

  const archivedAnnouncements = announcements.filter((a) => {
    if (!a.validUntil) return false;
    return new Date(a.validUntil) < now;
  });

  const displayedList = (activeTab === 'active' ? activeAnnouncements : archivedAnnouncements)
    .filter((a) => (selectedCategory === 'all' ? true : a.category === selectedCategory))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const expiryDate = new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString();

    dataService.addAnnouncement({
      title,
      content,
      category,
      priority,
      authorName: user ? `${user.name} (${user.role.toUpperCase()})` : 'Class Representative',
      authorRole: user?.role === 'admin' ? 'Faculty' : 'CR',
      validUntil: expiryDate,
      isPinned,
    });

    setIsCreateOpen(false);
    setTitle('');
    setContent('');

    confetti({
      particleCount: 40,
      spread: 50,
    });
  };

  const handleDeleteNotice = async (annId: string, annTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete notice "${annTitle}"? This will remove it from the notice board.`)) {
      return;
    }
    const authorName = user ? `${user.name} (${user.role.toUpperCase()})` : 'CR / Admin';
    await dataService.deleteAnnouncement(annId, authorName);
  };

  const categories = [
    { id: 'all', label: 'All Notices' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'timetable', label: 'Timetable' },
    { id: 'assignment', label: 'Assignments' },
    { id: 'exam', label: 'Exams' },
    { id: 'general', label: 'General' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Class Notice Board
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Official Circulars
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Verified academic circulars, timetable updates, and university broadcasts.
          </p>
        </div>

        {/* Broadcast Button: CR/Admin Only */}
        {isCRorAdmin && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="text-xs font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Broadcast Notice
          </Button>
        )}
      </div>

      {/* Tabs & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'active'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Active Circulars ({activeAnnouncements.length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'archived'
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Archived ({archivedAnnouncements.length})
          </button>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-3.5">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <Megaphone className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No announcements found</h3>
            <p className="text-xs text-zinc-400 mt-1">Check back later for class updates.</p>
          </div>
        ) : (
          displayedList.map((ann) => {
            const isUrgent = ann.priority === 'urgent';

            return (
              <div
                key={ann.id}
                className={`rounded-xl border p-5 transition-all ${
                  isUrgent
                    ? 'border-amber-800/80 bg-amber-950/20 shadow-sm'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ann.isPinned && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-700">
                          <Pin className="h-3 w-3" /> PINNED
                        </span>
                      )}
                      {isUrgent && (
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/60">
                          URGENT
                        </span>
                      )}
                      <span className="text-[10px] font-mono uppercase text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                        {ann.category}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mt-1.5">{ann.title}</h3>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{ann.content}</p>
                  </div>

                  <div className="flex items-start gap-2 shrink-0 self-end sm:self-auto">
                    <div className="text-right text-[11px] text-zinc-400 font-mono">
                      <span>{ann.authorName}</span>
                      <span className="block text-zinc-400 mt-0.5">USAR AR-1 B2</span>
                    </div>
                    {isCRorAdmin && (
                      <button
                        onClick={() => handleDeleteNotice(ann.id, ann.title)}
                        title="Delete this notice"
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-transparent hover:border-red-900/50 cursor-pointer ml-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast Modal (CR/Admin Only) */}
      {isCRorAdmin && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Broadcast Class Notice"
          description="Send an official circular or broadcast to all enrolled students in USAR AR-1 B2."
          maxWidth="md"
        >
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Notice Title</label>
              <Input
                type="text"
                placeholder="e.g. Extra Lecture for Analog Electronics Announced"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Message Content</label>
              <textarea
                rows={4}
                placeholder="Type circular details, room updates, or faculty instructions..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                  className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-white"
                >
                  <option value="important">Important</option>
                  <option value="timetable">Timetable</option>
                  <option value="assignment">Assignment</option>
                  <option value="exam">Exam</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                  className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-white"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" type="submit">
                Broadcast Circular
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
