import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Crown,
  UserCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  GraduationCap,
  CalendarDays,
  FileCode,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { useAuth } from '../lib/auth';
import { UserProfile, UserRole } from '../types';
import { dataService } from '../services/dataService';

export function AdminDashboardView() {
  const { user, allStudents, updateUserRole, refreshRoster } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';
  const isCR = user?.role === 'cr';

  const timetableVersion = dataService.getTimetableVersion();
  const assignmentsCount = dataService.getAssignments().length;
  const resourcesCount = dataService.getResources().length;

  const filteredStudents = allStudents.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.rollNo && student.rollNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || student.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (studentId: string, newRole: UserRole) => {
    if (!isAdmin) {
      setActionMessage('Only Super-Admin can reassign student or CR roles.');
      setTimeout(() => setActionMessage(null), 3500);
      return;
    }

    setUpdatingId(studentId);
    const res = await updateUserRole(studentId, newRole);
    setUpdatingId(null);

    if (res.error) {
      setActionMessage(`Failed to update role: ${res.error.message || res.error}`);
    } else {
      setActionMessage(`Role successfully updated to ${newRole.toUpperCase()}!`);
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-mono font-medium text-zinc-300 mb-2">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span>{isAdmin ? 'Institution Super-Admin Console' : 'Class Representative Roster'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {isAdmin ? 'Class Governance & Access Control' : 'USAR AR-1 B2 Student Roster'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mt-1 leading-relaxed">
              {isAdmin
                ? 'Manage class leadership, designate Class Representatives (CRs), inspect joined students, and audit academic records.'
                : 'Live roster of all students enrolled in USAR AR-1 B2. Monitor joined classmates and academic statuses.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshRoster()}
              className="text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-zinc-400" />
              Refresh Roster
            </Button>
          </div>
        </div>
      </div>

      {/* Action Notice */}
      {actionMessage && (
        <div className="p-3 rounded-xl border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
          <span className="text-xs font-medium text-zinc-400">Total Joined Students</span>
          <h3 className="text-2xl font-bold text-white mt-1 font-mono">{allStudents.length}</h3>
          <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">USAR AR-1 B2</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
          <span className="text-xs font-medium text-zinc-400">Active Timetable</span>
          <h3 className="text-2xl font-bold text-white mt-1 font-mono">v{timetableVersion}</h3>
          <p className="text-[11px] text-emerald-400 mt-0.5 font-mono">USAR Sync Active</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
          <span className="text-xs font-medium text-zinc-400">Class Assignments</span>
          <h3 className="text-2xl font-bold text-white mt-1 font-mono">{assignmentsCount}</h3>
          <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">Odd Sem 2026-27</p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
          <span className="text-xs font-medium text-zinc-400">Study Resources & Notes</span>
          <h3 className="text-2xl font-bold text-white mt-1 font-mono">{resourcesCount}</h3>
          <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">Syllabus Grounded</p>
        </div>
      </div>

      {/* Student Management Roster */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              Enrolled Classmates & User Roles
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Real-time directory of joined USAR students synchronized with Supabase authentication.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search name, roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs text-white placeholder:text-zinc-400"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 text-xs text-white"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="cr">CRs</option>
              <option value="student">Students</option>
            </select>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-mono">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Assigned Role</th>
                {isAdmin && <th className="py-3 px-4 text-right">Role Governance</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="py-8 text-center text-zinc-400">
                    No enrolled students match your search filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.id} className="hover:bg-zinc-900/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{st.name}</div>
                      <div className="text-[11px] text-zinc-400">{st.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">{st.rollNo || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          st.role === 'admin'
                            ? 'bg-red-950/60 text-red-300 border border-red-800/80'
                            : st.role === 'cr'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-800/80'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {st.role === 'admin' && <Crown className="h-3 w-3" />}
                        {st.role === 'cr' && <ShieldCheck className="h-3 w-3" />}
                        {st.role}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <select
                          value={st.role}
                          disabled={updatingId === st.id}
                          onChange={(e) => handleRoleChange(st.id, e.target.value as UserRole)}
                          className="h-7 rounded border border-zinc-700 bg-zinc-950 px-2 text-xs text-white cursor-pointer"
                        >
                          <option value="student">Set as Student</option>
                          <option value="cr">Promote to CR</option>
                          <option value="admin">Assign Admin</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
