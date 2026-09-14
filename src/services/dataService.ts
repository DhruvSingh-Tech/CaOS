import {
  Subject,
  TimetableEntry,
  TimetableDiff,
  AuditLogEntry,
  SyllabusUnit,
  AcademicResource,
  Announcement,
  Assignment,
  AssignmentStatus,
  Exam,
  Doubt,
  AttendanceRecord,
  Poll,
  FacultyMember,
  QuickLink,
  UserRole,
  DailyClassOverride,
  WeeklyTimetableSchedule,
  SessionAttendanceStatus,
  StudentSessionAttendanceRecord,
  ConductedClassSession,
  SubjectAttendanceSummary,
  DriveHubConfig,
} from '../types';

import {
  INITIAL_SUBJECTS,
  INITIAL_TIMETABLE,
  INITIAL_TIMETABLE_DIFFS,
  INITIAL_AUDIT_LOG,
  INITIAL_SYLLABUS,
  INITIAL_RESOURCES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_EXAMS,
  INITIAL_DOUBTS,
  INITIAL_ATTENDANCE,
  INITIAL_POLLS,
  INITIAL_FACULTY,
  INITIAL_QUICK_LINKS,
  DEFAULT_DRIVE_HUB,
} from '../data/initialData';

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  formatLocalDate,
  parseLocalDate,
  getTodayDateStr,
  getWeekDateRange,
  getWeekNumberFromDate,
} from '../lib/dateUtils';

const CAOS_STORAGE_KEY = 'caos_app_state_v6_usar_ar1b2';

function generateInitialWeeklySchedules(baseSlots: TimetableEntry[]): WeeklyTimetableSchedule[] {
  const weeks: WeeklyTimetableSchedule[] = [];

  for (let i = 1; i <= 16; i++) {
    const range = getWeekDateRange(i);

    weeks.push({
      id: `week-${i}`,
      weekNumber: i,
      weekLabel: range.label,
      startDate: range.startDate,
      endDate: range.endDate,
      versionTag: i === 1 ? 'v1 (Aug 3 Initial)' : i <= 5 ? 'v1 (Master)' : 'v5 (Active)',
      slots: baseSlots,
      notes: i === 1 ? 'Semester Opening & Orientation' : undefined,
    });
  }
  return weeks;
}

export interface AppState {
  subjects: Subject[];
  timetable: TimetableEntry[];
  pendingDiffs: TimetableDiff[];
  auditLog: AuditLogEntry[];
  syllabus: SyllabusUnit[];
  resources: AcademicResource[];
  announcements: Announcement[];
  assignments: Assignment[];
  exams: Exam[];
  doubts: Doubt[];
  attendance: AttendanceRecord[];
  sessionAttendance: Record<string, StudentSessionAttendanceRecord>;
  polls: Poll[];
  faculty: FacultyMember[];
  quickLinks: QuickLink[];
  dailyOverrides: DailyClassOverride[];
  weeklySchedules: WeeklyTimetableSchedule[];
  timetableVersion: number;
  driveHub: DriveHubConfig;
}

function getInitialState(): AppState {
  return {
    subjects: INITIAL_SUBJECTS,
    timetable: INITIAL_TIMETABLE,
    pendingDiffs: INITIAL_TIMETABLE_DIFFS,
    auditLog: INITIAL_AUDIT_LOG,
    syllabus: INITIAL_SYLLABUS,
    resources: INITIAL_RESOURCES,
    announcements: INITIAL_ANNOUNCEMENTS,
    assignments: INITIAL_ASSIGNMENTS,
    exams: INITIAL_EXAMS,
    doubts: INITIAL_DOUBTS,
    attendance: INITIAL_ATTENDANCE,
    sessionAttendance: {},
    polls: INITIAL_POLLS,
    faculty: INITIAL_FACULTY,
    quickLinks: INITIAL_QUICK_LINKS,
    driveHub: DEFAULT_DRIVE_HUB,
    dailyOverrides: [
      {
        id: 'override-aug-3',
        date: '2026-08-03',
        alteredSubject: 'Odd Semester 2026-27 Orientation & Class Commencement',
        startTime: '09:00',
        endTime: '17:00',
        type: 'regular',
        reason: 'Semester Kickoff w.e.f 3rd August 2026',
        reportedBy: 'Dean Academics',
        timestamp: '2026-08-03',
      },
      {
        id: 'override-sep-2-holiday',
        date: '2026-10-02',
        alteredSubject: 'Gandhi Jayanti Holiday',
        startTime: '09:00',
        endTime: '17:00',
        type: 'holiday',
        reason: 'Gazetted University Holiday',
        reportedBy: 'Administration',
        timestamp: '2026-09-01',
      },
    ],
    weeklySchedules: generateInitialWeeklySchedules(INITIAL_TIMETABLE),
    timetableVersion: 1,
  };
}

class SupabaseDataService {
  private state: AppState;
  private listeners: Set<() => void> = new Set();
  private realtimeChannel: any = null;
  private currentUserId: string | null = null;
  private currentClassId: string = '32a7c369-f80a-4a14-8afd-de3c6bd5cee0';
  private subjectUuidMap: Map<string, string> = new Map();

  constructor() {
    this.state = this.loadLocalState();
    this.initSupabaseSync();
  }

