import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  GitCompare,
  Plus,
  X,
  Loader2,
  FileText,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Paper } from '../types';
import { paperApi, compareApi } from '../services/api';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function Compare() {
  const [searchParams] = useSearchParams();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchPapers();
    const preSelected = searchParams.get('papers');
    if (preSelected) {
      setSelectedIds(preSelected.split(','));
    }
  }, []);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const res = await paperApi.list();
      const data = res.data.papers || res.data || [];
      setPapers(data.filter((p: Paper) => p.status === 'ready'));
    } catch {
      toast.error('Failed to load papers');
    } finally {
      setLoading(false);
    }
  };

  const togglePaper = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((pid) => pid !== id);
      if (prev.length >= 5) {
        toast.error('Maximum 5 papers for comparison');
        return prev;
      }
      return [...prev, id];
    });
  };

  const removePaper = (id: string) => {
    setSelectedIds((prev) => prev.filter((pid) => pid !== id));
  };

  const runComparison = async () => {
    if (selectedIds.length < 2) {
      toast.error('Select at least 2 papers to compare');
      return;
    }
    try {
      setComparing(true);
      setResult(null);
      const res = await compareApi.compare(selectedIds);
      
      const data = res.data.comparison || res.data;
      if (typeof data === 'string') {
        setResult(data);
      } else if (data && typeof data === 'object') {
        // Format the structured JSON into Markdown
        let md = '';
        if (data.comparison) {
          md += `### Objectives\n${data.comparison.objectives}\n\n`;
          md += `### Methodology\n${data.comparison.methodology}\n\n`;
          md += `### Datasets\n${data.comparison.datasets}\n\n`;
          md += `### Results\n${data.comparison.results}\n\n`;
          md += `### Limitations\n${data.comparison.limitations}\n\n`;
        }
        if (data.overallAnalysis) {
          md += `### Overall Analysis\n${data.overallAnalysis}\n\n`;
        }
        setResult(md || JSON.stringify(data, null, 2));
      } else {
        setResult('No comparison data returned.');
      }
    } catch {
      toast.error('Failed to compare papers');
    } finally {
      setComparing(false);
    }
  };

  const selectedPapers = papers.filter((p) =>
    selectedIds.includes(p.id || (p as any)._id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
            <GitCompare className="w-5 h-5 text-primary-light" />
          </div>
          Paper Comparison
        </h1>
        <p className="text-text-muted mt-2">
          Select 2-5 papers to compare their objectives, methodology, results, and limitations.
        </p>
      </div>

      {/* Paper Selector */}
      <div className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
          Select Papers
        </h2>

        {/* Selected chips */}
        {selectedPapers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedPapers.map((paper) => (
              <motion.span
                key={paper.id || (paper as any)._id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary-light"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">
                  {paper.title || paper.originalName}
                </span>
                <button
                  onClick={() => removePaper(paper.id || (paper as any)._id)}
                  className="hover:text-error transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.span>
            ))}
          </div>
        )}

        {/* Dropdown picker */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-xl text-text-muted hover:border-primary/30 transition-all"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {selectedIds.length === 0
                ? 'Choose papers to compare...'
                : `${selectedIds.length} paper(s) selected — add more`}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-surface-alt border border-border rounded-xl shadow-2xl z-20 max-h-60 overflow-y-auto"
              >
                {papers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-text-dim">
                    No ready papers found. Upload papers first.
                  </p>
                ) : (
                  papers.map((paper) => {
                    const pid = paper.id || (paper as any)._id;
                    const isSelected = selectedIds.includes(pid);
                    return (
                      <button
                        key={pid}
                        onClick={() => togglePaper(pid)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-border'
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-text text-sm truncate">
                            {paper.title || paper.originalName}
                          </p>
                          {paper.authors && (
                            <p className="text-text-dim text-xs truncate">
                              {paper.authors.join(', ')} {paper.year ? `(${paper.year})` : ''}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Compare button */}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={runComparison}
            loading={comparing}
            disabled={selectedIds.length < 2}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Compare Papers ({selectedIds.length}/5)
          </Button>
        </div>
      </div>

      {/* Results */}
      {comparing && (
        <div className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-text-muted font-medium">
              Analyzing and comparing papers...
            </p>
            <p className="text-text-dim text-sm">This may take a moment</p>
          </div>
        </div>
      )}

      {result && !comparing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-8"
        >
          <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-accent" />
            Comparison Results
          </h2>
          <div className="prose prose-invert prose-sm max-w-none [&_table]:w-full [&_th]:bg-surface/50 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:text-text [&_th]:border [&_th]:border-border [&_td]:px-4 [&_td]:py-2 [&_td]:border [&_td]:border-border [&_td]:text-text-muted [&_h2]:text-text [&_h3]:text-text [&_p]:text-text-muted [&_strong]:text-text [&_ul]:text-text-muted [&_ol]:text-text-muted">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result}
            </ReactMarkdown>
          </div>
        </motion.div>
      )}

      {!result && !comparing && selectedIds.length === 0 && (
        <EmptyState
          icon={<GitCompare className="w-12 h-12" />}
          title="Select Papers to Compare"
          description="Choose 2 to 5 papers from your library to generate a detailed comparison of their objectives, methodology, and results."
        />
      )}
    </motion.div>
  );
}
