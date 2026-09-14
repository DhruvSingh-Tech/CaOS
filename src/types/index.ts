export type UserRole = 'student' | 'cr' | 'faculty' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  rollNo?: string;
  classBatch: string;
  classId?: string;
  avatarUrl?: string;
  labGroup?: 'Group B2-A' | 'Group B2-B' | 'all';
  createdAt?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  shortName: string;
  facultyName: string;
  color: string;
  defaultRoom: string;
  credits: number;
}

export type ClassType = 'lecture' | 'lab' | 'tutorial';

export interface TimetableEntry {
  id: string;
  dayOfWeek: number; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  dayName?: string;  // "Monday", "Tuesday", etc.
  startTime: string; // "10:00"
  endTime: string;   // "11:00"
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  room: string;
  faculty: string;
  type: ClassType;
  labGroup?: string; // e.g. 'Group B2-A' | 'Group B2-B' | 'all'
  isChanged?: boolean;
  previousSubject?: string;
  previousRoom?: string;
  changeNote?: string;
}

export type ChangeType = 'modified' | 'room_change' | 'new' | 'cancelled';

export interface TimetableDiff {
  id: string;
  dayName: string;
  dayOfWeek: number;
  timeSlot: string;
  subjectName: string;
  changeType: ChangeType;
  oldValue?: string;
  newValue: string;
  oldRoom?: string;
  newRoom?: string;
  reason: string;
}

export interface AuditLogEntry {
  id: string;
  category: 'timetable' | 'assignment' | 'announcement' | 'syllabus' | 'exam';
  title: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  role: string;
  reason: string;
  sourceDoc?: string;
  timestamp: string;
}

export interface SyllabusTopic {
  id: string;
  title: string;
  hours?: number;
  isCompleted?: boolean;
}

export interface SyllabusUnit {
  id: string;
  subjectId: string;
  subjectName: string;
  unitNumber: number;
  title: string;
  description: string;
  topics: SyllabusTopic[];
  status: 'completed' | 'in_progress' | 'upcoming';
}

export type ResourceType = 'lecture_notes' | 'pyq' | 'question_bank' | 'reference_book' | 'lab_manual';

export interface DriveHubConfig {
  rootFolderUrl: string;
  pyqsFolderUrl: string;
  seniorNotesFolderUrl: string;
  practicalFolderUrl: string;
  theoryFolderUrl: string;
  curriculumPdfUrl: string;
  readmeUrl: string;
}

export interface ResourceVersion {
  versionTag: string; // 'v1', 'v2'
  changelogNote: string;
  uploadDate: string;
  fileSize: string;
  fileUrl: string;
  uploadedBy: string;
}

export interface AcademicResource {
  id: string;
  subjectId: string;
  subjectName: string;
  unitNumber?: number;
  title: string;
  topic: string;
  type: ResourceType;
  currentVersion: string;
  fileUrl: string;
  fileSize: string;
  uploadedBy: string;
  uploadDate: string;
  category?: 'pyq' | 'senior_notes' | 'practical' | 'theory' | 'curriculum' | 'general';
  isPinned?: boolean;
  driveEmbedUrl?: string;
  versions: ResourceVersion[];
}

export type AnnouncementCategory = 'important' | 'exam' | 'assignment' | 'timetable' | 'holiday' | 'general';
export type AnnouncementPriority = 'urgent' | 'normal' | 'low';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  authorName: string;
  authorRole: string;
  validUntil?: string; // ISO date string
  isPinned?: boolean;
  createdAt: string;
}

export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed';

export interface Assignment {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  topic: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  createdBy: string;
  status: AssignmentStatus; // for current student
  submissionLink?: string;
}

export interface Exam {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  examType: 'internal_assessment' | 'mid_sem' | 'quiz' | 'practical' | 'end_sem';
  examDate: string; // "2026-09-18"
  startTime: string; // "10:00 AM"
  endTime: string;   // "11:30 AM"
  room: string;
  // syllabusCovered: string;
  totalMarks: number;
}

export interface DoubtAnswer {
  id: string;
  doubtId: string;
  answerText: string;
  authorName: string;
  authorRole: 'student' | 'cr' | 'faculty';
  isVerified: boolean;
  upvotes: number;
  hasUpvoted?: boolean;
  createdAt: string;
}

