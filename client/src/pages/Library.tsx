import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Search,
  Grid3X3,
  List,
  FileText,
  Trash2,
  Calendar,
  FileUp,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { papersApi } from '@/services/api';
import type { Paper } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';

export default function Library() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Paper | null>(null);

  // Upload state
  interface QueuedFile {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
  }
  const [uploadQueue, setUploadQueue] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchPapers = useCallback(async () => {
    try {
      const res = await papersApi.list();
      const rawPapers = res.data.papers || res.data || [];
      // Normalize: ensure every paper has an `id` and sensible defaults
      const normalized = rawPapers.map((p: any) => ({
        ...p,
        id: p.id || p._id,
        title: p.title || p.originalName || 'Untitled Paper',
        authors: p.authors || [],
        keywords: p.keywords || [],
        abstract: p.abstract || '',
        year: p.year || 0,
        pageCount: p.pageCount || 0,
        status: p.status || 'processing',
      }));
      setPapers(normalized);
    } catch {
      toast.error('Failed to load papers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const addFilesToQueue = (files: File[]) => {
    const pdfFiles = files.filter((file) => file.type === 'application/pdf');
    if (pdfFiles.length < files.length) {
      toast.error('Only PDF files are supported');
    }

    const newItems = pdfFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const handleUpload = async () => {
    const pendingFiles = uploadQueue.filter(
      (f) => f.status === 'pending' || f.status === 'error'
    );
    if (pendingFiles.length === 0) return;

    setUploading(true);

    const uploadPromises = pendingFiles.map(async (queuedFile) => {
      setUploadQueue((prev) =>
        prev.map((f) =>
          f.id === queuedFile.id ? { ...f, status: 'uploading', progress: 0 } : f
        )
      );

      try {
        await papersApi.upload(queuedFile.file, (progress) => {
          setUploadQueue((prev) =>
            prev.map((f) => (f.id === queuedFile.id ? { ...f, progress } : f))
          );
        });

        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id
              ? { ...f, status: 'success', progress: 100 }
              : f
          )
        );
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Upload failed';
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id ? { ...f, status: 'error', error: errMsg } : f
          )
        );
        throw err;
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (succeeded > 0) {
      toast.success(`Successfully uploaded ${succeeded} paper(s)`);
      fetchPapers();
      if (failed === 0) {
        setShowUpload(false);
        setUploadQueue([]);
      }
    }
    if (failed > 0) {
      toast.error(`Failed to upload ${failed} paper(s)`);
    }

    setUploading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const targetId = deleteTarget.id || (deleteTarget as any)._id;
      await papersApi.delete(targetId);
      toast.success('Paper deleted');
      setPapers((prev) => prev.filter((p) => (p.id || (p as any)._id) !== targetId));
      setDeleteTarget(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  };

  const filteredPapers = papers.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.originalName || '').toLowerCase().includes(q) ||
      (p.abstract || '').toLowerCase().includes(q) ||
      p.authors?.some((a) => (a || '').toLowerCase().includes(q)) ||
      p.keywords?.some((k) => (k || '').toLowerCase().includes(q))
    );
  });

  const statusBadge = (status: Paper['status']) => {
    const map: Record<Paper['status'], { variant: 'success' | 'warning' | 'error' | 'info'; label: string }> = {
      ready: { variant: 'success', label: 'Ready' },
      processing: { variant: 'warning', label: 'Processing' },
      uploading: { variant: 'info', label: 'Uploading' },
      error: { variant: 'error', label: 'Error' },
    };
    const s = map[status];
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Research Library</h1>
          <p className="text-text-muted text-sm mt-1">
            {papers.length} paper{papers.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <Button icon={<Upload className="w-4 h-4" />} onClick={() => setShowUpload(true)}>
          Upload Paper
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search papers by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-1 p-1 bg-surface-alt border border-border rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-primary/15 text-primary-light'
                : 'text-text-dim hover:text-text'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-primary/15 text-primary-light'
                : 'text-text-dim hover:text-text'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filteredPapers.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-10 h-10 text-text-dim" />}
          title={search ? 'No matching papers' : 'Your library is empty'}
          description={
            search
              ? 'Try a different search term'
              : 'Upload your first research paper to get started.'
          }
          action={
            !search ? (
              <Button onClick={() => setShowUpload(true)} icon={<Upload className="w-4 h-4" />}>
                Upload Paper
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'grid' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          <AnimatePresence>
            {filteredPapers.map((paper, i) => (
              <motion.div
                key={paper.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card variant="interactive" onClick={() => navigate(`/papers/${paper.id}`)} className="group relative">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary-light" />
                    </div>
                    {statusBadge(paper.status)}
                  </div>
                  <h3 className="text-sm font-semibold text-text mb-1 line-clamp-2 leading-snug">
                    {paper.title}
                  </h3>
                  <p className="text-xs text-text-dim mb-3 truncate">
                    {paper.authors?.join(', ') || 'Unknown authors'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-text-dim">
                    {paper.year > 0 && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {paper.year}
                      </span>
                    )}
                    {paper.pageCount > 0 && <span>{paper.pageCount} pages</span>}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(paper);
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-text-dim hover:text-error hover:bg-error/10 transition-colors opacity-100 cursor-pointer z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filteredPapers.map((paper, i) => (
            <motion.div
              key={paper.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                variant="interactive"
                onClick={() => navigate(`/papers/${paper.id}`)}
                padding={false}
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-text truncate">
                      {paper.title}
                    </h3>
                    <p className="text-xs text-text-dim truncate">
                      {paper.authors?.join(', ') || 'Unknown'}{' '}
                      {paper.year > 0 && `• ${paper.year}`}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    {paper.pageCount > 0 && (
                      <span className="text-xs text-text-dim">
                        {paper.pageCount}p
                      </span>
                    )}
                    {statusBadge(paper.status)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(paper);
                    }}
                    className="p-1.5 rounded-lg text-text-dim hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUpload}
        onClose={() => {
          if (!uploading) {
            setShowUpload(false);
            setUploadQueue([]);
          }
        }}
        title="Upload Research Paper"
        maxWidth="max-w-xl"
      >
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
            ${dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-border-light'
            }
          `}
        >
          <FileUp className="w-12 h-12 text-text-dim mx-auto mb-4" />
          <p className="text-text font-medium mb-1">
            Drag & drop your PDF here
          </p>
          <p className="text-text-dim text-sm mb-4">or click to browse</p>
          <input
            type="file"
            accept=".pdf"
            id="file-upload"
            className="hidden"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              addFilesToQueue(files);
            }}
          />
          <label htmlFor="file-upload">
            <Button variant="secondary" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
              Browse Files
            </Button>
          </label>
        </div>

        {/* Selected files list */}
        {uploadQueue.length > 0 && (
          <div className="mt-4 max-h-60 overflow-y-auto space-y-3 pr-1">
            {uploadQueue.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-surface border border-border"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text truncate">
                        {item.file.name}
                      </p>
                      <div className="text-xs text-text-muted flex items-center gap-2">
                        <span>{formatSize(item.file.size)}</span>
                        {item.status === 'success' && (
                          <span className="text-success flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Uploaded
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-error flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {item.error || 'Failed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {item.status === 'pending' && !uploading && (
                    <button
                      onClick={() => setUploadQueue((prev) => prev.filter((f) => f.id !== item.id))}
                      className="p-1 rounded text-text-dim hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {item.status === 'uploading' && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-text-dim">Uploading...</p>
                      <p className="text-xs font-mono text-text-dim">{item.progress}%</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setShowUpload(false);
              setUploadQueue([]);
            }}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            loading={uploading}
            disabled={uploadQueue.filter((f) => f.status === 'pending' || f.status === 'error').length === 0}
            icon={
              uploading ? undefined : <Upload className="w-4 h-4" />
            }
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Paper"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-error" />
          </div>
          <div>
            <p className="text-text text-sm">
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.title}</strong>? This action cannot be
              undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
