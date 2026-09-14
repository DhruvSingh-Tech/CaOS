import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  Download,
  ExternalLink,
  Eye,
  Search,
  ChevronRight,
  RefreshCw,
  FolderOpen,
  ArrowLeft,
  FileCode,
  FileSpreadsheet,
  FileImage,
  File,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Share2,
  Check,
  GraduationCap,
  Layers,
  BookMarked,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import {
  VaultItem,
  fetchVaultFolderItems,
  DEFAULT_ROOT_FOLDER_ID,
} from '../lib/googleDrive';

interface Breadcrumb {
  id: string;
  name: string;
}

interface DriveVaultExplorerProps {
  initialFolderId?: string;
  onSelectFile?: (file: VaultItem) => void;
}

export function DriveVaultExplorer({
  initialFolderId = DEFAULT_ROOT_FOLDER_ID,
  onSelectFile,
}: DriveVaultExplorerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string>(initialFolderId);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: initialFolderId, name: 'Automation and robotics (B2 Shared)' },
  ]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<VaultItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadFolder = async (folderId: string) => {
    setIsLoading(true);
    setError(null);

    const res = await fetchVaultFolderItems(folderId);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
      setItems([]);
    } else {
      setItems(res.items);
    }
  };

  useEffect(() => {
    loadFolder(currentFolderId);
  }, [currentFolderId]);

  const handleFolderClick = (folder: VaultItem) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (crumb: Breadcrumb, index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setCurrentFolderId(crumb.id);
    setSearchQuery('');
  };

  const handleNavigateUp = () => {
    if (breadcrumbs.length > 1) {
      const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
      setBreadcrumbs((prev) => prev.slice(0, prev.length - 1));
      setCurrentFolderId(parentCrumb.id);
      setSearchQuery('');
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getFileIcon = (mimeType: string, isFolder: boolean) => {
    if (isFolder) return <Folder className="h-5 w-5 text-amber-400 fill-amber-400/20" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-400" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet'))
      return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    if (mimeType.includes('image')) return <FileImage className="h-5 w-5 text-purple-400" />;
    if (mimeType.includes('code') || mimeType.includes('text') || mimeType.includes('c'))
      return <FileCode className="h-5 w-5 text-cyan-400" />;
    return <File className="h-5 w-5 text-blue-400" />;
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const foldersList = filteredItems.filter((i) => i.isFolder);
  const filesList = filteredItems.filter((i) => !i.isFolder);

  return (
    <div className="space-y-4">
      {/* Header Navigation & Breadcrumb Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-sm">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
          {breadcrumbs.length > 1 && (
            <button
              onClick={handleNavigateUp}
              className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 mr-1 transition-colors"
              title="Go back up one level"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id + idx}>
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />}
                <button
                  onClick={() => handleBreadcrumbClick(crumb, idx)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    isLast
                      ? 'bg-blue-950/80 text-blue-300 font-bold border border-blue-800/60 shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {idx === 0 && <FolderOpen className="h-3.5 w-3.5 text-blue-400" />}
                  <span>{crumb.name}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadFolder(currentFolderId)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Refresh folder"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <a
            href={`https://drive.google.com/drive/folders/${currentFolderId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open in Drive</span>
          </a>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3.5 top-3 text-zinc-500" />
        <input
          type="text"
          placeholder="Search files and folders in this directory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 shadow-inner"
        />
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-16 text-center rounded-2xl border border-zinc-800/80 bg-zinc-900/40 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
          <p className="text-xs text-zinc-400 font-mono">Reading Google Drive folder structure...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-xs">
          <AlertCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-white mb-1">
            Google Drive Connection Issue
          </h4>
          <p className="text-zinc-400 max-w-md mx-auto mb-4 leading-relaxed">
            {error}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFolder(currentFolderId)}
              className="text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
            <a
              href={`https://drive.google.com/drive/folders/${currentFolderId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-all"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Folder in Drive
            </a>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 text-xs text-zinc-500">
          <Folder className="h-8 w-8 mx-auto mb-2 opacity-40 text-zinc-400" />
          <p className="font-semibold text-zinc-300">This folder is empty</p>
          <p className="mt-0.5">No files or subfolders found inside.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Subfolders Grid */}
          {foldersList.length > 0 && (
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-amber-400" />
                <span>Folders ({foldersList.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {foldersList.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => handleFolderClick(folder)}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-blue-500/60 transition-all cursor-pointer group flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center shrink-0">
                        <Folder className="h-5 w-5 text-amber-400 fill-amber-400/20" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                          {folder.name}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-mono">Folder</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-blue-400 shrink-0 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files List */}
          {filesList.length > 0 && (
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                <span>Files & Documents ({filesList.length})</span>
              </h3>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/80 overflow-hidden">
                {filesList.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-zinc-900 transition-colors group"
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => {
                        if (onSelectFile) onSelectFile(file);
                        else setPreviewFile(file);
                      }}
                    >
                      <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        {getFileIcon(file.mimeType, false)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                          <span>{file.size}</span>
                          {file.modifiedTime && (
                            <>
                              <span>•</span>
                              <span>Modified {file.modifiedTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewFile(file)}
                        className="h-7 px-2.5 text-[11px] border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-medium"
                      >
                        <Eye className="h-3 w-3 mr-1 text-blue-400" />
                        Preview
                      </Button>

                      {file.downloadUrl && (
                        <a
                          href={file.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-App PDF Preview Modal */}
      {previewFile && (
        <Modal
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          title={previewFile.name}
          description={`Size: ${previewFile.size} • Modified: ${previewFile.modifiedTime || 'Recently'}`}
          maxWidth="2xl"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-2 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
              <span className="text-zinc-400 font-mono truncate max-w-sm">
                {previewFile.url}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopyLink(previewFile.url)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] transition-colors"
                >
                  {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Share2 className="h-3 w-3" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open in Drive</span>
                </a>
              </div>
            </div>

            {/* Embedded Preview */}
            <div className="w-full h-[520px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 flex items-center justify-center">
              {previewFile.previewUrl ? (
                <iframe
                  src={previewFile.previewUrl}
                  title={previewFile.name}
                  className="w-full h-full border-0"
                  allow="autoplay"
                  loading="lazy"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-10 w-10 text-blue-400 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-white mb-1">Direct Document Link</h4>
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white mt-3"
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
    </div>
  );
}