export interface Doubt {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  question: string;
  studentName: string;
  createdAt: string;
  upvotes: number;
  hasUpvoted?: boolean;
  isResolved: boolean;
  answers: DoubtAnswer[];
}

export interface AttendanceRecord {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  attended: number;
  total: number;
  percentage: number;
  safeBunks: number;
  neededTo75: number;
  color: string;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
  votedUserIds?: string[];
}

export type PollStatus = 'active' | 'expired' | 'declared';

export interface Poll {
  id: string;
  question: string;
  description?: string;
  options: PollOption[];
  expiresAt: string; // ISO string e.g. "2026-09-15T18:00:00.000Z"
  createdBy: string;
  createdAt: string;
  status: PollStatus;
  winningOptionId?: number;
  declarationMessage?: string;
  declaredBy?: string;
  declaredAt?: string;
  userVotedOptionId?: number;
}

export interface FacultyMember {
  id: string;
  name: string;
  designation: string;
  subject: string;
  department: string;
  room: string;
  email: string;
  phone?: string;
  officeHours: string;
  isAvailable: boolean;
  cabinFloor: string;
}

export interface QuickLink {
  id: string;
  title: string;
  category: 'portal' | 'academics' | 'campus' | 'resources';
  url: string;
  description: string;
  iconName: string;
}

export type DayAlterationType =
  | 'swap'
  | 'cancelled'
  | 'mass_bunk'
  | 'holiday'
  | 'all_classes_cancelled'
  | 'college_event'
  | 'extra_class'
  | 'regular';

export interface DailyClassOverride {
  id: string;
  date: string; // "YYYY-MM-DD" e.g., "2026-08-03", "2026-09-14"
  slotId?: string;
  originalSubject?: string;
  alteredSubject: string; // e.g. "Mathematics-I (Extra)" or "Cancelled" or "Mass Bunk"
  alteredRoom?: string;
  alteredFaculty?: string;
  startTime: string; // "10:00"
  endTime: string; // "11:00"
  type: DayAlterationType;
  reason: string;
  reportedBy: string; // "Dhruv Singh (CR)"
  timestamp: string;
}

export interface WeeklyTimetableSchedule {
  id: string; // "week-1", "week-2"
  weekNumber: number; // 1, 2, 3...
  weekLabel: string; // "Week 1 (Aug 3 – Aug 8, 2026)"
  startDate: string; // "2026-08-03"
  endDate: string; // "2026-08-08"
  versionTag: string; // "v1 (Aug 3 Initial)"
  slots: TimetableEntry[];
  notes?: string;
}

export type SessionAttendanceStatus = 'present' | 'absent' | 'leave' | 'cancelled' | 'unmarked';

export interface StudentSessionAttendanceRecord {
  id: string; // e.g. "att_2026-08-03_slot-1"
  date: string; // "YYYY-MM-DD"
  slotId: string;
  subjectId: string;
  subjectName: string;
  status: SessionAttendanceStatus;
  markedAt?: string;
  notes?: string;
}

export interface ConductedClassSession {
  id: string; // unique session id: `${date}_${slotId}`
  date: string; // "YYYY-MM-DD"
  dayOfWeek: number; // 1 = Mon, ..., 6 = Sat
  weekNumber: number;
  slotId: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectCode?: string;
  subjectName: string;
  room: string;
  faculty: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'break';
  labGroup?: 'Group B2-A' | 'Group B2-B' | 'all';
  isChanged?: boolean;
  changeNote?: string;
  isHoliday?: boolean;
  isCollegeEvent?: boolean;
  isAllClassesCancelled?: boolean;
  isCancelled?: boolean;
  isMassBunk?: boolean;
}

export interface SubjectAttendanceSummary {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  faculty: string;
  color?: string;
  conducted: number;
  attended: number;
  absent: number;
  leaves: number;
  percentage: number;
  isEligible: boolean; // >= 75%
  bunksAvailable: number; // How many classes can be safely bunked before falling below 75%
  classesNeeded: number; // How many consecutive classes needed to reach 75%
}


