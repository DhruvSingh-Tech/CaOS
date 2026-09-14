import React from 'react';
import {
  Users,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  BookOpen,
  Link2,
  GraduationCap,
  Globe,
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Faculty, QuickLink } from '../types';

interface FacultyAndLinksViewProps {
  faculty: Faculty[];
  quickLinks: QuickLink[];
}

export function FacultyAndLinksView({
  faculty,
  quickLinks,
}: FacultyAndLinksViewProps) {
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Faculty Directory & Campus Links
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              USAR Faculty Directory
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Department instructors, cabin locations, and official university portals.
          </p>
        </div>
      </div>

      {/* Quick University Portals */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Globe className="h-4 w-4 text-zinc-400" />
          Essential University Portals
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {quickLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors flex items-center justify-between group"
            >
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                  {link.category}
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5 group-hover:text-zinc-200">
                  {link.title}
                </h4>
                <span className="text-xs text-zinc-400 block mt-1 line-clamp-1">
                  {link.description}
                </span>
              </div>
              <ExternalLink className="h-4 w-4 text-zinc-400 group-hover:text-white shrink-0 ml-2" />
            </a>
          ))}
        </div>
      </div>

      {/* Faculty Directory Grid */}
      <div className="space-y-3 pt-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-400" />
          Course Instructors & Department Faculty
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {faculty.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                    {f.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{f.name}</h4>
                    <span className="text-xs text-zinc-400">{f.designation}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{f.subjectName} ({f.subjectCode})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span>Cabin: <strong className="text-white font-mono">{f.cabinRoom}</strong></span>
                  </div>
                  {f.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                      <span className="text-zinc-400 truncate">{f.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
