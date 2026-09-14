import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  ExternalLink,
  Award,
  CheckCircle2,
  Lock,
  Search,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Assignment, AssignmentStatus, Subject, UserRole } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../lib/auth';

interface AssignmentsViewProps {
  assignments: Assignment[];
  subjects: Subject[];
  currentRole: UserRole;
}

export function AssignmentsView({
  assignments,
  subjects,
  currentRole,
}: AssignmentsViewProps) {
  const { user } = useAuth();
  const isCRorAdmin = user?.role === 'cr' || user?.role === 'admin';

  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [newSubjectId, setNewSubjectId] = useState<string>(subjects[0]?.id || '');
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newMarks, setNewMarks] = useState('20');

  const filteredAssignments = assignments.filter((asg) => {
    const matchSubject = filterSubject === 'all' || asg.subjectId === filterSubject;
    const matchStatus = filterStatus === 'all' || asg.status === filterStatus;
    return matchSubject && matchStatus;
  });

  const completedCount = assignments.filter((a) => a.status === 'completed').length;
  const progressPercent = Math.round((completedCount / (assignments.length || 1)) * 100);

  const handleStatusChange = (assignmentId: string, newStatus: AssignmentStatus) => {
    dataService.setAssignmentStatus(assignmentId, newStatus);
    if (newStatus === 'completed') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const sub = subjects.find((s) => s.id === newSubjectId);

    dataService.addAssignment({
      subjectId: newSubjectId,
      subjectName: sub ? sub.name : 'Engineering Subject',
      title: newTitle,
      topic: newTopic || 'General Problem Set',
      description: newDescription,
      dueDate: new Date(newDueDate || Date.now() + 7 * 86400000).toISOString(),
      totalMarks: parseInt(newMarks) || 20,
      createdBy: user ? `${user.name} (${user.role.toUpperCase()})` : 'Class Representative',
      status: 'not_started',
    });

    setIsAddOpen(false);
    setNewTitle('');
    setNewTopic('');
    setNewDescription('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Assignments & Tasks
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {assignments.length} Total
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Track coursework deadlines, problem sheets, and lab submissions.
          </p>
        </div>

        {/* Add Assignment: Strictly CR / Admin */}
        {isCRorAdmin && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="text-xs font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Assignment
          </Button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 block font-medium">Completion Rate</span>
            <span className="text-xl font-bold text-white mt-0.5 block font-mono">
              {completedCount} / {assignments.length} Done
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg border border-emerald-800/80 bg-emerald-950/40 flex items-center justify-center text-xs font-bold text-emerald-400 font-mono">
            {progressPercent}%
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 block font-medium">Pending Tasks</span>
            <span className="text-xl font-bold text-amber-400 mt-0.5 block font-mono">
              {assignments.length - completedCount} Remaining
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-800/60">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-400 block font-medium">Internal Weightage</span>
            <span className="text-xl font-bold text-white mt-0.5 block font-mono">
              Continuous Assessment
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Award className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterSubject('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
            filterSubject === 'all'
              ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All Subjects
        </button>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setFilterSubject(sub.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
              filterSubject === sub.id
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {sub.shortName || sub.name}
          </button>
        ))}
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <CheckSquare className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No matching assignments</h3>
            <p className="text-xs text-zinc-400 mt-1">All coursework submissions are caught up.</p>
          </div>
        ) : (
          filteredAssignments.map((asg) => {
            const isCompleted = asg.status === 'completed';
            const isInProgress = asg.status === 'in_progress';

            return (
              <div
                key={asg.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                      {asg.subjectName}
                    </span>
                    <h3 className={`text-base font-bold ${isCompleted ? 'text-zinc-400 line-through' : 'text-white'}`}>
                      {asg.title}
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-300 mt-1">{asg.description}</p>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2.5">
                    <span>
                      Due: <strong className="text-white font-mono">{new Date(asg.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                    </span>
                    <span>•</span>
                    <span>Marks: <strong className="text-white font-mono">{asg.totalMarks}</strong></span>
                    <span>•</span>
                    <span>Assigned by: <span className="text-zinc-300">{asg.createdBy}</span></span>
                  </div>
                </div>

                {/* Status Toggle Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleStatusChange(asg.id, isCompleted ? 'not_started' : 'completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900/60'
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Assignment Modal (CR/Admin Only) */}
      {isCRorAdmin && (
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="Create Class Assignment"
          description="Publish a course assignment with submission deadline for USAR AR-1 B2."
          maxWidth="md"
        >
          <form onSubmit={handleAddAssignment} className="space-y-4 text-xs">
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
              <label className="block text-zinc-300 font-medium mb-1">Assignment Title</label>
              <Input
                type="text"
                placeholder="e.g. Problem Set 2 - Mesh & Nodal Analysis"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Instructions / Description</label>
              <textarea
                rows={3}
                placeholder="Details on questions, submission format, and unit coverage..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Due Date</label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Total Marks</label>
                <Input
                  type="number"
                  value={newMarks}
                  onChange={(e) => setNewMarks(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" type="submit">
                Create Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
