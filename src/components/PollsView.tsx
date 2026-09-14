import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Vote,
  Clock,
  CheckCircle2,
  Plus,
  BarChart3,
  Users,
  AlertCircle,
  Lock,
  Trophy,
  Megaphone,
  Check,
  Calendar,
  Sparkles,
  AlertTriangle,
  History,
  Trash2,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Poll, UserRole, PollStatus } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../lib/auth';

interface PollsViewProps {
  polls?: Poll[];
  currentRole: UserRole;
  onOpenAuthModal?: () => void;
}

export function PollsView({ currentRole, onOpenAuthModal }: PollsViewProps) {
  const { user } = useAuth();
  const isCRorAdmin = user?.role === 'cr' || user?.role === 'admin';

  // Realtime reactive polls state directly subscribed to DataService
  const [pollsState, setPollsState] = useState<Poll[]>(dataService.getState().polls || []);

  useEffect(() => {
    setPollsState(dataService.getState().polls || []);
    const unsubscribe = dataService.subscribe((state) => {
      if (state?.polls) {
        setPollsState(state.polls);
      }
    });
    return () => unsubscribe();
  }, []);

  // Filter Tabs
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'declared' | 'expired'>('all');

  // Create Poll Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [optionsText, setOptionsText] = useState<string[]>(['Yes', 'No']);
  const [timePreset, setTimePreset] = useState<'1h' | '3h' | 'today_eod' | '24h' | '48h' | '72h' | 'custom'>('24h');
  const [customDateTime, setCustomDateTime] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Declare Results Modal State
  const [declaringPoll, setDeclaringPoll] = useState<Poll | null>(null);
  const [selectedWinnerId, setSelectedWinnerId] = useState<number>(0);
  const [declarationNote, setDeclarationNote] = useState('');
  const [broadcastToAnnouncements, setBroadcastToAnnouncements] = useState(true);

  // Compute remaining time helper
  const getPollTimeInfo = (poll: Poll) => {
    const expiresMs = new Date(poll.expiresAt).getTime();
    const nowMs = Date.now();
    const diffMs = expiresMs - nowMs;

    const isExpired = diffMs <= 0 || poll.status === 'expired';
    const isDeclared = poll.status === 'declared';

    if (isDeclared) {
      return {
        label: 'OFFICIAL DECISION DECLARED',
        isExpired: true,
        isDeclared: true,
        colorClass: 'text-amber-300 border-amber-800/80 bg-amber-950/60',
      };
    }

    if (isExpired) {
      return {
        label: 'VOTING ENDED / CLOSED',
        isExpired: true,
        isDeclared: false,
        colorClass: 'text-zinc-400 border-zinc-800 bg-zinc-900',
      };
    }

    // Active calculations
    const mins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    let timeStr = '';
    if (days > 0) {
      timeStr = `${days}d ${hours % 24}h left`;
    } else if (hours > 0) {
      timeStr = `${hours}h ${mins % 60}m left`;
    } else {
      timeStr = `${mins}m left`;
    }

    return {
      label: `ACTIVE • ${timeStr}`,
      isExpired: false,
      isDeclared: false,
      colorClass: 'text-emerald-300 border-emerald-800/80 bg-emerald-950/60',
    };
  };

  // Filtered polls
  const filteredPolls = useMemo(() => {
    return pollsState.filter((poll) => {
      const { isExpired, isDeclared } = getPollTimeInfo(poll);
      if (filterTab === 'active') return !isExpired && !isDeclared;
      if (filterTab === 'declared') return isDeclared;
      if (filterTab === 'expired') return isExpired && !isDeclared;
      return true;
    });
  }, [pollsState, filterTab]);

  const activeCount = pollsState.filter((p) => !getPollTimeInfo(p).isExpired).length;
  const declaredCount = pollsState.filter((p) => p.status === 'declared').length;
  const expiredCount = pollsState.filter((p) => getPollTimeInfo(p).isExpired && p.status !== 'declared').length;

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    const target = pollsState.find((p) => p.id === pollId);
    if (!target) return;

    const { isExpired, isDeclared } = getPollTimeInfo(target);
    if (isExpired || isDeclared) {
      alert('This poll is closed and is no longer accepting new votes.');
      return;
    }

    await dataService.votePoll(pollId, optionIndex);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  const handleAddOption = () => {
    if (optionsText.length < 8) {
      setOptionsText([...optionsText, '']);
    }
  };

  const handleRemoveOption = (idx: number) => {
    if (optionsText.length > 2) {
      setOptionsText(optionsText.filter((_, i) => i !== idx));
    }
  };

  const handleApplyPresetOptions = (opts: string[]) => {
    setOptionsText(opts);
  };

  const calculateExpiresAt = (): string => {
    const now = Date.now();
    if (timePreset === '1h') return new Date(now + 1 * 60 * 60 * 1000).toISOString();
    if (timePreset === '3h') return new Date(now + 3 * 60 * 60 * 1000).toISOString();
    if (timePreset === 'today_eod') {
      const eod = new Date();
      eod.setHours(18, 0, 0, 0);
      if (eod.getTime() <= now) eod.setDate(eod.getDate() + 1);
      return eod.toISOString();
    }
    if (timePreset === '24h') return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    if (timePreset === '48h') return new Date(now + 48 * 60 * 60 * 1000).toISOString();
    if (timePreset === '72h') return new Date(now + 72 * 60 * 60 * 1000).toISOString();
    if (timePreset === 'custom' && customDateTime) {
      return new Date(customDateTime).toISOString();
    }
    return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = optionsText.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) {
      setErrorMessage('Please enter a question and at least 2 non-empty options.');
      return;
    }

    const expiresAtISO = calculateExpiresAt();
    const creatorName = user ? `${user.name} (${user.role.toUpperCase()})` : 'USAR CR';

    await dataService.createPoll(question.trim(), validOptions, expiresAtISO, creatorName, description.trim());

    setIsCreateOpen(false);
    setQuestion('');
    setDescription('');
    setOptionsText(['Yes', 'No']);
    setTimePreset('24h');
    setErrorMessage(null);

    confetti({
      particleCount: 60,
      spread: 70,
    });
  };

  const handleOpenDeclareModal = (poll: Poll) => {
    setDeclaringPoll(poll);
    // Find option with highest votes
    let bestOption = poll.options[0];
    for (const opt of poll.options) {
      if (opt.votes > bestOption.votes) bestOption = opt;
    }
    setSelectedWinnerId(bestOption.id);
    setDeclarationNote(`By class consensus, option "${bestOption.text}" has been approved for the batch.`);
    setBroadcastToAnnouncements(true);
  };

  const handleConfirmDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declaringPoll) return;

    const declaredByName = user ? `${user.name} (${user.role.toUpperCase()})` : 'Dhruv Singh (CR)';

    await dataService.declarePollResult(
      declaringPoll.id,
      selectedWinnerId,
      declarationNote.trim(),
      declaredByName,
      broadcastToAnnouncements
    );

    setDeclaringPoll(null);
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  const handleClosePollEarly = async (pollId: string) => {
    if (!confirm('Are you sure you want to end voting for this poll early?')) return;
    await dataService.closePoll(pollId);
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to permanently delete this poll?')) return;
    await dataService.deletePoll(pollId);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Class Polls & Consensus
            </h1>
            <Badge variant="outline" className="font-mono text-xs text-purple-300 border-purple-800">
              Live Democracy
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Official class voting for tutorial slots, make-up sessions, lab timings, and batch decisions.
          </p>
        </div>

        {/* Create Poll Button: CR/Admin Only */}
        {isCRorAdmin && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="text-xs font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Launch New Poll
          </Button>
        )}
      </div>

      {/* Filter Tabs Ribbon */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterTab === 'all'
                ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Polls ({pollsState.length})
          </button>
          <button
            onClick={() => setFilterTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'active'
                ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/80'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilterTab('declared')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'declared'
                ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800/80'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            Decided ({declaredCount})
          </button>
          <button
            onClick={() => setFilterTab('expired')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterTab === 'expired'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Closed ({expiredCount})
          </button>
        </div>
      </div>

      {/* Polls Grid */}
      <div className="space-y-5">
        {filteredPolls.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <Vote className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No polls in this category</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Class Representatives will launch new polls when decisions or rescheduling are required.
            </p>
          </div>
        ) : (
          filteredPolls.map((poll) => {
            const timeInfo = getPollTimeInfo(poll);
            const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes, 0);
            const isUserVoted = user && (poll.userVotedOptionId !== undefined || poll.options.some((o) => o.votedUserIds?.includes(user.id)));

            return (
              <div
                key={poll.id}
                className={`rounded-2xl border p-5 sm:p-6 space-y-4 transition-all shadow-md ${
                  poll.status === 'declared'
                    ? 'border-amber-800/80 bg-gradient-to-br from-amber-950/20 via-zinc-900 to-zinc-950'
                    : timeInfo.isExpired
                    ? 'border-zinc-800/80 bg-zinc-950/60 opacity-90'
                    : 'border-purple-800/60 bg-gradient-to-br from-purple-950/20 via-zinc-900 to-zinc-950'
                }`}
              >
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${timeInfo.colorClass}`}>
                        {timeInfo.label}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Ends: {new Date(poll.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight pt-1">
                      {poll.question}
                    </h3>
                    {poll.description && (
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {poll.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-300 font-mono bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 shrink-0">
                    <Users className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'total votes'}</span>
                  </div>
                </div>

                {/* Official Declaration Note if Poll is Declared */}
                {poll.status === 'declared' && poll.declarationMessage && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-zinc-950 border border-amber-700/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 text-xs font-bold font-mono">
                      <Trophy className="h-4 w-4 text-amber-400" />
                      <span>OFFICIAL DECISION BY {poll.declaredBy || 'CLASS REPRESENTATIVE'}</span>
                    </div>
                    <p className="text-xs text-zinc-100 font-medium leading-relaxed">
                      "{poll.declarationMessage}"
                    </p>
                  </div>
                )}

                {/* Options List */}
                <div className="space-y-2.5">
                  {poll.options.map((opt, idx) => {
                    const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                    const isWinner = poll.status === 'declared' && poll.winningOptionId === opt.id;
                    const isUserPick = user && (poll.userVotedOptionId === opt.id || opt.votedUserIds?.includes(user.id));
                    const canVote = !timeInfo.isExpired && !timeInfo.isDeclared;

                    return (
                      <div
                        key={idx}
                        onClick={() => canVote && handleVote(poll.id, opt.id)}
                        className={`group relative overflow-hidden rounded-xl border p-3.5 transition-all ${
                          isWinner
                            ? 'border-amber-500 bg-amber-950/40 ring-1 ring-amber-500/40'
                            : isUserPick
                            ? 'border-purple-600 bg-purple-950/30 font-semibold'
                            : canVote
                            ? 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 cursor-pointer'
                            : 'border-zinc-800/80 bg-zinc-950/70'
                        }`}
                      >
                        {/* Progress Fill */}
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                            isWinner
                              ? 'bg-amber-600/30'
                              : isUserPick
                              ? 'bg-purple-600/30'
                              : 'bg-zinc-800/50'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between text-xs gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {isWinner && (
                              <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                            )}
                            {isUserPick && !isWinner && (
                              <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                            )}
                            <span className={`font-semibold truncate ${isWinner ? 'text-amber-200' : 'text-white'}`}>
                              {opt.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono shrink-0">
                            <span className="text-xs font-bold text-white">
                              {percentage}%
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              ({opt.votes})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Controls & CR Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 text-xs">
                  <div className="text-[11px] text-zinc-400">
                    <span>Conducted by <strong className="text-zinc-300">{poll.createdBy}</strong></span>
                    {isUserVoted && (
                      <span className="ml-2 text-purple-400 font-medium">• You voted</span>
                    )}
                  </div>

                  {/* CR Management Actions */}
                  {isCRorAdmin && (
                    <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                      {poll.status !== 'declared' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenDeclareModal(poll)}
                          className="text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                        >
                          <Trophy className="h-3.5 w-3.5 mr-1" />
                          Declare Decision
                        </Button>
                      )}

                      {!timeInfo.isExpired && poll.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClosePollEarly(poll.id)}
                          className="text-xs text-zinc-400 hover:text-white"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Close Voting
                        </Button>
                      )}

                      <button
                        onClick={() => handleDeletePoll(poll.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Poll"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATE POLL MODAL (CR/Admin)                                           */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Launch Class Consensus Poll"
          description="Conduct a real-time vote with time limits for USAR AR-1 B2 students."
          maxWidth="lg"
        >
          <form onSubmit={handleCreatePoll} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Question / Decision Topic *
              </label>
              <Input
                type="text"
                placeholder="e.g. Should we schedule the Mathematics-I Extra Tutorial on Wednesday at 3:00 PM?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Context / Notes for Students (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Dr. Arti Singh has agreed to conduct a tutorial in Room A-403 before mid-term exams."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
              />
            </div>

            {/* Time Limit Selector */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2.5">
              <label className="block text-zinc-200 font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                Poll Expiry & Time Limit *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: '1h', label: '1 Hour (Flash)' },
                  { id: '3h', label: '3 Hours (Half-Day)' },
                  { id: 'today_eod', label: 'Today 6:00 PM' },
                  { id: '24h', label: '24 Hours (1 Day)' },
                  { id: '48h', label: '48 Hours (2 Days)' },
                  { id: 'custom', label: 'Custom Date/Time' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTimePreset(item.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium text-center transition-colors cursor-pointer ${
                      timePreset === item.id
                        ? 'bg-purple-950 text-purple-300 border-purple-700 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {timePreset === 'custom' && (
                <div className="pt-2">
                  <label className="text-[11px] text-zinc-400 block mb-1">Select Exact Deadline Date & Time:</label>
                  <input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white font-mono"
                    required={timePreset === 'custom'}
                  />
                </div>
              )}
            </div>

            {/* Options Builder */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-zinc-300 font-medium">Voting Options *</label>
                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                  <span>Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetOptions(['Yes', 'No', 'Abstain'])}
                    className="underline hover:text-white cursor-pointer mr-1"
                  >
                    Yes/No
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetOptions(['Wednesday 3:00 PM', 'Thursday 4:00 PM', 'Friday 2:00 PM'])}
                    className="underline hover:text-white cursor-pointer"
                  >
                    Time Slots
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {optionsText.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...optionsText];
                        copy[idx] = e.target.value;
                        setOptionsText(copy);
                      }}
                      required
                    />
                    {optionsText.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {optionsText.length < 8 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs text-purple-400 hover:text-purple-300 mt-2 font-medium cursor-pointer"
                >
                  + Add Another Option
                </button>
              )}
            </div>

            {errorMessage && (
              <p className="text-xs text-red-400 font-medium">{errorMessage}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" type="submit">
                Launch Poll
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 2. DECLARE POLL RESULTS MODAL (CR/Admin)                                   */}
      {/* ========================================================================= */}
      {declaringPoll && (
        <Modal
          isOpen={!!declaringPoll}
          onClose={() => setDeclaringPoll(null)}
          title="Declare Poll Consensus Result"
          description="Finalize the official decision and broadcast the announcement to the entire batch."
          maxWidth="md"
        >
          <form onSubmit={handleConfirmDeclaration} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">POLL QUESTION</span>
              <h4 className="text-sm font-bold text-white">{declaringPoll.question}</h4>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">
                Select Winning Consensus Option *
              </label>
              <div className="space-y-2">
                {declaringPoll.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedWinnerId === opt.id
                        ? 'border-amber-500 bg-amber-950/40 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="winnerOption"
                        checked={selectedWinnerId === opt.id}
                        onChange={() => {
                          setSelectedWinnerId(opt.id);
                          setDeclarationNote(`By class consensus, option "${opt.text}" has been approved for the batch.`);
                        }}
                        className="text-amber-500 bg-zinc-900 border-zinc-700 focus:ring-amber-500"
                      />
                      <span className="font-semibold">{opt.text}</span>
                    </div>
                    <span className="font-mono text-xs text-amber-400 font-bold">
                      {opt.votes} votes
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Official CR Declaration Message *
              </label>
              <textarea
                rows={3}
                placeholder="e.g. By 78% class consensus, Extra Mathematics Tutorial is scheduled for Wednesday at 3:00 PM in Room A-403. Dr. Arti Singh has been informed."
                value={declarationNote}
                onChange={(e) => setDeclarationNote(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="broadcastNotice"
                checked={broadcastToAnnouncements}
                onChange={(e) => setBroadcastToAnnouncements(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 cursor-pointer"
              />
              <label htmlFor="broadcastNotice" className="text-xs text-zinc-300 cursor-pointer">
                Publish as Urgent Announcement & Log in Audit Ledger
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="outline" size="sm" type="button" onClick={() => setDeclaringPoll(null)}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
              >
                <Trophy className="h-3.5 w-3.5 mr-1" />
                Declare & Announce Decision
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
