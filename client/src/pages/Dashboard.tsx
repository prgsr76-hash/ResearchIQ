import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  Sparkles,
  BookOpen,
  Upload,
  GitCompare,
  PenTool,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { papersApi } from '@/services/api';
import type { Paper } from '@/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    papersApi
      .list()
      .then((res) => setPapers(res.data.papers || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      icon: FileText,
      label: 'Total Papers',
      value: papers.length,
      color: 'from-primary to-accent',
    },
    {
      icon: MessageSquare,
      label: 'Chat Sessions',
      value: 0,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Sparkles,
      label: 'Summaries',
      value: papers.filter((p) => p.summary).length,
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: BookOpen,
      label: 'Reviews',
      value: 0,
      color: 'from-rose-500 to-pink-500',
    },
  ];

  const quickActions = [
    {
      icon: Upload,
      title: 'Upload Paper',
      description: 'Add a new research paper to your library',
      to: '/library',
      color: 'from-primary to-accent',
    },
    {
      icon: MessageSquare,
      title: 'Start Chat',
      description: 'Ask questions about your research papers',
      to: '/chat',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: GitCompare,
      title: 'Compare Papers',
      description: 'Side-by-side AI comparison of papers',
      to: '/compare',
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: PenTool,
      title: 'Generate Review',
      description: 'Create an AI-powered literature review',
      to: '/review',
      color: 'from-rose-500 to-pink-500',
    },
  ];

  const recentPapers = papers.slice(0, 5);

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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-text mb-1">
          Welcome back,{' '}
          <span className="gradient-text">{user?.name || 'Researcher'}</span>
        </h1>
        <p className="text-text-muted">
          Here&apos;s an overview of your research workspace.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card>
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text">{stat.value}</p>
                  <p className="text-text-dim text-sm">{stat.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Papers */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">Recent Papers</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/library')}>
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-surface-alt animate-shimmer"
                />
              ))}
            </div>
          ) : recentPapers.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-text-dim mx-auto mb-3" />
                <p className="text-text-muted text-sm">
                  No papers yet. Upload your first paper to get started.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/library')}
                >
                  Upload Paper
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentPapers.map((paper) => (
                <Card
                  key={paper.id}
                  variant="interactive"
                  onClick={() => navigate(`/papers/${paper.id}`)}
                  padding={false}
                >
                  <div className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-text truncate">
                        {paper.title}
                      </h3>
                      <p className="text-xs text-text-dim mt-0.5 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(paper.createdAt).toLocaleDateString()}
                        {paper.authors?.length > 0 && (
                          <span>• {paper.authors.slice(0, 2).join(', ')}</span>
                        )}
                      </p>
                    </div>
                    {statusBadge(paper.status)}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-text mb-4">
            Quick Actions
          </h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {quickActions.map((action) => (
              <motion.div key={action.title} variants={itemVariants}>
                <Card
                  variant="interactive"
                  onClick={() => navigate(action.to)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-text">
                        {action.title}
                      </h3>
                      <p className="text-xs text-text-dim">{action.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
