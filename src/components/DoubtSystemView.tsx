import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  Send,
  Plus,
  Tag,
  ThumbsUp,
  UserCheck,
  Award,
  Filter,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Doubt, Subject, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../lib/auth';

interface DoubtSystemViewProps {
  doubts: Doubt[];
  subjects: Subject[];
  currentRole: UserRole;
  onOpenAuthModal?: () => void;
}

export function DoubtSystemView({
  doubts,
  subjects,
  currentRole,
  onOpenAuthModal,
}: DoubtSystemViewProps) {
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [activeDoubt, setActiveDoubt] = useState<Doubt | null>(null);

  // Ask form
  const [newSubjectId, setNewSubjectId] = useState<string>(subjects[0]?.id || '');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTags, setNewTags] = useState('');

  // Reply form
  const [replyText, setReplyText] = useState('');

  const filteredDoubts = doubts.filter((d) => {
    const matchSubject = selectedSubject === 'all' || d.subjectId === selectedSubject;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSubject && matchStatus;
  });

  const handleAskDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription) return;

    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    const sub = subjects.find((s) => s.id === newSubjectId);
    const tagsArray = newTags.split(',').map((t) => t.trim()).filter(Boolean);

    dataService.addDoubt({
      subjectId: newSubjectId,
      subjectName: sub ? sub.name : 'General Academic',
      title: newTitle,
      description: newDescription,
      studentName: user.name,
      status: 'unresolved',
      tags: tagsArray.length > 0 ? tagsArray : ['Academic'],
    });

    setIsAskOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewTags('');

    confetti({
      particleCount: 40,
      spread: 50,
    });
  };

  const handleAddReply = (doubtId: string) => {
    if (!replyText.trim()) return;

    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }

    dataService.addDoubtAnswer(
      doubtId,
      replyText.trim(),
      `${user.name} (${user.role.toUpperCase()})`,
      user.role === 'admin' ? 'faculty' : user.role === 'cr' ? 'cr' : 'student'
    );

    setReplyText('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Peer Doubt Forum
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Collaborative Learning
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Ask homework questions, share derivations, and get peer-verified solutions.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => {
            if (!user) {
              if (onOpenAuthModal) onOpenAuthModal();
              return;
            }
            setIsAskOpen(true);
          }}
          className="text-xs font-semibold shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Ask a Question
        </Button>
      </div>

      {/* Subject Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSubject('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
            selectedSubject === 'all'
              ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          All Topics
        </button>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubject(sub.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              selectedSubject === sub.id
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {sub.shortName || sub.name}
          </button>
        ))}
      </div>

      {/* Doubt List */}
      <div className="space-y-4">
        {filteredDoubts.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <HelpCircle className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No discussions posted yet</h3>
            <p className="text-xs text-zinc-400 mt-1">Start a discussion on any coursework problem.</p>
          </div>
        ) : (
          filteredDoubts.map((doubt) => {
            const isResolved = doubt.status === 'resolved';

            return (
              <div
                key={doubt.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                        {doubt.subjectName}
                      </span>
                      {isResolved ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          RESOLVED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                          OPEN
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5">{doubt.title}</h3>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{doubt.description}</p>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                    Asked by <strong className="text-zinc-300 font-medium">{doubt.studentName}</strong>
                  </span>
                </div>

                {/* Answers list */}
                {doubt.answers.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase">
                      {doubt.answers.length} Solutions & Replies
                    </span>
                    {doubt.answers.map((ans) => (
                      <div key={ans.id} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white">{ans.authorName}</span>
                          <span className="text-[10px] font-mono text-zinc-400">{ans.timestamp}</span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed">{ans.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Reply Form */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Write a solution or explanation..."
                    value={activeDoubt?.id === doubt.id ? replyText : ''}
                    onFocus={() => setActiveDoubt(doubt)}
                    onChange={(e) => {
                      setActiveDoubt(doubt);
                      setReplyText(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddReply(doubt.id);
                    }}
                    className="h-8 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-white placeholder:text-zinc-400"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddReply(doubt.id)}
                    className="h-8 text-xs"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ask Doubt Modal */}
      <Modal
        isOpen={isAskOpen}
        onClose={() => setIsAskOpen(false)}
        title="Post a Subject Doubt"
        description="Share a problem statement or question with USAR AR-1 B2 classmates."
        maxWidth="md"
      >
        <form onSubmit={handleAskDoubt} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-medium mb-1">Subject</label>
            <select
              value={newSubjectId}
              onChange={(e) => setNewSubjectId(e.target.value)}
              className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Question Title</label>
            <Input
              type="text"
              placeholder="e.g. How to apply superposition theorem when dependent sources exist?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Elaborate the Issue</label>
            <textarea
              rows={4}
              placeholder="Provide exact problem details, formulas you tried, or what step you are stuck on..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsAskOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" type="submit">
              Post Question
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
