import React, { useState } from 'react';
import {
  History,
  Calendar,
  Filter,
  FileText,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { AuditLogEntry } from '../types';

interface WhatsChangedViewProps {
  auditLog: AuditLogEntry[];
}

export function WhatsChangedView({ auditLog }: WhatsChangedViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLog = auditLog.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.changedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'All Updates' },
    { id: 'timetable', label: 'Timetable' },
    { id: 'assignment', label: 'Assignments' },
    { id: 'announcement', label: 'Notices' },
    { id: 'syllabus', label: 'Syllabus' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              What's Changed?
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Class Audit Ledger
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Chronological audit log of schedule modifications, room swaps, and official notices.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search audit changes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-white placeholder:text-zinc-400 w-full sm:w-48"
          />
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="space-y-3">
        {filteredLog.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <History className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No revisions recorded</h3>
            <p className="text-xs text-zinc-400 mt-1">All class records are up to date.</p>
          </div>
        ) : (
          filteredLog.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    {log.category}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">{log.timestamp}</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1.5">{log.title}</h3>
                <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{log.description}</p>
              </div>

              <div className="text-right text-[11px] font-mono text-zinc-400 shrink-0">
                <span className="flex items-center gap-1 font-medium text-zinc-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
                  {log.changedBy}
                </span>
                <span className="text-zinc-400 block mt-0.5">Verified</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
