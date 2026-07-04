import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Users,
  FileText,
  Hash,
  Tag,
  HardDrive,
  Sparkles,
  MessageSquare,
  GitCompare,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Paper, PaperSummary } from '../types';
import { paperApi } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function PaperView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<PaperSummary | null>(null);

  useEffect(() => {
    if (id) fetchPaper();
  }, [id]);

  const fetchPaper = async () => {
    try {
      setLoading(true);
      const res = await paperApi.getById(id!);
      setPaper(res.data.paper || res.data);
      if (res.data.paper?.summary || res.data.summary) {
        setSummary(res.data.paper?.summary || res.data.summary);
      }
    } catch {
      toast.error('Failed to load paper');
      navigate('/library');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await paperApi.getSummary(id!);
      setSummary(res.data.summary || res.data);
      toast.success('Summary generated!');
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!paper) return null;

  const statusVariant = paper.status === 'ready'
    ? 'success'
    : paper.status === 'processing'
    ? 'warning'
    : paper.status === 'error'
    ? 'error'
    : 'default';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Back button */}
      <button
        onClick={() => navigate('/library')}
        className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </button>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-8"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-semibold text-text leading-tight">
            {paper.title || paper.originalName}
          </h1>
          <Badge variant={statusVariant}>
            {paper.status}
          </Badge>
        </div>

        {paper.authors && paper.authors.length > 0 && (
          <div className="flex items-center gap-2 text-text-muted mb-3">
            <Users className="w-4 h-4 shrink-0" />
            <span>{paper.authors.join(', ')}</span>
          </div>
        )}

        {paper.year && (
          <div className="flex items-center gap-2 text-text-muted mb-3">
            <Calendar className="w-4 h-4" />
            <span>{paper.year}</span>
          </div>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-surface/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-text-dim text-sm mb-1">
              <FileText className="w-3.5 h-3.5" />
              Pages
            </div>
            <p className="text-text font-semibold text-lg">{paper.pageCount || '—'}</p>
          </div>
          <div className="bg-surface/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-text-dim text-sm mb-1">
              <HardDrive className="w-3.5 h-3.5" />
              File Size
            </div>
            <p className="text-text font-semibold text-lg">
              {paper.fileSize ? formatFileSize(paper.fileSize) : '—'}
            </p>
          </div>
          <div className="bg-surface/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-text-dim text-sm mb-1">
              <Calendar className="w-3.5 h-3.5" />
              Uploaded
            </div>
            <p className="text-text font-semibold text-lg">
              {paper.createdAt ? formatDate(paper.createdAt) : '—'}
            </p>
          </div>
          <div className="bg-surface/60 rounded-xl p-4">
            <div className="flex items-center gap-2 text-text-dim text-sm mb-1">
              <Hash className="w-3.5 h-3.5" />
              Status
            </div>
            <p className="text-text font-semibold text-lg capitalize">{paper.status}</p>
          </div>
        </div>

        {/* Keywords */}
        {paper.keywords && paper.keywords.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 text-text-dim text-sm mb-2">
              <Tag className="w-3.5 h-3.5" />
              Keywords
            </div>
            <div className="flex flex-wrap gap-2">
              {paper.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-primary/10 text-primary-light rounded-full text-sm"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
          <Button
            onClick={() => navigate(`/chat?paperId=${id}`)}
            variant="secondary"
            icon={<MessageSquare className="w-4 h-4" />}
          >
            Chat About This Paper
          </Button>
          <Button
            onClick={() => navigate(`/compare?papers=${id}`)}
            variant="secondary"
            icon={<GitCompare className="w-4 h-4" />}
          >
            Compare With Another
          </Button>
        </div>
      </motion.div>

      {/* Abstract */}
      {paper.abstract && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-8"
        >
          <h2 className="text-lg font-semibold text-text mb-4">Abstract</h2>
          <p className="text-text-muted leading-relaxed">{paper.abstract}</p>
        </motion.div>
      )}

      {/* Summary Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            AI Summary
          </h2>
          <Button
            onClick={generateSummary}
            loading={summaryLoading}
            variant={summary ? 'secondary' : 'primary'}
            size="sm"
            icon={summary ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          >
            {summary ? 'Regenerate' : 'Generate Summary'}
          </Button>
        </div>

        {summaryLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-text-muted">Analyzing paper with AI...</p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {[
              { title: 'Problem Statement', content: summary.problemStatement, color: 'from-blue-500/20 to-indigo-500/20' },
              { title: 'Methodology', content: summary.methodology, color: 'from-violet-500/20 to-purple-500/20' },
              { title: 'Key Results', content: summary.results, color: 'from-emerald-500/20 to-green-500/20' },
              { title: 'Limitations', content: summary.limitations, color: 'from-amber-500/20 to-orange-500/20' },
              { title: 'Future Work', content: summary.futureWork, color: 'from-pink-500/20 to-rose-500/20' },
            ].map((section, i) =>
              section.content ? (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-gradient-to-r ${section.color} rounded-xl p-5 border border-glass-border`}
                >
                  <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <p className="text-text leading-relaxed">{section.content}</p>
                </motion.div>
              ) : null
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-text-dim mx-auto mb-3" />
            <p className="text-text-muted">
              Click "Generate Summary" to create an AI-powered structured summary of this paper.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
