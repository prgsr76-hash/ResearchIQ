import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { gapApi } from '../services/api';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

interface GapResult {
  coveredTopics?: { topic: string; count: number }[] | string[];
  methodologiesUsed?: { name: string; count: number }[] | string[];
  missingAreas?: string[];
  suggestedDirections?: string[];
  analysis?: string;
}

const CHART_COLORS = [
  '#6366F1', '#8B5CF6', '#A78BFA', '#818CF8',
  '#10B981', '#F59E0B', '#EF4444', '#EC4899',
  '#06B6D4', '#84CC16',
];

export default function GapDetection() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<GapResult | null>(null);

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setResult(null);
      const res = await gapApi.analyze();
      setResult(res.data.analysis || res.data);
    } catch {
      toast.error('Failed to analyze research gaps');
    } finally {
      setAnalyzing(false);
    }
  };

  // Normalize covered topics for display
  const coveredTopics = result?.coveredTopics?.map((t) =>
    typeof t === 'string' ? { topic: t, count: 1 } : t
  ) || [];

  // Normalize methodologies for chart
  const methodologies = result?.methodologiesUsed?.map((m) =>
    typeof m === 'string' ? { name: m, count: 1 } : m
  ) || [];

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
            <Search className="w-5 h-5 text-primary-light" />
          </div>
          Research Gap Detection
        </h1>
        <p className="text-text-muted mt-2">
          Analyze your paper library to identify covered topics, methodologies used, and underexplored research areas.
        </p>
      </div>

      {/* Action Card */}
      <div className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-text font-medium">Library Analysis</h2>
            <p className="text-text-dim text-sm mt-1">
              Analyze all papers in your library to detect research gaps
            </p>
          </div>
          <Button
            onClick={runAnalysis}
            loading={analyzing}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {result ? 'Re-analyze' : 'Analyze All Papers'}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {analyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-12"
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-text-muted font-medium">
              Analyzing research landscape...
            </p>
            <p className="text-text-dim text-sm">
              Reviewing papers, extracting topics and methodologies
            </p>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {result && !analyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Covered Topics */}
          {coveredTopics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-6"
            >
              <h2 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-success" />
                Covered Topics
              </h2>
              <div className="flex flex-wrap gap-2">
                {coveredTopics.map((topic, i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/10 border border-success/20 rounded-full text-sm text-success"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {topic.topic}
                    {topic.count > 1 && (
                      <span className="bg-success/20 px-1.5 py-0.5 rounded-full text-xs ml-1">
                        {topic.count}
                      </span>
                    )}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Methodologies Chart */}
          {methodologies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-6"
            >
              <h2 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary-light" />
                Methodologies Used
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={methodologies}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      axisLine={{ stroke: '#334155' }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {methodologies.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* Missing Areas */}
          {result.missingAreas && result.missingAreas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-surface-alt/80 backdrop-blur-xl border border-error/20 rounded-2xl p-6"
            >
              <h2 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
                <XCircle className="w-5 h-5 text-error" />
                Missing / Underexplored Areas
              </h2>
              <div className="space-y-2">
                {result.missingAreas.map((area, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-start gap-3 px-4 py-3 bg-error/5 border border-error/10 rounded-xl"
                  >
                    <XCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                    <span className="text-text-muted text-sm">{area}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Suggested Directions */}
          {result.suggestedDirections && result.suggestedDirections.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-surface-alt/80 backdrop-blur-xl border border-accent/20 rounded-2xl p-6"
            >
              <h2 className="text-base font-semibold text-text flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-accent" />
                Suggested Research Directions
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {result.suggestedDirections.map((direction, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex items-start gap-3 p-4 bg-gradient-to-r from-accent/5 to-primary/5 border border-accent/10 rounded-xl hover:border-accent/25 transition-colors"
                  >
                    <TrendingUp className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-text-muted text-sm">{direction}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Fallback: raw analysis text */}
          {result.analysis && !result.coveredTopics && (
            <div className="bg-surface-alt/80 backdrop-blur-xl border border-glass-border rounded-2xl p-6">
              <p className="text-text-muted whitespace-pre-wrap leading-relaxed">
                {result.analysis}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!result && !analyzing && (
        <EmptyState
          icon={<Search className="w-12 h-12" />}
          title="Detect Research Gaps"
          description="Click 'Analyze All Papers' to scan your library and identify covered topics, methodologies used, and underexplored research areas."
        />
      )}
    </motion.div>
  );
}
