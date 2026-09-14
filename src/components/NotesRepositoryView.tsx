import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  FolderGit2,
  FileText,
  UploadCloud,
  Download,
  Clock,
  Tag,
  BookOpen,
  Filter,
  Plus,
  Lock,
  ExternalLink,
  Eye,
  Trash2,
  Settings,
  Sparkles,
  FolderOpen,
  FileCheck,
  Share2,
  Check,
  Search,
  BookMarked,
  FolderArchive,
  GraduationCap,
  Layers,
  ArrowUpRight,
  FileSpreadsheet,
  ChevronRight,
  RefreshCw,
  Folder,
  File,
  AlertCircle,
  Key,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { AcademicResource, Subject, UserRole, DriveHubConfig } from '../types';
import { dataService } from '../services/dataService';
import { uploadAcademicFile } from '../lib/storage';
import { useAuth } from '../lib/auth';
import { parseDriveLink, deepScanDriveFolderTree } from '../lib/googleDrive';
import { INITIAL_RESOURCES } from '../data/initialData';
import { DriveVaultExplorer } from './DriveVaultExplorer';

interface NotesRepositoryViewProps {
  resources: AcademicResource[];
  subjects: Subject[];
  currentRole: UserRole;
}

export function NotesRepositoryView({
  resources,
  subjects,
  currentRole,
}: NotesRepositoryViewProps) {
  const { user } = useAuth();
  const isCRorAdmin = user?.role === 'cr' || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'explorer' | 'curated'>('explorer');
  const [driveHub, setDriveHub] = useState<DriveHubConfig>(dataService.getDriveHubConfig());
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDriveHubSettingsOpen, setIsDriveHubSettingsOpen] = useState(false);
  const [previewResource, setPreviewResource] = useState<{
    title: string;
    url: string;
    embedUrl?: string;
    subjectName?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Upload state
  const [newSubjectId, setNewSubjectId] = useState<string>(subjects[0]?.id || 'sub-general');
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newCategory, setNewCategory] = useState<
    'pyq' | 'senior_notes' | 'practical' | 'theory' | 'curriculum' | 'general'
  >('theory');
  const [newDriveUrl, setNewDriveUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Settings form state
  const [hubSettingsForm, setHubSettingsForm] = useState<DriveHubConfig>(driveHub);

  // Live Sync State
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSyncDriveApi = async () => {
    setIsSyncingDrive(true);
    setSyncError(null);
    setSyncStatusMsg('Connecting to Google Drive Vault...');

    const res = await deepScanDriveFolderTree(
      hubSettingsForm.rootFolderUrl,
      subjects,
      (msg) => setSyncStatusMsg(msg)
    );

    setIsSyncingDrive(false);
    if (res.success && res.resources.length > 0) {
      dataService.syncDriveResources(res.resources);
      await dataService.updateDriveHubConfig(hubSettingsForm);
      setIsDriveHubSettingsOpen(false);
      confetti({ particleCount: 80, spread: 70 });
      alert(`🎉 Successfully extracted and indexed ${res.resources.length} files from your Google Drive!`);
    } else {
      setSyncError(
        res.error ||
          'No files could be extracted. Please ensure the Drive folder is Shared with "Anyone with link".'
      );
    }
  };

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setDriveHub(dataService.getDriveHubConfig());
    });
    return () => unsub();
  }, []);

  const safeResources = resources && resources.length > 0 ? resources : dataService.getResources();

  const filteredResources = safeResources.filter((res) => {
    const matchSubject = selectedSubject === 'all' || res.subjectId === selectedSubject;
    const matchCategory =
      selectedCategory === 'all' ||
      res.category === selectedCategory ||
      (selectedCategory === 'pyq' && (res.type === 'pyq' || res.category === 'pyq')) ||
      (selectedCategory === 'senior_notes' && res.category === 'senior_notes') ||
      (selectedCategory === 'practical' && (res.type === 'lab_manual' || res.category === 'practical')) ||
      (selectedCategory === 'theory' && res.category === 'theory') ||
      (selectedCategory === 'curriculum' && res.category === 'curriculum');
    const matchQuery =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.subjectName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubject && matchCategory && matchQuery;
  });

  const handleOpenPreview = (title: string, url: string, subjectName?: string) => {
    const parsed = parseDriveLink(url);
    setPreviewResource({
      title,
      url,
      embedUrl: parsed.embedUrl,
      subjectName,
    });
  };

  const handleCopyPreviewLink = () => {
    if (previewResource?.url) {
      navigator.clipboard.writeText(previewResource.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    setIsUploading(true);
    let uploadedUrl = newDriveUrl.trim() || driveHub.rootFolderUrl;
    let uploadedSize = 'Google Drive File';

    if (selectedFile) {
      const result = await uploadAcademicFile('notes', selectedFile);
      if (result.publicUrl) uploadedUrl = result.publicUrl;
      if (result.fileSize) uploadedSize = result.fileSize;
    } else if (newDriveUrl) {
      const parsed = parseDriveLink(newDriveUrl);
      uploadedSize = parsed.type === 'folder' ? 'Google Drive Folder' : 'Google Drive Doc';
    }

    const sub = subjects.find((s) => s.id === newSubjectId);
    let mappedType: 'lecture_notes' | 'pyq' | 'question_bank' | 'reference_book' | 'lab_manual' =
      'lecture_notes';
    if (newCategory === 'pyq') mappedType = 'pyq';
    else if (newCategory === 'practical') mappedType = 'lab_manual';
    else if (newCategory === 'curriculum') mappedType = 'reference_book';

    await dataService.addResource({
      subjectId: newSubjectId,
      subjectName: sub ? sub.name : 'General Academic Subject',
      title: newTitle,
      topic: newTopic || 'Class Reference Material',
      type: mappedType,
      category: newCategory,
      fileSize: uploadedSize,
      fileUrl: uploadedUrl,
      uploadedBy: user ? `${user.name} (${user.role.toUpperCase()})` : 'USAR Contributor',
      uploadDate: 'Today',
      isPinned: false,
    });

    setIsUploading(false);
    setIsUploadOpen(false);
    setNewTitle('');
    setNewTopic('');
    setNewDriveUrl('');
    setSelectedFile(null);

    confetti({
      particleCount: 50,
      spread: 60,
    });
  };

  const handleDeleteResource = async (resId: string, resTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${resTitle}"?`)) return;
    await dataService.deleteResource(resId);
  };

  const handleSaveHubSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await dataService.updateDriveHubConfig(hubSettingsForm);
    setIsDriveHubSettingsOpen(false);
    confetti({
      particleCount: 40,
      spread: 50,
    });
  };

  const categories = [
    { id: 'all', label: 'All Resources' },
    { id: 'pyq', label: '📜 All PYQs (by seniors)' },
    { id: 'senior_notes', label: '📚 NOTES (by seniors)' },
    { id: 'practical', label: '🧪 PRACTICAL (Lab Files)' },
    { id: 'theory', label: '📝 THEORY (Class Notes)' },
    { id: 'curriculum', label: '📄 Academic Session Scheme' },
  ];

  const quickFolders = [
    {
      id: 'pyqs',
      title: 'All PYQs (by seniors)',
      desc: 'Previous year mid-term & end-term question banks with solved answer keys.',
      badge: 'Seniors Vault',
      badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
      category: 'pyq',
      icon: GraduationCap,
      folderUrl: driveHub.pyqsFolderUrl,
      iconColor: 'text-amber-400',
    },
    {
      id: 'notes',
      title: 'NOTES (by seniors)',
      desc: 'Handwritten summaries, key formulas, and chapter-wise exam revision notes.',
      badge: 'High Scorer Notes',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
      category: 'senior_notes',
      icon: BookMarked,
      folderUrl: driveHub.seniorNotesFolderUrl,
      iconColor: 'text-emerald-400',
    },
    {
      id: 'practical',
      title: 'PRACTICAL',
      desc: 'C Programming, Mechanics, and Analog Electronics lab manuals & viva questions.',
      badge: 'Lab Records',
      badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60',
      category: 'practical',
      icon: Layers,
      folderUrl: driveHub.practicalFolderUrl,
      iconColor: 'text-cyan-400',
    },
    {
      id: 'theory',
      title: 'THEORY (class notes)',
      desc: 'Official faculty lecture presentations, class board photos, and daily notes.',
      badge: 'Faculty Slides',
      badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
      category: 'theory',
      icon: FileSpreadsheet,
      folderUrl: driveHub.theoryFolderUrl,
      iconColor: 'text-indigo-400',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Academic Drive Vault
                </h1>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                  Google Drive Synced
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Organized study materials, senior handwritten notes, PYQs, and lab manuals for USAR AR-1 B2.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isCRorAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHubSettingsForm(driveHub);
                setIsDriveHubSettingsOpen(true);
              }}
              className="text-xs border-zinc-800 hover:border-zinc-700 font-medium"
            >
              <Settings className="h-3.5 w-3.5 mr-1 text-zinc-400" />
              Drive Settings
            </Button>
          )}

          <a
            href={driveHub.rootFolderUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-700 shadow-sm transition-all"
          >
            <FolderOpen className="h-4 w-4 mr-1.5 text-blue-400" />
            Open Batch Drive
            <ArrowUpRight className="h-3.5 w-3.5 ml-1 text-zinc-400" />
          </a>

          {user && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsUploadOpen(true)}
              className="text-xs font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note / Link
            </Button>
          )}
        </div>
      </div>

      {/* Navigation View Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 w-fit">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'explorer'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <FolderOpen className="h-4 w-4 text-blue-300" />
          Live Drive Explorer
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/50">
            Realtime
          </span>
        </button>

        <button
          onClick={() => setActiveTab('curated')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'curated'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <BookOpen className="h-4 w-4 text-indigo-300" />
          Curated Course Library
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
            {safeResources.length} items
          </span>
        </button>
      </div>

      {activeTab === 'explorer' ? (
        <DriveVaultExplorer />
      ) : (
        <>
          {/* 4 Quick Category Folders Showcase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickFolders.map((folder) => {
          const Icon = folder.icon;
          const isSelected = selectedCategory === folder.category;
          const count = safeResources.filter(
            (r) =>
              r.category === folder.category ||
              (folder.category === 'pyq' && (r.type === 'pyq' || r.category === 'pyq')) ||
              (folder.category === 'practical' && (r.type === 'lab_manual' || r.category === 'practical'))
          ).length;

          return (
            <div
              key={folder.id}
              className={`rounded-xl border p-4.5 transition-all flex flex-col justify-between cursor-pointer group ${
                isSelected
                  ? 'border-blue-500/80 bg-blue-950/30 shadow-lg ring-1 ring-blue-500/30'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/90'
              }`}
              onClick={() => {
                setSelectedCategory(isSelected ? 'all' : folder.category);
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="h-9 w-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${folder.iconColor}`} />
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${folder.badgeColor}`}
                  >
                    {folder.badge}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-1">
                  <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    {folder.title}
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {count} items
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                  {folder.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[11px] font-medium text-blue-400 group-hover:underline flex items-center gap-1">
                  {isSelected ? '✓ Showing Folder Contents' : 'Filter Folder Contents'}
                </span>
                <a
                  href={folder.folderUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Open folder directly in Google Drive"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pinned Session Curriculum & Readme Banner */}
      <div className="rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-900/80 via-zinc-900/50 to-blue-950/20 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">
                  AR_Academic Session_2026_27.pdf
                </span>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  2.7 MB • Scheme & Syllabus
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
                  OFFICIAL
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Complete B.Tech Automation & Robotics 1st Year Scheme, credit rules, and 4-unit course structures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleOpenPreview(
                  'AR_Academic Session_2026_27.pdf',
                  driveHub.curriculumPdfUrl,
                  'Curriculum & Scheme'
                )
              }
              className="text-xs border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-white font-medium"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
              In-App Preview
            </Button>
            <a
              href={driveHub.curriculumPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open in Drive
            </a>
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search notes, PYQs, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs text-white placeholder:text-zinc-500 w-full focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-zinc-800/80">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
            Subjects:
          </span>
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
              selectedSubject === 'all'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            All Subjects
          </button>
          {subjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubject(sub.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                selectedSubject === sub.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {sub.shortName || sub.name}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
            <FolderArchive className="h-9 w-9 text-zinc-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-zinc-300">No resources found</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Try adjusting your category or subject filters, or click on a folder above to browse its contents.
            </p>
          </div>
        ) : (
          filteredResources.map((res) => {
            const parsed = parseDriveLink(res.fileUrl);

            return (
              <div
                key={res.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                        {res.type.replace('_', ' ')}
                      </span>
                      {res.category && (
                        <span className="text-[10px] font-mono uppercase text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/40">
                          {res.category.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">{res.fileSize}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug group-hover:text-blue-300 transition-colors">
                    {res.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{res.topic}</p>

                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-800/60 text-[11px] text-zinc-400 font-mono">
                    <span className="truncate">{res.subjectName}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-500">{res.uploadDate}</span>
                  </div>
                </div>

                <div className="pt-3.5 mt-3.5 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-500 font-mono truncate max-w-[120px]">
                    {res.uploadedBy}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isCRorAdmin && (
                      <button
                        onClick={() => handleDeleteResource(res.id, res.title)}
                        title="Delete resource"
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPreview(res.title, res.fileUrl, res.subjectName)}
                      className="h-7 px-2.5 text-[11px] border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-medium"
                    >
                      <Eye className="h-3 w-3 mr-1 text-blue-400" />
                      Preview
                    </Button>

                    <a
                      href={res.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-7 px-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-[11px] font-semibold text-white flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Download className="h-3 w-3" />
                      <span>Drive</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {/* In-App Google Drive / Document Preview Modal */}
      {previewResource && (
        <Modal
          isOpen={Boolean(previewResource)}
          onClose={() => setPreviewResource(null)}
          title={previewResource.title}
          description={previewResource.subjectName || 'Google Drive Document Preview'}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
              <span className="text-zinc-400 font-mono truncate max-w-sm">
                {previewResource.url}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyPreviewLink}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] transition-colors"
                >
                  {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Share2 className="h-3 w-3" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
                <a
                  href={previewResource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open in Drive</span>
                </a>
              </div>
            </div>

            {/* Embedded Iframe Viewer */}
            <div className="w-full h-[520px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center relative">
              {previewResource.embedUrl ? (
                <iframe
                  src={previewResource.embedUrl}
                  title={previewResource.title}
                  className="w-full h-full border-0"
                  allow="autoplay"
                  loading="lazy"
                />
              ) : (
                <div className="text-center p-8">
                  <FolderOpen className="h-10 w-10 text-blue-400 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Direct Google Drive Link
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4">
                    This file is hosted directly on Google Drive. Click below to view and download.
                  </p>
                  <a
                    href={previewResource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md"
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Open in Google Drive
                  </a>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add New Resource / Google Drive Link Modal */}
      {user && (
        <Modal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Add Note or Google Drive Resource"
          description="Contribute study materials, PYQs, or drive links for USAR AR-1 B2."
          maxWidth="md"
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(
                    e.target.value as
                      | 'pyq'
                      | 'senior_notes'
                      | 'practical'
                      | 'theory'
                      | 'curriculum'
                      | 'general'
                  )
                }
                className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white"
              >
                <option value="theory">📝 THEORY (Class Notes & Faculty Slides)</option>
                <option value="senior_notes">📚 NOTES (By Seniors)</option>
                <option value="pyq">📜 All PYQs (By Seniors)</option>
                <option value="practical">🧪 PRACTICAL (Lab Manuals & Code)</option>
                <option value="curriculum">📄 Academic Curriculum & Scheme</option>
                <option value="general">ℹ️ General Reference Material</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Subject</label>
              <select
                value={newSubjectId}
                onChange={(e) => setNewSubjectId(e.target.value)}
                className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs text-white"
              >
                <option value="sub-general">All Subjects / General</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Resource Title</label>
              <Input
                type="text"
                placeholder="e.g. Unit 2 Handwritten Notes (Analog Electronics)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Topic / Chapter Description
              </label>
              <Input
                type="text"
                placeholder="e.g. Bipolar Junction Transistor (BJT) Characteristics & Formulas"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Google Drive Link (Folder or File URL)
              </label>
              <Input
                type="url"
                placeholder="https://drive.google.com/file/d/... or https://drive.google.com/drive/folders/..."
                value={newDriveUrl}
                onChange={(e) => setNewDriveUrl(e.target.value)}
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Paste any shared Google Drive file or folder link.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsUploadOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="default" size="sm" type="submit" isLoading={isUploading}>
                Save & Publish
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CR Drive Hub Link Manager Modal */}
      {isCRorAdmin && (
        <Modal
          isOpen={isDriveHubSettingsOpen}
          onClose={() => setIsDriveHubSettingsOpen(false)}
          title="Google Drive Hub Configuration"
          description="Set or update the official Google Drive folder links for USAR AR-1 B2."
          maxWidth="lg"
        >
          <form onSubmit={handleSaveHubSettings} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Main Batch Google Drive Root Link
              </label>
              <Input
                type="url"
                value={hubSettingsForm.rootFolderUrl}
                onChange={(e) =>
                  setHubSettingsForm({ ...hubSettingsForm, rootFolderUrl: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  📜 All PYQs (by seniors) Folder URL
                </label>
                <Input
                  type="url"
                  value={hubSettingsForm.pyqsFolderUrl}
                  onChange={(e) =>
                    setHubSettingsForm({ ...hubSettingsForm, pyqsFolderUrl: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  📚 NOTES (by seniors) Folder URL
                </label>
                <Input
                  type="url"
                  value={hubSettingsForm.seniorNotesFolderUrl}
                  onChange={(e) =>
                    setHubSettingsForm({ ...hubSettingsForm, seniorNotesFolderUrl: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  🧪 PRACTICAL Folder URL
                </label>
                <Input
                  type="url"
                  value={hubSettingsForm.practicalFolderUrl}
                  onChange={(e) =>
                    setHubSettingsForm({ ...hubSettingsForm, practicalFolderUrl: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  📝 THEORY (class notes) Folder URL
                </label>
                <Input
                  type="url"
                  value={hubSettingsForm.theoryFolderUrl}
                  onChange={(e) =>
                    setHubSettingsForm({ ...hubSettingsForm, theoryFolderUrl: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Academic Session Scheme PDF URL
                </label>
                <Input
                  type="url"
                  value={hubSettingsForm.curriculumPdfUrl}
                  onChange={(e) =>
                    setHubSettingsForm({ ...hubSettingsForm, curriculumPdfUrl: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  README / Course Map URL
                </label>
                <Input
                  type="url"
                  value={hubSettingsForm.readmeUrl}
                  onChange={(e) =>
                    setHubSettingsForm({ ...hubSettingsForm, readmeUrl: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Google Drive API Extraction Box */}
            <div className="p-4 bg-gradient-to-br from-blue-950/40 via-zinc-950 to-zinc-950 rounded-xl border border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <FolderOpen className="h-4 w-4 text-blue-400" />
                  <span>Google Drive Vault Automatic Sync</span>
                </div>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                  Cloud Synced
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Scan the batch Google Drive folder tree to automatically discover, index, and organize new notes, PYQs, and lab manuals into the Course Library.
              </p>

              {syncStatusMsg && (
                <div className="p-2.5 bg-blue-950/60 border border-blue-800/60 rounded-lg text-[11px] text-blue-200 flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400 shrink-0" />
                  <span>{syncStatusMsg}</span>
                </div>
              )}

              {syncError && (
                <div className="p-2.5 bg-red-950/60 border border-red-800/60 rounded-lg text-[11px] text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span>{syncError}</span>
                </div>
              )}

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSyncDriveApi}
                disabled={isSyncingDrive}
                className="w-full bg-blue-600 hover:bg-blue-500 font-bold text-xs shadow-md"
              >
                <Sparkles className="h-4 w-4 mr-1.5 text-amber-300" />
                {isSyncingDrive ? 'Extracting from Google Drive Vault...' : '⚡ Scan & Sync Live Drive Vault'}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  dataService.syncDriveResources(INITIAL_RESOURCES);
                  setIsDriveHubSettingsOpen(false);
                  alert('Restored default USAR AR-1 B2 Drive catalog.');
                }}
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                Restore Default Catalog
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsDriveHubSettingsOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="default" size="sm" type="submit">
                  Save Drive Settings
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
