import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  FileText,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Subject, SyllabusUnit, AcademicResource } from '../types';

interface SyllabusViewProps {
  syllabus: SyllabusUnit[];
  subjects: Subject[];
  resources: AcademicResource[];
  onNavigateToResources: () => void;
}

export function SyllabusView({
  syllabus,
  subjects,
  resources,
  onNavigateToResources,
}: SyllabusViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({
    'unit-1': true,
  });

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const subjectUnits = syllabus.filter((u) => u.subjectId === selectedSubjectId);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Syllabus & Curriculum Hub
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              AR_Academic Session_2026_27
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            USAR official first semester curriculum with unit-wise breakdown and prescribed textbooks.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateToResources}
          className="text-xs"
        >
          <FileText className="h-4 w-4 mr-1.5 text-zinc-400" />
          View Linked Notes & PYQs
        </Button>
      </div>

      {/* Subject Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectId(sub.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              selectedSubjectId === sub.id
                ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <span>{sub.name}</span>
            <span className="ml-2 font-mono text-[10px] opacity-60">({sub.code})</span>
          </button>
        ))}
      </div>

      {/* Subject Summary Card */}
      {activeSubject && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                {activeSubject.code}
              </span>
              <h2 className="text-lg font-bold text-white">{activeSubject.name}</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Faculty: <strong className="text-zinc-200">{activeSubject.facultyName}</strong> • Default Room: <span className="text-zinc-200 font-mono">{activeSubject.defaultRoom}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-zinc-300">
            <span className="p-2 rounded bg-zinc-950 border border-zinc-800">
              {activeSubject.credits} Credits
            </span>
          </div>
        </div>
      )}

      {/* Units List */}
      <div className="space-y-3">
        {subjectUnits.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <BookOpen className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">Syllabus units ready</h3>
            <p className="text-xs text-zinc-400 mt-1">Select another subject tab to view modules.</p>
          </div>
        ) : (
          subjectUnits.map((unit) => {
            const isExpanded = expandedUnits[unit.id] ?? false;

            return (
              <div
                key={unit.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-colors"
              >
                <div
                  onClick={() => toggleUnit(unit.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
                      Unit {unit.unitNumber}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white">{unit.title}</h3>
                      <span className="text-xs text-zinc-400 font-mono mt-0.5 block">
                        Weightage: {unit.weightageMarks || 15} Marks
                      </span>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  )}
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-zinc-800/80 space-y-3 text-xs">
                    <div>
                      <span className="font-semibold text-zinc-300 block mb-1">Topics & Sub-modules:</span>
                      <p className="text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                        {unit.topics.join(' • ')}
                      </p>
                    </div>

                    {unit.importantFormulas && unit.importantFormulas.length > 0 && (
                      <div>
                        <span className="font-semibold text-zinc-300 block mb-1">Key Concepts & Theorems:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {unit.importantFormulas.map((f, i) => (
                            <span key={i} className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px] border border-zinc-700">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