  public setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
  }

  public async ensureClassId(): Promise<string> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from('classes').select('id, name').limit(1);
        if (data && data.length > 0) {
          this.currentClassId = data[0].id;
          return this.currentClassId;
        }
      } catch (e) {
        console.warn('Error fetching class_id from Supabase:', e);
      }
    }
    return this.currentClassId || '32a7c369-f80a-4a14-8afd-de3c6bd5cee0';
  }

  public resolveSubjectUuid(codeOrId: string): string {
    if (!codeOrId) {
      return this.state.subjects[0]?.id || 'sub-ar-101';
    }
    const upper = codeOrId.toUpperCase();
    if (this.subjectUuidMap.has(upper)) return this.subjectUuidMap.get(upper)!;
    if (this.subjectUuidMap.has(codeOrId)) return this.subjectUuidMap.get(codeOrId)!;
    const clean = upper.replace(/^SUB-/, '');
    if (this.subjectUuidMap.has(clean)) return this.subjectUuidMap.get(clean)!;
    const sub = this.state.subjects.find(
      (s) => s.code.toUpperCase() === upper || s.code.toUpperCase() === clean || s.id === codeOrId
    );
    if (sub) {
      const mapped = this.subjectUuidMap.get(sub.code.toUpperCase());
      if (mapped) return mapped;
      return sub.id;
    }
    return this.state.subjects[0]?.id || codeOrId;
  }

  public resetToFreshCurriculum(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('caos_app_state_v1');
        localStorage.removeItem('caos_app_state_v2');
        localStorage.removeItem('caos_app_state_v3');
        localStorage.removeItem('caos_app_state_v4');
        localStorage.removeItem(CAOS_STORAGE_KEY);
      } catch (e) {
        console.warn('Storage clear warning:', e);
      }
    }
    this.state = getInitialState();
    this.saveLocalState();
  }

  private loadLocalState(): AppState {
    if (typeof window === 'undefined') return getInitialState();
    try {
      // Purge outdated mock state keys
      ['caos_app_state_v1', 'caos_app_state_v2', 'caos_app_state_v3', 'caos_app_state_v4', 'caos_app_state_v5_usar_ar1b2'].forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      const serialized = localStorage.getItem(CAOS_STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        const initial = getInitialState();
        return {
          ...initial,
          ...parsed,
          resources:
            parsed.resources && parsed.resources.length > 0
              ? parsed.resources
              : initial.resources,
          exams:
            parsed.exams && parsed.exams.length > 0
              ? parsed.exams
              : initial.exams,
          driveHub: parsed.driveHub || initial.driveHub,
        };
      }
    } catch (e) {
      console.warn('Failed to load local state:', e);
    }
    return getInitialState();
  }

  private saveLocalState(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CAOS_STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save local state:', e);
    }
    this.notify();
  }

  public subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener as any);
    return () => {
      this.listeners.delete(listener as any);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.getState()));
  }

  // Realtime Supabase Setup
  public async initSupabaseSync(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase || !isSupabaseConfigured()) {
      return;
    }

    try {
      // 1. Initial Cloud Sync
      await this.pullFromSupabase();

      // 2. Setup Realtime WebSocket Listener across class tables
      if (!this.realtimeChannel) {
        this.realtimeChannel = supabase
          .channel('caos-realtime-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'announcements' },
            () => this.pullAnnouncements()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'timetable_entries' },
            () => this.pullTimetable()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'timetable_changes' },
            () => this.pullAuditLog()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'assignments' },
            () => this.pullAssignments()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'student_assignments' },
            () => this.pullAssignments()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'doubts' },
            () => this.pullDoubts()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'doubt_answers' },
            () => this.pullDoubts()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'polls' },
            () => this.pullPolls()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'poll_votes' },
            () => this.pullPolls()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'resources' },
            () => this.pullResources()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'weekly_schedules' },
            () => this.pullWeeklySchedules()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'daily_class_overrides' },
            () => this.pullDailyOverrides()
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('⚡ Connected to CaOS Supabase Realtime');
            }
          });
      }
    } catch (err) {
      console.warn('Supabase sync initialization warning (using local fallback):', err);
    }
  }

  // Pull all records from Supabase tables
  public async pullFromSupabase(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    await Promise.allSettled([
      this.pullSubjects(),
      this.pullTimetable(),
      this.pullAuditLog(),
      this.pullAnnouncements(),
      this.pullAssignments(),
      this.pullExams(),
      this.pullDoubts(),
      this.pullPolls(),
      this.pullResources(),
      this.pullSyllabus(),
      this.pullFaculty(),
      this.pullQuickLinks(),
      this.pullWeeklySchedules(),
      this.pullDailyOverrides(),
    ]);

    this.saveLocalState();
  }

  private async pullSubjects(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('subjects').select('*').order('code');
    if (data && data.length > 0) {
      data.forEach((d: any) => {
        if (d.code && d.id) {
          this.subjectUuidMap.set(d.code.toUpperCase(), d.id);
          this.subjectUuidMap.set(d.id, d.id);
        }
      });
      this.state.subjects = data.map((d: any) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        shortName: d.short_name,
        facultyName: d.faculty_name,
        color: d.color,
        defaultRoom: d.default_room,
        credits: d.credits || 3,
      }));
      this.notify();
    }
  }

  private async pullTimetable(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('timetable_entries').select('*, subjects(name, code)').order('start_time');
    if (data && data.length > 0) {
      this.state.timetable = data.map((d: any) => ({
        id: d.id,
        dayOfWeek: d.day_of_week,
        startTime: d.start_time,
        endTime: d.end_time,
        subjectId: d.subject_id,
        subjectCode: d.subjects?.code,
        subjectName: d.subjects?.name || 'Class',
        room: d.room,
        faculty: d.faculty,
        type: d.type,
        isChanged: d.is_changed,
        changeNote: d.change_note,
        labGroup: d.change_note?.startsWith('Group: ') ? d.change_note.replace('Group: ', '') : undefined,
        previousSubject: d.previous_subject,
        previousRoom: d.previous_room,
      }));
      const maxVer = Math.max(...data.map((d: any) => d.version_id || 1), 1);
      this.state.timetableVersion = maxVer;
      this.notify();
    }
  }

  private async pullAuditLog(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('timetable_changes').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      this.state.auditLog = data.map((d: any) => ({
        id: d.id,
        category: d.category || 'timetable',
        title: d.title,
        description: d.description,
        oldValue: d.old_value,
        newValue: d.new_value,
        changedBy: d.changed_by,
        role: d.role || 'CR',
        reason: d.reason,
        sourceDoc: d.source_doc,
        timestamp: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      this.notify();
    }
  }

  private async pullAnnouncements(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      this.state.announcements = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        category: d.category,
        priority: d.priority,
        authorName: d.author_name,
        authorRole: d.author_role,
        validUntil: d.valid_until,
        isPinned: d.is_pinned,
        createdAt: new Date(d.created_at).toLocaleDateString(),
      }));
      this.notify();
    }
  }

  private async pullAssignments(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: asgs } = await supabase.from('assignments').select('*, subjects(name)').order('due_date');
    if (!asgs || asgs.length === 0) return;

    // Fetch personal student statuses
    let studentStatusMap: Record<string, AssignmentStatus> = {};
    if (this.currentUserId) {
      const { data: statuses } = await supabase
        .from('student_assignments')
        .select('*')
        .eq('user_id', this.currentUserId);
      if (statuses) {
        statuses.forEach((s: any) => {
          studentStatusMap[s.assignment_id] = s.status as AssignmentStatus;
        });
      }
    }

    this.state.assignments = asgs.map((d: any) => ({
      id: d.id,
      subjectId: d.subject_id,
      subjectName: d.subjects?.name || 'Academic Subject',
      title: d.title,
      topic: d.topic,
      description: d.description,
      dueDate: d.due_date,
      totalMarks: d.total_marks || 20,
      createdBy: d.created_by,
      status: studentStatusMap[d.id] || 'not_started',
      submissionLink: d.submission_link,
    }));
    this.notify();
  }

  private async pullExams(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('exams').select('*, subjects(name)').order('exam_date');
    if (data && data.length > 0) {
      this.state.exams = data.map((d: any) => ({
        id: d.id,
        subjectId: d.subject_id,
        subjectName: d.subjects?.name || 'Subject',
        title: d.title,
        examType: d.exam_type,
        examDate: d.exam_date,
        startTime: d.start_time,
        endTime: d.end_time,
        room: d.room,
        syllabusCovered: d.syllabus_covered,
        totalMarks: d.total_marks || 50,
      }));
      this.notify();
    }
  }

  private async pullDoubts(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: doubts } = await supabase.from('doubts').select('*, subjects(name), doubt_answers(*)').order('created_at', { ascending: false });
    if (doubts && doubts.length > 0) {
      this.state.doubts = doubts.map((d: any) => ({
        id: d.id,
        subjectId: d.subject_id,
        subjectName: d.subjects?.name || 'Subject',
        topic: d.topic,
        question: d.question,
        studentName: d.student_name,
        createdAt: new Date(d.created_at).toLocaleDateString(),
        upvotes: d.upvotes || 1,
        isResolved: d.is_resolved,
        answers: (d.doubt_answers || []).map((a: any) => ({
          id: a.id,
          doubtId: d.id,
          answerText: a.answer_text,
          authorName: a.author_name,
          authorRole: a.author_role,
          isVerified: a.is_verified,
          upvotes: a.upvotes || 1,
          createdAt: new Date(a.created_at).toLocaleDateString(),
        })),
      }));
      this.notify();
    }
  }

  private async pullPolls(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const existingMap = new Map<string, Poll>();
        (this.state.polls || []).forEach((p) => {
          existingMap.set(p.id, p);
          if (p.question) existingMap.set(p.question.trim().toLowerCase(), p);
        });

        const syncedPolls: Poll[] = data.map((d: any) => {
          const existing = existingMap.get(d.id) || (d.question ? existingMap.get(d.question.trim().toLowerCase()) : undefined);

          // Determine real status: if DB or local has 'declared', keep declared!
          let finalStatus: 'active' | 'declared' | 'expired' = 'active';
          if (d.status === 'declared' || existing?.status === 'declared') {
            finalStatus = 'declared';
          } else if (d.status === 'expired' || existing?.status === 'expired') {
            finalStatus = 'expired';
          } else if (d.expires_at && new Date(d.expires_at).getTime() < Date.now()) {
            finalStatus = 'expired';
          }

          return {
            id: d.id,
            question: d.question,
            description: d.description || existing?.description || undefined,
            options: d.options && Array.isArray(d.options) && d.options.length > 0 ? d.options : (existing?.options || []),
            expiresAt: d.expires_at,
            createdBy: d.created_by || existing?.createdBy || 'USAR CR',
            createdAt: new Date(d.created_at).toLocaleDateString(),
            status: finalStatus,
            winningOptionId: d.winning_option_id !== undefined && d.winning_option_id !== null
              ? d.winning_option_id
              : existing?.winningOptionId,
            declarationMessage: d.declaration_message || existing?.declarationMessage,
            declaredBy: d.declared_by || existing?.declaredBy,
            declaredAt: d.declared_at || existing?.declaredAt,
            userVotedOptionId: existing?.userVotedOptionId,
          };
        });

        // Retain local polls that might not yet be in Supabase (e.g. initial demo polls)
        const remoteIds = new Set(data.map((d: any) => d.id));
        const localOnly = (this.state.polls || []).filter(
          (p) => !remoteIds.has(p.id) && !data.some((d: any) => d.question === p.question)
        );

        this.state.polls = [...syncedPolls, ...localOnly];
        this.saveLocalState();
        this.notify();
      }
    } catch (err) {
      console.warn('Error syncing polls from Supabase:', err);
    }
  }

  private async pullResources(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('resources').select('*, subjects(name), resource_versions(*)').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      this.state.resources = data.map((d: any) => ({
        id: d.id,
        subjectId: d.subject_id,
        subjectName: d.subjects?.name || 'Subject',
        unitNumber: d.unit_number,
        title: d.title,
        topic: d.topic,
        type: d.type,
        currentVersion: d.current_version,
        fileUrl: d.file_url,
        fileSize: d.file_size,
        uploadedBy: d.uploader_name || d.uploaded_by,
        uploadDate: d.upload_date || 'Recent',
        versions: (d.resource_versions || []).map((v: any) => ({
          versionTag: v.version_tag,
          changelogNote: v.changelog_note,
          uploadDate: v.upload_date,
          fileSize: v.file_size,
          fileUrl: v.file_url,
          uploadedBy: v.uploaded_by,
        })),
      }));
      this.notify();
    }
  }

  private async pullSyllabus(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('syllabus_units').select('*, subjects(name)').order('unit_number');
    if (data && data.length > 0) {
      this.state.syllabus = data.map((d: any) => ({
        id: d.id,
        subjectId: d.subject_id,
        subjectName: d.subjects?.name || 'Subject',
        unitNumber: d.unit_number,
        title: d.title,
        description: d.description || '',
        topics: d.topics || [],
        status: d.status,
      }));
      this.notify();
    }
  }

  private async pullFaculty(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('faculty').select('*');
    if (data && data.length > 0) {
      this.state.faculty = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        designation: d.designation,
        subject: d.subject,
        department: d.department,
        room: d.room,
        email: d.email,
        phone: d.phone,
        officeHours: d.office_hours,
        isAvailable: d.is_available,
        cabinFloor: d.cabin_floor || '3rd Floor',
      }));
      this.notify();
    }
  }

  private async pullQuickLinks(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('quick_links').select('*');
    if (data && data.length > 0) {
      this.state.quickLinks = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        url: d.url,
        description: d.description,
        iconName: d.icon || 'ExternalLink',
      }));
      this.notify();
    }
  }

  private async pullWeeklySchedules(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('weekly_schedules')
        .select('*')
        .order('week_number', { ascending: true });
      if (data && data.length > 0) {
        this.state.weeklySchedules = data.map((d: any) => ({
          id: d.id,
          weekNumber: d.week_number,
          weekLabel: d.week_label,
          startDate: d.start_date,
          endDate: d.end_date,
          versionTag: d.version_tag,
          slots: typeof d.slots === 'string' ? JSON.parse(d.slots) : d.slots || [],
          notes: d.notes || undefined,
        }));
        this.notify();
      }
    } catch (err) {
      console.warn('Could not pull weekly schedules:', err);
    }
  }

  private async pullDailyOverrides(): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('daily_class_overrides')
        .select('*')
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        this.state.dailyOverrides = data.map((d: any) => ({
          id: d.id,
          date: d.date,
          slotId: d.slot_id || undefined,
          type: d.type,
          originalSubject: d.original_subject || undefined,
          alteredSubject: d.altered_subject,
          alteredFaculty: d.altered_faculty || undefined,
          alteredRoom: d.altered_room || undefined,
          startTime: d.start_time,
          endTime: d.end_time,
          reason: d.reason || '',
          reportedBy: d.reported_by || 'CR',
          timestamp: d.created_at || d.timestamp || new Date().toISOString(),
        }));
        this.notify();
      }
    } catch (err) {
      console.warn('Could not pull daily overrides:', err);
    }
  }

  // --- GETTERS ---
  public getState(): AppState {
    return this.state;
  }
  public getSubjects(): Subject[] {
    return this.state.subjects;
  }
  public getTimetable(): TimetableEntry[] {
    return this.state.timetable;
  }
  public getTimetableVersion(): number {
    return this.state.timetableVersion;
  }
  public getPendingDiffs(): TimetableDiff[] {
    return this.state.pendingDiffs;
  }
  public getAuditLog(): AuditLogEntry[] {
    return this.state.auditLog;
  }
  public getSyllabus(): SyllabusUnit[] {
    return this.state.syllabus;
  }
  public getResources(): AcademicResource[] {
    if (!this.state.resources || this.state.resources.length === 0) {
      this.state.resources = INITIAL_RESOURCES;
    }
    return this.state.resources;
  }
  public getAnnouncements(): Announcement[] {
    return this.state.announcements;
  }
  public getAssignments(): Assignment[] {
    return this.state.assignments;
  }
  public getExams(): Exam[] {
    return this.state.exams;
  }
  public getDoubts(): Doubt[] {
    return this.state.doubts;
  }
  public getAttendance(): AttendanceRecord[] {
    return this.state.attendance;
  }
  public getPolls(): Poll[] {
    return this.state.polls;
  }
  public getFaculty(): FacultyMember[] {
    return this.state.faculty;
  }
  public getQuickLinks(): QuickLink[] {
    return this.state.quickLinks;
  }
  public getDailyOverrides(date?: string): DailyClassOverride[] {
    if (!this.state.dailyOverrides) this.state.dailyOverrides = [];
    if (!date) return this.state.dailyOverrides;
    return this.state.dailyOverrides.filter((o) => o.date === date);
  }

  public async addDailyOverride(
    override: Omit<DailyClassOverride, 'id' | 'timestamp'>
  ): Promise<void> {
    if (!this.state.dailyOverrides) this.state.dailyOverrides = [];
    const newEntry: DailyClassOverride = {
      ...override,
      id: `override-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    // Replace existing override for the same date and slot if any
    this.state.dailyOverrides = this.state.dailyOverrides.filter(
      (o) => !(o.date === override.date && o.slotId && o.slotId === override.slotId)
    );
    this.state.dailyOverrides.push(newEntry);

    // Also record into audit log
    const auditTitle =
      override.type === 'holiday'
        ? `Holiday Declared for ${override.date}`
        : override.type === 'mass_bunk'
        ? `Mass Bunk Recorded on ${override.date}`
        : override.type === 'cancelled'
        ? `Class Cancelled on ${override.date}`
        : `Class Alteration on ${override.date}`;

    this.state.auditLog.unshift({
      id: `audit-${Date.now()}`,
      category: 'timetable',
      title: auditTitle,
      description: `${override.alteredSubject} (${override.startTime}–${override.endTime}): ${override.reason}`,
      oldValue: override.originalSubject,
      newValue: override.alteredSubject,
      changedBy: override.reportedBy,
      role: 'CR',
      reason: override.reason,
      timestamp: 'Just now',
    });

    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('daily_class_overrides').upsert({
          id: newEntry.id,
          class_id: this.currentClassId,
          date: newEntry.date,
          slot_id: newEntry.slotId || null,
          type: newEntry.type,
          original_subject: newEntry.originalSubject || null,
          altered_subject: newEntry.alteredSubject,
          altered_faculty: newEntry.alteredFaculty || null,
          altered_room: newEntry.alteredRoom || null,
          start_time: newEntry.startTime,
          end_time: newEntry.endTime,
          reason: newEntry.reason,
          reported_by: newEntry.reportedBy,
        });

        await supabase.from('timetable_changes').insert({
          category: 'timetable',
          title: auditTitle,
          description: `${override.alteredSubject} (${override.startTime}–${override.endTime}): ${override.reason}`,
          old_value: override.originalSubject || null,
          new_value: override.alteredSubject,
          changed_by: override.reportedBy,
          role: 'CR',
          reason: override.reason,
        });
      } catch (err) {
        console.warn('Could not push daily override to Supabase:', err);
      }
    }
  }

  public async removeDailyOverride(id: string): Promise<void> {
    if (!this.state.dailyOverrides) return;
    this.state.dailyOverrides = this.state.dailyOverrides.filter((o) => o.id !== id);
    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('daily_class_overrides').delete().eq('id', id);
      } catch (err) {
        console.warn('Could not delete daily override from Supabase:', err);
      }
    }
  }

  public getWeeklySchedules(): WeeklyTimetableSchedule[] {
    if (!this.state.weeklySchedules || this.state.weeklySchedules.length === 0) {
      this.state.weeklySchedules = generateInitialWeeklySchedules(this.state.timetable);
    }
    this.state.weeklySchedules.forEach((w) => {
      const range = getWeekDateRange(w.weekNumber);
      w.startDate = range.startDate;
      w.endDate = range.endDate;
      w.weekLabel = range.label;
    });
    return this.state.weeklySchedules;
  }

  public getScheduleForWeek(weekNum: number): WeeklyTimetableSchedule | undefined {
    return this.getWeeklySchedules().find((w) => w.weekNumber === weekNum);
  }

  public async applyScheduleToWeek(
    weekNum: number,
    slots: TimetableEntry[],
    versionTag: string,
    applyFromThisWeekOnward: boolean = false,
    notes?: string
  ): Promise<void> {
    const schedules = this.getWeeklySchedules();
    const targetWeek = schedules.find((w) => w.weekNumber === weekNum);

    if (targetWeek) {
      targetWeek.slots = slots;
      targetWeek.versionTag = versionTag;
      if (notes) targetWeek.notes = notes;
    }

    if (applyFromThisWeekOnward) {
      schedules.forEach((w) => {
        if (w.weekNumber >= weekNum) {
          w.slots = slots;
          w.versionTag = versionTag;
        }
      });
      // Also update master default timetable
      this.state.timetable = slots;
      this.state.timetableVersion += 1;
    }

    this.state.auditLog.unshift({
      id: `audit-${Date.now()}`,
      category: 'timetable',
      title: `Timetable Applied to Week ${weekNum}`,
      description: `Uploaded and synced schedule for ${targetWeek?.weekLabel || `Week ${weekNum}`} (${versionTag}).`,
      changedBy: 'CR / Administration',
      role: 'CR',
      reason: notes || 'Weekly Schedule Update',
      timestamp: 'Just now',
    });

    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const affectedWeeks = applyFromThisWeekOnward
          ? schedules.filter((w) => w.weekNumber >= weekNum)
          : [targetWeek!].filter(Boolean);

        for (const w of affectedWeeks) {
          await supabase.from('weekly_schedules').upsert({
            id: w.id,
            class_id: this.currentClassId,
            week_number: w.weekNumber,
            week_label: w.weekLabel,
            start_date: w.startDate,
            end_date: w.endDate,
            version_tag: w.versionTag,
            slots: w.slots,
            notes: w.notes || null,
          });
        }

        await supabase.from('timetable_changes').insert({
          category: 'timetable',
          title: `Timetable Applied to Week ${weekNum}`,
          description: `Uploaded and synced schedule for ${targetWeek?.weekLabel || `Week ${weekNum}`} (${versionTag}).`,
          changed_by: 'CR / Administration',
          role: 'CR',
          reason: notes || 'Weekly Schedule Update',
        });
      } catch (err) {
        console.warn('Could not push weekly schedule to Supabase:', err);
      }
    }
  }

  public getEffectiveDaySchedule(dateStr: string, labGroup: string = 'all'): TimetableEntry[] {
    const d = parseLocalDate(dateStr);
    let dayOfWeek = d.getDay(); // 0 is Sun, 1 is Mon...
    if (isNaN(dayOfWeek)) dayOfWeek = 1;

    // Check if date belongs to a specific weekly snapshot
    const weeks = this.getWeeklySchedules();
    const matchedWeek = weeks.find((w) => dateStr >= w.startDate && dateStr <= w.endDate);
    const sourceSlots = matchedWeek ? matchedWeek.slots : this.state.timetable;

    // Get baseline slots for that day of week
    let baseSlots = sourceSlots.filter((t) => t.dayOfWeek === dayOfWeek);

    // Apply lab group filter
    if (labGroup !== 'all') {
      baseSlots = baseSlots.filter((s) => !s.labGroup || s.labGroup === 'all' || s.labGroup === labGroup);
    }

    const overrides = this.getDailyOverrides(dateStr);
    const fullDayOverride = overrides.find(
      (o) =>
        o.type === 'holiday' ||
        o.type === 'all_classes_cancelled' ||
        o.type === 'college_event' ||
        (!o.slotId && (o.type === 'cancelled' || o.type === 'mass_bunk'))
    );

    if (fullDayOverride) {
      let displayTitle = fullDayOverride.alteredSubject;
      if (!displayTitle || displayTitle === 'University Holiday / Off-Day') {
        if (fullDayOverride.type === 'college_event') {
          displayTitle = fullDayOverride.reason || 'Student Induction Program / College Event';
        } else if (fullDayOverride.type === 'all_classes_cancelled') {
          displayTitle = 'No Classes Held';
        } else if (fullDayOverride.type === 'mass_bunk') {
          displayTitle = 'Mass Bunk';
        } else {
          displayTitle = 'University Holiday / Off-Day';
        }
      }

      return [
        {
          id: `full-day-${fullDayOverride.id}`,
          dayOfWeek,
          startTime: fullDayOverride.startTime || '09:00',
          endTime: fullDayOverride.endTime || '17:00',
          subjectId: fullDayOverride.type || 'college_event',
          subjectName: displayTitle,
          room: fullDayOverride.alteredRoom || (fullDayOverride.type === 'holiday' ? 'Campus Closed' : 'Main Auditorium / Campus'),
          faculty: fullDayOverride.reportedBy || 'Administration',
          type: 'lecture',
          isChanged: true,
          changeNote: fullDayOverride.reason || (fullDayOverride.type === 'college_event' ? 'College event conducted — No classes held' : 'No classes held on this date'),
        },
      ];
    }

    const resultSlots: TimetableEntry[] = [];

    for (const baseSlot of baseSlots) {
      const matchOverride = overrides.find((o) => o.slotId === baseSlot.id);
      if (matchOverride) {
        if (matchOverride.type === 'cancelled' || matchOverride.type === 'mass_bunk') {
          resultSlots.push({
            ...baseSlot,
            subjectName: `${baseSlot.subjectName} (${matchOverride.type === 'mass_bunk' ? 'MASS BUNK' : 'CANCELLED'})`,
            isChanged: true,
            changeNote: `${matchOverride.reason} [Reported by ${matchOverride.reportedBy}]`,
          });
        } else if (matchOverride.type === 'swap') {
          resultSlots.push({
            ...baseSlot,
            subjectName: matchOverride.alteredSubject,
            room: matchOverride.alteredRoom || baseSlot.room,
            faculty: matchOverride.alteredFaculty || baseSlot.faculty,
            isChanged: true,
            previousSubject: baseSlot.subjectName,
            changeNote: `${matchOverride.reason} (Replaced ${baseSlot.subjectName}) [Reported by ${matchOverride.reportedBy}]`,
          });
        } else {
          resultSlots.push(baseSlot);
        }
      } else {
        resultSlots.push(baseSlot);
      }
    }

    // Add extra class overrides that don't match existing slotIds
    const extraOverrides = overrides.filter((o) => o.type === 'extra_class' && !o.slotId);
    for (const extra of extraOverrides) {
      resultSlots.push({
        id: extra.id,
        dayOfWeek,
        startTime: extra.startTime,
        endTime: extra.endTime,
        subjectId: 'extra',
        subjectName: extra.alteredSubject,
        room: extra.alteredRoom || 'A-403',
        faculty: extra.alteredFaculty || 'Department Faculty',
        type: 'lecture',
        isChanged: true,
        changeNote: `Extra Session: ${extra.reason} [Reported by ${extra.reportedBy}]`,
      });
    }

    return resultSlots.sort((a, b) => {
      const [aH, aM] = a.startTime.split(':').map(Number);
      const [bH, bM] = b.startTime.split(':').map(Number);
      return aH * 60 + aM - (bH * 60 + bM);
    });
  }

  // --- MUTATION ACTIONS (Local + Supabase Sync) ---

  // 1. Timetable Diff & Approval Pipeline
  public async approveAndPublishTimetable(
    diffsToApply: TimetableDiff[],
    reason: string,
    changedBy: string = 'Rahul Verma (CR)',
    sourceDoc: string = 'B.Tech 1st Year Revised Timetable.pdf'
  ): Promise<void> {
    const updatedTimetable = [...this.state.timetable];

    diffsToApply.forEach((diff) => {
      const existingIndex = updatedTimetable.findIndex(
        (t) => t.dayOfWeek === diff.dayOfWeek && (t.startTime.includes(diff.timeSlot.split('–')[0].trim()) || diff.timeSlot.includes(t.startTime))
      );

      if (diff.changeType === 'new') {
        updatedTimetable.push({
          id: `tt-new-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          dayOfWeek: diff.dayOfWeek,
          startTime: diff.timeSlot.split('–')[0].trim(),
          endTime: diff.timeSlot.split('–')[1]?.trim() || '16:00',
          subjectId: 'sub-draw',
          subjectName: diff.subjectName,
          room: diff.newRoom || 'Drawing Hall',
          faculty: 'Prof. Rajesh Nair',
          type: 'lab',
          isChanged: true,
          changeNote: diff.reason,
        });
      } else if (existingIndex >= 0) {
        const oldEntry = updatedTimetable[existingIndex];
        updatedTimetable[existingIndex] = {
          ...oldEntry,
          subjectName: diff.changeType === 'modified' ? diff.newValue : oldEntry.subjectName,
          room: diff.newRoom || (diff.newValue.includes('Lab') ? 'Lab 3' : oldEntry.room),
          isChanged: true,
          previousSubject: diff.oldValue || oldEntry.subjectName,
          previousRoom: diff.oldRoom || oldEntry.room,
          changeNote: diff.reason,
        };
      }
    });

    const newVersion = this.state.timetableVersion + 1;

    const newAuditEntry: AuditLogEntry = {
      id: `log-${Date.now()}`,
      category: 'timetable',
      title: `Timetable Revised to Version ${newVersion}`,
      description: `CR approved ${diffsToApply.length} schedule changes. Reason: ${reason}`,
      changedBy,
      role: 'CR',
      reason,
      sourceDoc,
      timestamp: 'Just now',
    };

    const newAnnouncement: Announcement = {
      id: `ann-tt-${Date.now()}`,
      title: `📢 Timetable Updated to Version ${newVersion}`,
      content: `The class timetable has been updated following: "${reason}". Check the timetable tab to view shifted lecture and lab slots.`,
      category: 'timetable',
      priority: 'urgent',
      authorName: changedBy,
      authorRole: 'CR',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isPinned: true,
      createdAt: 'Just now',
    };

    this.state = {
      ...this.state,
      timetable: updatedTimetable,
      pendingDiffs: [],
      timetableVersion: newVersion,
      auditLog: [newAuditEntry, ...this.state.auditLog],
      announcements: [newAnnouncement, ...this.state.announcements],
    };

    this.saveLocalState();

    // Supabase push if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const classId = await this.ensureClassId();
        await supabase.from('timetable_entries').delete().eq('class_id', classId);
        const rows = updatedTimetable.map((e) => ({
          class_id: classId,
          subject_id: this.resolveSubjectUuid(e.subjectCode || e.subjectId),
          day_of_week: e.dayOfWeek,
          start_time: e.startTime,
          end_time: e.endTime,
          room: e.room,
          faculty: e.faculty,
          type: e.type || 'lecture',
          is_changed: !!e.isChanged,
          change_note: e.labGroup ? `Group: ${e.labGroup}` : (e.changeNote || null),
          version_id: newVersion,
        }));
        if (rows.length > 0) {
          await supabase.from('timetable_entries').insert(rows);
        }

        await supabase.from('timetable_changes').insert({
          class_id: classId,
          category: 'timetable',
          title: newAuditEntry.title,
          description: newAuditEntry.description,
          reason,
          source_doc: sourceDoc,
          changed_by: changedBy,
          role: 'CR',
        });
        await supabase.from('announcements').insert({
          class_id: classId,
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          category: newAnnouncement.category,
          priority: newAnnouncement.priority,
          author_name: newAnnouncement.authorName,
          author_role: newAnnouncement.authorRole,
          valid_until: newAnnouncement.validUntil,
          is_pinned: true,
        });
      } catch (err) {
        console.warn('Could not sync timetable publish to Supabase:', err);
      }
    }
  }

  // 1b. Apply Full Batch Timetable (from PDF import or Batch Switcher)
  public async applyBatchTimetable(
    newEntries: TimetableEntry[],
    batchName: string = 'AR-I B2',
    reason: string = 'Imported latest official timetable from Final TT-I SEM- Odd SEM-2026-27.pdf',
    sourceDoc: string = 'Final TT-I SEM- Odd SEM-2026-27.pdf',
    changedBy: string = 'Rahul Verma (CR)'
  ): Promise<void> {
    const newVersion = this.state.timetableVersion + 1;

    const newAuditEntry: AuditLogEntry = {
      id: `log-${Date.now()}`,
      category: 'timetable',
      title: `Timetable Updated: ${batchName} (v${newVersion})`,
      description: `Official schedule imported for batch ${batchName}. Total slots: ${newEntries.length}. Reason: ${reason}`,
      changedBy,
      role: 'CR',
      reason,
      sourceDoc,
      timestamp: 'Just now',
    };

    const newAnnouncement: Announcement = {
      id: `ann-tt-${Date.now()}`,
      title: `📢 Official Timetable Applied: ${batchName} (v${newVersion})`,
      content: `The active timetable for ${batchName} has been synchronized with "${sourceDoc}". Verify your lecture and lab room allocations (including Group B2-A and B2-B schedules).`,
      category: 'timetable',
      priority: 'urgent',
      authorName: changedBy,
      authorRole: 'CR',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isPinned: true,
      createdAt: 'Just now',
    };

    this.state = {
      ...this.state,
      timetable: newEntries,
      pendingDiffs: [],
      timetableVersion: newVersion,
      auditLog: [newAuditEntry, ...this.state.auditLog],
      announcements: [newAnnouncement, ...this.state.announcements],
    };

    this.saveLocalState();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn('Timetable database synchronization requires an authenticated CR or Admin session.');
          return;
        }

        const classId = await this.ensureClassId();

        // 1. Delete previous entries
        await supabase.from('timetable_entries').delete().eq('class_id', classId);

        // 2. Insert new entries
        const rows = newEntries.map((e) => ({
          class_id: classId,
          subject_id: this.resolveSubjectUuid(e.subjectCode || e.subjectId),
          day_of_week: e.dayOfWeek,
          start_time: e.startTime,
          end_time: e.endTime,
          room: e.room,
          faculty: e.faculty,
          type: e.type || 'lecture',
          is_changed: !!e.isChanged,
          change_note: e.labGroup ? `Group: ${e.labGroup}` : (e.changeNote || null),
          version_id: newVersion,
        }));

        if (rows.length > 0) {
          const { error: insErr } = await supabase.from('timetable_entries').insert(rows);
          if (insErr) {
            console.error('Error inserting timetable entries into Supabase:', insErr);
          } else {
            console.log(`✓ Synchronized ${rows.length} timetable entries to Supabase for ${batchName}`);
          }
        }

        // 3. Insert audit log
        await supabase.from('timetable_changes').insert({
          class_id: classId,
          category: 'timetable',
          title: newAuditEntry.title,
          description: newAuditEntry.description,
          reason,
          source_doc: sourceDoc,
          changed_by: changedBy,
          role: 'CR',
        });

        // 4. Insert announcement
        await supabase.from('announcements').insert({
          class_id: classId,
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          category: 'timetable',
          priority: 'urgent',
          author_name: newAnnouncement.authorName,
          author_role: newAnnouncement.authorRole,
          valid_until: newAnnouncement.validUntil,
          is_pinned: true,
        });
      } catch (err) {
        console.warn('Could not sync timetable batch import to Supabase:', err);
      }
    }
  }

  public loadSimulatedDiffs(diffs: TimetableDiff[]): void {
    this.state = { ...this.state, pendingDiffs: diffs };
    this.saveLocalState();
  }

  // 2. Next-Gen Timetable-Linked Attendance & Session Tracker
  public getConductedSessions(
    startDate: string = '2026-08-03',
    endDate: string = getTodayDateStr(),
    labGroup: string = 'all'
  ): ConductedClassSession[] {
    const sessions: ConductedClassSession[] = [];
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);

    const current = new Date(start);
    while (current <= end) {
      const dateStr = formatLocalDate(current);
      const dayOfWeek = current.getDay(); // 0 is Sun, 1 is Mon...
      const weekNumber = getWeekNumberFromDate(dateStr);

      if (dayOfWeek !== 0) {
        const daySlots = this.getEffectiveDaySchedule(dateStr, labGroup);
        for (const slot of daySlots) {
          const isCollegeEvent =
            slot.subjectId === 'college_event' ||
            slot.subjectName.toLowerCase().includes('orientation') ||
            slot.subjectName.toLowerCase().includes('induction') ||
            slot.subjectName.toLowerCase().includes('fest') ||
            slot.subjectName.toLowerCase().includes('function') ||
            slot.subjectName.toLowerCase().includes('event') ||
            (slot.changeNote ? (
              slot.changeNote.toLowerCase().includes('induction') ||
              slot.changeNote.toLowerCase().includes('orientation') ||
              slot.changeNote.toLowerCase().includes('fest') ||
              slot.changeNote.toLowerCase().includes('event')
            ) : false);

          const isAllClassesCancelled =
            slot.subjectId === 'all_classes_cancelled' ||
            slot.subjectName.toLowerCase().includes('all classes cancelled') ||
            slot.subjectName.toLowerCase().includes('no classes held');

          const isHoliday =
            (slot.subjectId === 'holiday' || slot.subjectName.toLowerCase().includes('holiday')) &&
            !isCollegeEvent &&
            !isAllClassesCancelled;

          const isCancelled = slot.subjectName.includes('CANCELLED');
          const isMassBunk = slot.subjectName.includes('MASS BUNK');

          let displayName = slot.subjectName.replace(' (CANCELLED)', '').replace(' (MASS BUNK)', '');
          if (isCollegeEvent && (displayName === 'University Holiday / Off-Day' || displayName === 'University Holiday')) {
            displayName = slot.changeNote || 'Student Induction Program';
          }

          sessions.push({
            id: `session_${dateStr}_${slot.id}`,
            date: dateStr,
            dayOfWeek,
            weekNumber,
            slotId: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectId: slot.subjectId,
            subjectCode: slot.subjectCode,
            subjectName: displayName,
            room: slot.room,
            faculty: slot.faculty,
            type: slot.type,
            labGroup: slot.labGroup as any,
            isChanged: slot.isChanged,
            changeNote: slot.changeNote,
            isHoliday,
            isCollegeEvent,
            isAllClassesCancelled,
            isCancelled,
            isMassBunk,
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return sessions;
  }

  public getStudentSessionAttendance(): Record<string, StudentSessionAttendanceRecord> {
    if (!this.state.sessionAttendance) {
      this.state.sessionAttendance = {};
    }
    return this.state.sessionAttendance;
  }

  public async markSessionAttendance(
    date: string,
    slotId: string,
    subjectId: string,
    subjectName: string,
    status: SessionAttendanceStatus,
    notes?: string
  ): Promise<void> {
    if (!this.state.sessionAttendance) {
      this.state.sessionAttendance = {};
    }

    const sessionId = `session_${date}_${slotId}`;
    const record: StudentSessionAttendanceRecord = {
      id: sessionId,
      date,
      slotId,
      subjectId,
      subjectName,
      status,
      markedAt: new Date().toISOString(),
      notes,
    };

    this.state.sessionAttendance[sessionId] = record;
    this.saveLocalState();
    this.notify();

    // Sync to Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase && this.currentUserId) {
      try {
        await supabase.from('student_attendance').upsert({
          id: `${this.currentUserId}_${date}_${slotId}`,
          user_id: this.currentUserId,
          date,
          slot_id: slotId,
          subject_id: subjectId,
          subject_name: subjectName,
          status,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not sync session attendance to Supabase:', err);
      }
    }
  }

  public async bulkMarkDayAttendance(
    date: string,
    status: SessionAttendanceStatus,
    labGroup: string = 'all'
  ): Promise<void> {
    const daySessions = this.getConductedSessions(date, date, labGroup).filter(
      (s) => !s.isHoliday && !s.isCancelled && !s.isMassBunk
    );

    for (const session of daySessions) {
      await this.markSessionAttendance(
        session.date,
        session.slotId,
        session.subjectId,
        session.subjectName,
        status
      );
    }
  }

  public async bulkMarkWeekAttendance(
    weekNumber: number,
    status: SessionAttendanceStatus,
    labGroup: string = 'all'
  ): Promise<void> {
    const range = getWeekDateRange(weekNumber);
    const today = getTodayDateStr();
    const effectiveEnd = range.endDate < today ? range.endDate : today;

    if (range.startDate > today) return; // Future week

    const weekSessions = this.getConductedSessions(range.startDate, effectiveEnd, labGroup).filter(
      (s) => !s.isHoliday && !s.isCancelled && !s.isMassBunk
    );

    for (const session of weekSessions) {
      await this.markSessionAttendance(
        session.date,
        session.slotId,
        session.subjectId,
        session.subjectName,
        status
      );
    }
  }

  public getSubjectAttendanceSummaries(labGroup: string = 'all'): SubjectAttendanceSummary[] {
    const sessions = this.getConductedSessions('2026-08-03', getTodayDateStr(), labGroup);
    const sessionAtt = this.getStudentSessionAttendance();

    const subjectMap: Map<
      string,
      {
        subjectId: string;
        subjectCode: string;
        subjectName: string;
        faculty: string;
        color?: string;
        conducted: number;
        attended: number;
        absent: number;
        leaves: number;
      }
    > = new Map();

    // Populate default subjects
    this.state.subjects.forEach((s) => {
      subjectMap.set(s.id, {
        subjectId: s.id,
        subjectCode: s.code,
        subjectName: s.name,
        faculty: s.facultyName,
        color: s.color,
        conducted: 0,
        attended: 0,
        absent: 0,
        leaves: 0,
      });
    });

    for (const session of sessions) {
      if (session.isHoliday || session.isCancelled || session.isMassBunk) {
        continue;
      }

      let subEntry = subjectMap.get(session.subjectId);
      if (!subEntry) {
        const match = Array.from(subjectMap.values()).find(
          (v) =>
            v.subjectName.toLowerCase() === session.subjectName.toLowerCase() ||
            (session.subjectCode && v.subjectCode.toLowerCase() === session.subjectCode.toLowerCase())
        );
        if (match) subEntry = match;
      }

      if (subEntry) {
        subEntry.conducted += 1;
        const attRec =
          sessionAtt[session.id] ||
          sessionAtt[`session_${session.date}_${session.slotId}`] ||
          sessionAtt[`att_${session.date}_${session.slotId}`];

        if (!attRec || attRec.status === 'present') {
          // Defaults to Present if unmarked for past classes
          subEntry.attended += 1;
        } else if (attRec.status === 'absent') {
          subEntry.absent += 1;
        } else if (attRec.status === 'leave') {
          subEntry.leaves += 1;
          // Duty/Medical leave is exempted
          subEntry.conducted = Math.max(0, subEntry.conducted - 1);
        }
      }
    }

    return Array.from(subjectMap.values()).map((s) => {
      const percentage = s.conducted === 0 ? 100 : Number(((s.attended / s.conducted) * 100).toFixed(1));
      const isEligible = percentage >= 75;

      let bunksAvailable = 0;
      let classesNeeded = 0;

      if (percentage >= 75) {
        bunksAvailable = Math.max(0, Math.floor((s.attended / 0.75) - s.conducted));
      } else {
        classesNeeded = Math.max(0, Math.ceil(3 * s.conducted - 4 * s.attended));
      }

      return {
        ...s,
        percentage,
        isEligible,
        bunksAvailable,
        classesNeeded,
      };
    });
  }

  // Legacy attendance logger for backward compatibility
  public logAttendance(subjectId: string, attendedDelta: number, totalDelta: number): void {
    const updated = this.state.attendance.map((rec) => {
      if (rec.subjectId === subjectId) {
        const newAttended = Math.max(0, rec.attended + attendedDelta);
        const newTotal = Math.max(newAttended, rec.total + totalDelta);
        const percentage = newTotal === 0 ? 100 : Number(((newAttended / newTotal) * 100).toFixed(1));

        let safeBunks = 0;
        let neededTo75 = 0;

        if (percentage >= 75) {
          safeBunks = Math.floor(newAttended / 0.75 - newTotal);
          neededTo75 = 0;
        } else {
          neededTo75 = Math.ceil(3 * newTotal - 4 * newAttended);
          safeBunks = 0;
        }

        return {
          ...rec,
          attended: newAttended,
          total: newTotal,
          percentage,
          safeBunks: Math.max(0, safeBunks),
          neededTo75: Math.max(0, neededTo75),
          color: percentage >= 75 ? (rec.color === '#ef4444' ? '#3b82f6' : rec.color) : '#ef4444',
        };
      }
      return rec;
    });

    this.state = { ...this.state, attendance: updated };
    this.saveLocalState();
  }

  // 3. Assignment Status (Per-Student Tracking)
  public async setAssignmentStatus(assignmentId: string, status: AssignmentStatus): Promise<void> {
    const updated = this.state.assignments.map((asg) => {
      if (asg.id === assignmentId) {
        return { ...asg, status };
      }
      return asg;
    });

    this.state = { ...this.state, assignments: updated };
    this.saveLocalState();

    const supabase = getSupabaseClient();
    if (supabase && this.currentUserId) {
      try {
        await supabase.from('student_assignments').upsert({
          assignment_id: assignmentId,
          user_id: this.currentUserId,
          status,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'assignment_id,user_id' });
      } catch (err) {
        console.warn('Error updating student assignment status:', err);
      }
    }
  }

  public async addAssignment(newAsg: Omit<Assignment, 'id'>): Promise<void> {
    const asgId = `asg-${Date.now()}`;
    const asg: Assignment = { ...newAsg, id: asgId };

    const audit: AuditLogEntry = {
      id: `log-asg-${Date.now()}`,
      category: 'assignment',
      title: `New Assignment Added: ${asg.title}`,
      description: `Subject: ${asg.subjectName} • Due: ${new Date(asg.dueDate).toLocaleDateString()}`,
      changedBy: asg.createdBy,
      role: 'CR',
      reason: 'Official coursework assignment announced by faculty',
      timestamp: 'Just now',
    };

    this.state = {
      ...this.state,
      assignments: [asg, ...this.state.assignments],
      auditLog: [audit, ...this.state.auditLog],
    };
    this.saveLocalState();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const classId = await this.ensureClassId();
        const subUuid = this.resolveSubjectUuid(asg.subjectId);
        await supabase.from('assignments').insert({
          class_id: classId,
          subject_id: subUuid,
          title: asg.title,
          topic: asg.topic,
          description: asg.description,
          due_date: new Date(asg.dueDate).toISOString(),
          total_marks: asg.totalMarks,
          created_by: asg.createdBy,
          submission_link: asg.submissionLink,
        });
      } catch (err) {
        console.warn('Error inserting assignment to Supabase:', err);
      }
    }
  }

  // 4. Announcements
  public async addAnnouncement(newAnn: Omit<Announcement, 'id' | 'createdAt'>): Promise<void> {
    const ann: Announcement = {
      ...newAnn,
      id: `ann-${Date.now()}`,
      createdAt: 'Just now',
    };

    const audit: AuditLogEntry = {
      id: `log-ann-${Date.now()}`,
      category: 'announcement',
      title: `New Announcement: ${ann.title}`,
      description: ann.content.slice(0, 80) + '...',
      changedBy: ann.authorName,
      role: ann.authorRole,
      reason: `Published under ${ann.category} notice category`,
      timestamp: 'Just now',
    };

    this.state = {
      ...this.state,
      announcements: [ann, ...this.state.announcements],
      auditLog: [audit, ...this.state.auditLog],
    };
    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const classId = await this.ensureClassId();
        await supabase.from('announcements').insert({
          class_id: classId,
          title: ann.title,
          content: ann.content,
          category: ann.category,
          priority: ann.priority,
          author_name: ann.authorName,
          author_role: ann.authorRole,
          valid_until: ann.validUntil,
          is_pinned: ann.isPinned || false,
        });
      } catch (err) {
        console.warn('Error inserting announcement to Supabase:', err);
      }
    }
  }

  public async deleteAnnouncement(announcementId: string, deletedBy: string = 'CR / Admin'): Promise<void> {
    const targetAnn = this.state.announcements.find((a) => a.id === announcementId);

    const audit: AuditLogEntry | null = targetAnn
      ? {
          id: `log-del-ann-${Date.now()}`,
          category: 'announcement',
          title: `Deleted Notice: ${targetAnn.title}`,
          description: `Notice removed from circular board: "${targetAnn.title}"`,
          changedBy: deletedBy,
          role: 'CR',
          reason: 'Notice deleted by coordinator',
          timestamp: 'Just now',
        }
      : null;

    this.state = {
      ...this.state,
      announcements: this.state.announcements.filter((a) => a.id !== announcementId),
      auditLog: audit ? [audit, ...this.state.auditLog] : this.state.auditLog,
    };
    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('announcements').delete().eq('id', announcementId);
      } catch (err) {
        console.warn('Error deleting announcement from Supabase:', err);
      }
    }
  }

  // 5. Doubts
  public async addDoubt(newDoubt: Omit<Doubt, 'id' | 'createdAt' | 'upvotes' | 'answers' | 'isResolved'>): Promise<void> {
    const doubtId = `doubt-${Date.now()}`;
    const doubt: Doubt = {
      ...newDoubt,
      id: doubtId,
      createdAt: 'Just now',
      upvotes: 1,
      isResolved: false,
      answers: [],
    };

    this.state = { ...this.state, doubts: [doubt, ...this.state.doubts] };
    this.saveLocalState();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const classId = await this.ensureClassId();
        const subUuid = this.resolveSubjectUuid(doubt.subjectId);
        await supabase.from('doubts').insert({
          class_id: classId,
          subject_id: subUuid,
          topic: doubt.topic,
          question: doubt.question,
          student_name: doubt.studentName,
          user_id: this.currentUserId,
          upvotes: 1,
          is_resolved: false,
        });
      } catch (err) {
        console.warn('Error inserting doubt to Supabase:', err);
      }
    }
  }

  public async addDoubtAnswer(doubtId: string, answerText: string, authorName: string, authorRole: 'student' | 'cr' | 'faculty' | 'admin'): Promise<void> {
    const newAns = {
      id: `ans-${Date.now()}`,
      doubtId,
      answerText,
      authorName,
      authorRole: (authorRole === 'admin' ? 'faculty' : authorRole) as 'student' | 'cr' | 'faculty',
      isVerified: authorRole === 'faculty' || authorRole === 'admin',
      upvotes: 1,
      createdAt: 'Just now',
    };

    const updated = this.state.doubts.map((d) => {
      if (d.id === doubtId) {
        return { ...d, answers: [...d.answers, newAns] };
      }
      return d;
    });

    this.state = { ...this.state, doubts: updated };
    this.saveLocalState();

    const supabase = getSupabaseClient();
    if (supabase && doubtId.includes('-') && !doubtId.startsWith('doubt-')) {
      try {
        await supabase.from('doubt_answers').insert({
          doubt_id: doubtId,
          user_id: this.currentUserId,
          answer_text: answerText,
          author_name: authorName,
          author_role: authorRole,
          is_verified: authorRole === 'faculty' || authorRole === 'admin',
          upvotes: 1,
        });
      } catch (err) {
        console.warn('Error inserting doubt answer to Supabase:', err);
      }
    }
  }

  public async verifyDoubtAnswer(doubtId: string, answerId: string): Promise<void> {
    const updated = this.state.doubts.map((d) => {
      if (d.id === doubtId) {
        return {
          ...d,
          isResolved: true,
          answers: d.answers.map((ans) => {
            if (ans.id === answerId) {
              return { ...ans, isVerified: !ans.isVerified };
            }
            return ans;
          }),
        };
      }
      return d;
    });

    this.state = { ...this.state, doubts: updated };
    this.saveLocalState();

    const supabase = getSupabaseClient();
    if (supabase && answerId.includes('-') && !answerId.startsWith('ans-')) {
      try {
        await supabase.from('doubt_answers').update({ is_verified: true }).eq('id', answerId);
        await supabase.from('doubts').update({ is_resolved: true }).eq('id', doubtId);
      } catch (err) {
        console.warn('Error verifying answer in Supabase:', err);
      }
    }
  }

  public upvoteDoubt(doubtId: string): void {
    const updated = this.state.doubts.map((d) => {
      if (d.id === doubtId) {
        const hasUpvoted = d.hasUpvoted;
        return {
          ...d,
          upvotes: hasUpvoted ? d.upvotes - 1 : d.upvotes + 1,
          hasUpvoted: !hasUpvoted,
        };
      }
      return d;
    });
    this.state = { ...this.state, doubts: updated };
    this.saveLocalState();
  }

  public upvoteAnswer(doubtId: string, answerId: string): void {
    const updated = this.state.doubts.map((d) => {
      if (d.id === doubtId) {
        return {
          ...d,
          answers: d.answers.map((a) => {
            if (a.id === answerId) {
              const hasUpvoted = a.hasUpvoted;
              return {
                ...a,
                upvotes: hasUpvoted ? a.upvotes - 1 : a.upvotes + 1,
                hasUpvoted: !hasUpvoted,
              };
            }
            return a;
          }),
        };
      }
      return d;
    });
    this.state = { ...this.state, doubts: updated };
    this.saveLocalState();
  }

  // 6. Polls & Consensus
  public async votePoll(pollId: string, optionIndex: number): Promise<void> {
    let updatedTargetPoll: Poll | undefined;
    const updated = this.state.polls.map((poll) => {
      if (poll.id === pollId) {
        const previousVote = poll.userVotedOptionId;
        const newOptions = poll.options.map((opt) => {
          if (previousVote === opt.id) {
            return { ...opt, votes: Math.max(0, opt.votes - 1) };
          }
          if (opt.id === optionIndex) {
            return { ...opt, votes: opt.votes + 1 };
          }
          return opt;
        });
        const pollWithVote: Poll = {
          ...poll,
          options: newOptions,
          userVotedOptionId: optionIndex,
        };
        updatedTargetPoll = pollWithVote;
        return pollWithVote;
      }
      return poll;
    });

    this.state = { ...this.state, polls: updated };
    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        if (updatedTargetPoll) {
          await supabase
            .from('polls')
            .update({ options: updatedTargetPoll.options })
            .eq('id', pollId);
        }

        if (this.currentUserId && !pollId.startsWith('poll-')) {
          await supabase.from('poll_votes').upsert(
            {
              poll_id: pollId,
              user_id: this.currentUserId,
              student_name: 'Student',
              option_index: optionIndex,
            },
            { onConflict: 'poll_id,user_id' }
          );
        }
      } catch (err) {
        console.warn('Error voting poll in Supabase:', err);
      }
    }
  }

  public async createPoll(
    question: string,
    optionsText: string[],
    expiresAtISO: string,
    createdBy: string = 'USAR CR',
    description?: string
  ): Promise<void> {
    const tempId = `poll-${Date.now()}`;
    const newPoll: Poll = {
      id: tempId,
      question,
      description: description || undefined,
      options: optionsText.map((txt, idx) => ({ id: idx, text: txt, votes: 0 })),
      expiresAt: expiresAtISO,
      createdBy,
      createdAt: 'Just now',
      status: 'active',
    };

    this.state = { ...this.state, polls: [newPoll, ...this.state.polls] };
    this.saveLocalState();
    this.notify();

    // Log to audit trail
    this.addAuditLog({
      id: `audit-${Date.now()}`,
      category: 'announcement',
      title: 'New Class Consensus Poll Conducted',
      description: `CR opened poll: "${question}" (Closes at ${new Date(expiresAtISO).toLocaleString()})`,
      changedBy: createdBy,
      role: 'CR',
      reason: 'Batch consensus poll initiated',
      timestamp: 'Just now',
    });

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const classId = await this.ensureClassId();
        const { data, error } = await supabase
          .from('polls')
          .insert({
            class_id: classId,
            question,
            description: newPoll.description,
            options: newPoll.options,
            expires_at: newPoll.expiresAt,
            created_by: newPoll.createdBy,
            status: 'active',
          })
          .select()
          .single();

        if (!error && data && data.id) {
          // Adopt Supabase generated UUID
          this.state = {
            ...this.state,
            polls: this.state.polls.map((p) => (p.id === tempId ? { ...p, id: data.id } : p)),
          };
          this.saveLocalState();
          this.notify();
        }
      } catch (err) {
        console.warn('Error creating poll in Supabase:', err);
      }
    }
  }

  public addAuditLog(entry: AuditLogEntry): void {
    this.state = {
      ...this.state,
      auditLog: [entry, ...this.state.auditLog],
    };
    this.saveLocalState();
    this.notify();
  }

  public async declarePollResult(
    pollId: string,
    winningOptionId: number,
    declarationMessage: string,
    declaredBy: string = 'Dhruv Singh (CR)',
    broadcastToAnnouncements: boolean = true
  ): Promise<void> {
    const targetPoll = this.state.polls.find((p) => p.id === pollId);
    if (!targetPoll) return;

    const winningOption = targetPoll.options.find((o) => o.id === winningOptionId);
    const winningText = winningOption ? winningOption.text : 'Selected Option';
    const nowIso = new Date().toISOString();

    const updated = this.state.polls.map((poll) => {
      if (poll.id === pollId) {
        return {
          ...poll,
          status: 'declared' as const,
          winningOptionId,
          declarationMessage,
          declaredBy,
          declaredAt: nowIso,
        };
      }
      return poll;
    });

    this.state = { ...this.state, polls: updated };
    this.saveLocalState();
    this.notify();

    // Broadcast official consensus announcement
    if (broadcastToAnnouncements) {
      await this.addAnnouncement({
        title: `[Official Decision] Poll Result: ${targetPoll.question}`,
        content: `Consensus Decided: "${winningText}"\n\nCR Message: ${declarationMessage}`,
        category: 'important',
        priority: 'urgent',
        authorName: declaredBy,
        authorRole: 'CR',
        isPinned: true,
      });
    }

    this.addAuditLog({
      id: `audit-${Date.now()}`,
      category: 'announcement',
      title: 'Poll Consensus Decision Declared',
      description: `CR announced result for: "${targetPoll.question}" -> Decision: "${winningText}" (${declarationMessage})`,
      changedBy: declaredBy,
      role: 'CR',
      reason: 'Official class poll decision finalized',
      timestamp: 'Just now',
    });

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('polls')
          .update({
            status: 'declared',
            winning_option_id: winningOptionId,
            declaration_message: declarationMessage,
            declared_by: declaredBy,
            declared_at: nowIso,
            options: targetPoll.options,
          })
          .eq('id', pollId);

        if (error) {
          console.warn('Primary poll declaration update error, attempting options fallback:', error);
          await supabase
            .from('polls')
            .update({ options: targetPoll.options })
            .eq('id', pollId);
        }
      } catch (err) {
        console.warn('Error updating poll declaration in Supabase:', err);
      }
    }
  }

  public async closePoll(pollId: string): Promise<void> {
    const updated = this.state.polls.map((poll) => {
      if (poll.id === pollId) {
        return {
          ...poll,
          status: 'expired' as const,
        };
      }
      return poll;
    });

    this.state = { ...this.state, polls: updated };
    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('polls').update({ status: 'expired' }).eq('id', pollId);
      } catch (err) {
        console.warn('Error closing poll in Supabase:', err);
      }
    }
  }

  public async deletePoll(pollId: string): Promise<void> {
    this.state = {
      ...this.state,
      polls: this.state.polls.filter((p) => p.id !== pollId),
    };
    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('polls').delete().eq('id', pollId);
      } catch (err) {
        console.warn('Error deleting poll in Supabase:', err);
      }
    }
  }

  // 7. Resources & Version Control
  public getDriveHubConfig(): DriveHubConfig {
    return this.state.driveHub || DEFAULT_DRIVE_HUB;
  }

  public async updateDriveHubConfig(config: Partial<DriveHubConfig>): Promise<void> {
    this.state = {
      ...this.state,
      driveHub: {
        ...(this.state.driveHub || DEFAULT_DRIVE_HUB),
        ...config,
      },
    };
    this.saveLocalState();
    this.notify();
  }

  public syncDriveResources(scannedResources: AcademicResource[]): void {
    if (!scannedResources || scannedResources.length === 0) return;
    this.state = {
      ...this.state,
      resources: scannedResources,
    };
    this.saveLocalState();
    this.notify();
  }

  public async addResource(res: Omit<AcademicResource, 'id' | 'currentVersion' | 'versions'>): Promise<void> {
    const newRes: AcademicResource = {
      ...res,
      id: `res-${Date.now()}`,
      currentVersion: 'v1',
      versions: [
        {
          versionTag: 'v1',
          changelogNote: 'Initial upload',
          uploadDate: res.uploadDate || 'Today',
          fileSize: res.fileSize,
          fileUrl: res.fileUrl,
          uploadedBy: res.uploadedBy,
        },
      ],
    };

    this.state = { ...this.state, resources: [newRes, ...this.state.resources] };
    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const classId = await this.ensureClassId();
        const subUuid = this.resolveSubjectUuid(res.subjectId);
        const validTypes = ['lecture_notes', 'pyq', 'question_bank', 'reference_book', 'lab_manual'];
        const sanitizedType = validTypes.includes(res.type) ? res.type : 'lecture_notes';

        const { data: createdRow, error: insErr } = await supabase
          .from('resources')
          .insert({
            class_id: classId,
            subject_id: subUuid,
            title: res.title,
            topic: res.topic,
            type: sanitizedType,
            current_version: 'v1',
            file_url: res.fileUrl,
            file_size: res.fileSize,
            uploaded_by: res.uploadedBy,
            upload_date: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insErr) {
          console.warn('Supabase resource insert error:', insErr);
        } else if (createdRow?.id) {
          newRes.id = createdRow.id;
          this.saveLocalState();
        }
      } catch (err) {
        console.warn('Error creating resource in Supabase:', err);
      }
    }
  }

  public async deleteResource(resourceId: string): Promise<void> {
    this.state = {
      ...this.state,
      resources: this.state.resources.filter((r) => r.id !== resourceId),
    };
    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('resources').delete().eq('id', resourceId);
      } catch (err) {
        console.warn('Error deleting resource from Supabase:', err);
      }
    }
  }

  public async addResourceVersion(
    resourceId: string,
    newVersionTag: string,
    changelogNote: string,
    fileSize: string,
    fileUrl: string,
    uploadedBy: string
  ): Promise<void> {
    const updated = this.state.resources.map((res) => {
      if (res.id === resourceId) {
        const newVer = {
          versionTag: newVersionTag,
          changelogNote,
          uploadDate: 'Today',
          fileSize,
          fileUrl,
          uploadedBy,
        };
        return {
          ...res,
          currentVersion: newVersionTag,
          fileSize,
          fileUrl,
          uploadDate: 'Today',
          uploadedBy,
          versions: [newVer, ...res.versions],
        };
      }
      return res;
    });

    this.state = { ...this.state, resources: updated };
    this.saveLocalState();
    this.notify();

    const supabase = getSupabaseClient();
    if (supabase && resourceId.includes('-') && !resourceId.startsWith('res-')) {
      try {
        await supabase.from('resource_versions').insert({
          resource_id: resourceId,
          version_tag: newVersionTag,
          changelog_note: changelogNote,
          file_url: fileUrl,
          file_size: fileSize,
          uploaded_by: uploadedBy,
        });
        await supabase.from('resources').update({
          current_version: newVersionTag,
          file_url: fileUrl,
          file_size: fileSize,
        }).eq('id', resourceId);
      } catch (err) {
        console.warn('Error adding resource version to Supabase:', err);
      }
    }
  }

  // 8. Syllabus Topic Toggle
  public toggleTopicCompletion(unitId: string, topicId: string): void {
    const updated = this.state.syllabus.map((unit) => {
      if (unit.id === unitId) {
        const newTopics = unit.topics.map((t) => (t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t));
        const allCompleted = newTopics.every((t) => t.isCompleted);
        const someCompleted = newTopics.some((t) => t.isCompleted);
        return {
          ...unit,
          topics: newTopics,
          status: allCompleted ? ('completed' as const) : someCompleted ? ('in_progress' as const) : ('upcoming' as const),
        };
      }
      return unit;
    });

    this.state = { ...this.state, syllabus: updated };
    this.saveLocalState();
  }

  public resetToDefaults(): void {
    this.state = getInitialState();
    this.saveLocalState();
  }
}

export const dataService = new SupabaseDataService();
