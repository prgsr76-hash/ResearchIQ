import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Sparkles,
  Loader2,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { reviewApi } from '../services/api';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

interface ReviewResult {
  introduction?: string;
  existingResearch?: string;
  comparativeAnalysis?: string;
  researchGaps?: string;
  conclusion?: string;
  papersCited?: string[];
  review?: string; // Fallback for unstructured response
}

export default function LitReview() {
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [copied, setCopied] = useState(false);

  const generateReview = async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      toast.error('Please enter a research topic');
      return;
    }

    try {
      setGenerating(true);
      setResult(null);
      const res = await reviewApi.generate(trimmedTopic);
      setResult(res.data.review || res.data);
    } catch {
      toast.error('Failed to generate literature review');
    } finally {
      setGenerating(false);
    }
  };

  const getFullText = () => {
    if (!result) return '';
    if (result.review) return result.review;
    return [
      result.introduction && `## Introduction\n\n${result.introduction}`,
      result.existingResearch && `## Existing Research\n\n${result.existingResearch}`,
      result.comparativeAnalysis && `## Comparative Analysis\n\n${result.comparativeAnalysis}`,
      result.researchGaps && `## Research Gaps\n\n${result.researchGaps}`,
      result.conclusion && `## Conclusion\n\n${result.conclusion}`,
    ]
      .filter(Boolean)
      .join('\n\n');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getFullText());
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const sections = [
    {
      key: 'introduction',
      title: 'Introduction',
      content: result?.introduction,
      gradient: 'from-blue-500/10 to-cyan-500/10',
      border: 'border-blue-500/20',
    },
    {
      key: 'existingResearch',
      title: 'Existing Research',
      content: result?.existingResearch,
      gradient: 'from-violet-500/10 to-purple-500/10',
      border: 'border-violet-500/20',
    },
    {
      key: 'comparativeAnalysis',
      title: 'Comparative Analysis',
      content: result?.comparativeAnalysis,
      gradient: 'from-emerald-500/10 to-green-500/10',
      border: 'border-emerald-500/20',
    },
    {
      key: 'researchGaps',
      title: 'Research Gaps',
      content: result?.researchGaps,
      gradient: 'from-amber-500/10 to-orange-500/10',
      border: 'border-amber-500/20',
    },
    {
      key: 'conclusion',
      title: 'Conclusion',
      content: result?.conclusion,
      gradient: 'from-pink-500/10 to-rose-500/10',
      border: 'border-pink-500/20',
    },
  ];

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
            <BookOpen className="w-5 h-5 text-primary-light" />
          </div>
          Literature Review Generator
        </h1>
        <p className="text-text-muted mt-2">
          Enter a research topic to generate a structured literature review from your uploaded papers.
        </p>
      </div>

      {/* Topic Input */}
      <div className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-6">
        <label className="block text-sm font-medium text-text-muted mb-2">
          Research Topic
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateReview()}
            placeholder="e.g., Machine learning for medical image analysis"
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          <Button
            onClick={generateReview}
            loading={generating}
            disabled={!topic.trim()}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Generate
          </Button>
        </div>

        {/* Topic Suggestions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            'Deep learning in healthcare',
            'Natural language processing',
            'Renewable energy optimization',
            'Computer vision techniques',
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setTopic(suggestion)}
              className="px-3 py-1 text-xs rounded-full bg-surface border border-border text-text-dim hover:text-text-muted hover:border-primary/30 transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {generating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-12"
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-text-muted font-medium">
              Generating literature review...
            </p>
            <p className="text-text-dim text-sm">
              Analyzing papers and synthesizing research
            </p>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {result && !generating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">
              Literature Review: {topic}
            </h2>
            <Button
              onClick={copyToClipboard}
              variant="secondary"
              size="sm"
              icon={
                copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )
              }
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {/* If structured response */}
          {(result.introduction || result.existingResearch) ? (
            sections.map((section, i) =>
              section.content ? (
                <motion.div
                  key={section.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-gradient-to-r ${section.gradient} backdrop-blur-xl border ${section.border} rounded-2xl p-6`}
                >
                  <h3 className="text-base font-semibold text-text mb-3">
                    {section.title}
                  </h3>
                  <div className="prose prose-invert prose-sm max-w-none [&_p]:text-text-muted [&_strong]:text-text [&_ul]:text-text-muted [&_ol]:text-text-muted [&_a]:text-primary-light">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {section.content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ) : null
            )
          ) : (
            /* Fallback: render as single markdown block */
            <div className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-8">
              <div className="prose prose-invert max-w-none [&_p]:text-text-muted [&_h2]:text-text [&_h3]:text-text [&_strong]:text-text [&_ul]:text-text-muted [&_ol]:text-text-muted [&_a]:text-primary-light">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.review || JSON.stringify(result)}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Papers Cited */}
          {result.papersCited && result.papersCited.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-6"
            >
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                Papers Cited ({result.papersCited.length})
              </h3>
              <ul className="space-y-2">
                {result.papersCited.map((paper, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-muted"
                  >
                    <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {paper}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!result && !generating && (
        <EmptyState
          icon={<BookOpen className="w-12 h-12" />}
          title="Generate a Literature Review"
          description="Enter a research topic above to automatically generate a comprehensive literature review based on your uploaded papers."
        />
      )}
    </motion.div>
  );
}
