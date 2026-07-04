import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  Sparkles,
  Library,
  MessageSquare,
  FileText,
  GitCompare,
  Search,
  Zap,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import Button from '@/components/ui/Button';

const features = [
  {
    icon: Library,
    title: 'Smart Library',
    description:
      'Upload, organize, and manage your research papers with intelligent metadata extraction and full-text indexing.',
  },
  {
    icon: MessageSquare,
    title: 'RAG-Powered Chat',
    description:
      'Ask questions about your papers and get AI-generated answers grounded in your actual research with source citations.',
  },
  {
    icon: FileText,
    title: 'Auto Summarization',
    description:
      'Generate structured summaries covering methodology, results, limitations, and future work in seconds.',
  },
  {
    icon: GitCompare,
    title: 'Paper Comparison',
    description:
      'Compare multiple papers side-by-side with AI-generated comparative analysis across key dimensions.',
  },
  {
    icon: Search,
    title: 'Literature Review',
    description:
      'Automatically generate comprehensive literature reviews on any topic from your paper collection.',
  },
  {
    icon: Zap,
    title: 'Gap Detection',
    description:
      'Identify research gaps, underexplored areas, and promising future directions across your corpus.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-[120px] animate-blob" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-accent/20 blur-[120px] animate-blob [animation-delay:2s]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-primary-light/15 blur-[120px] animate-blob [animation-delay:4s]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-border/50 bg-surface/40 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-text">Research</span>
          <span className="text-xl font-bold gradient-text">IQ</span>
          <Sparkles className="w-3.5 h-3.5 text-accent-light" />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Sign In
          </Button>
          <Button onClick={() => navigate('/register')}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto"
        >
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            AI-Powered Research Intelligence
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-text">Unlock</span>{' '}
            <span className="gradient-text">Research</span>
            <br />
            <span className="text-text">Intelligence</span>
          </h1>

          <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your papers, chat with AI about your research, generate
            summaries, compare studies, and discover gaps — all powered by
            cutting-edge RAG technology.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              icon={<ChevronRight className="w-5 h-5" />}
            >
              Learn More
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-20 flex flex-wrap justify-center gap-8 md:gap-16"
        >
          {[
            { value: '10K+', label: 'Papers Analyzed' },
            { value: '50K+', label: 'Queries Answered' },
            { value: '99%', label: 'Accuracy Rate' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold gradient-text">
                {stat.value}
              </p>
              <p className="text-text-dim text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 md:px-12 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            Everything You Need for{' '}
            <span className="gradient-text">Research Excellence</span>
          </h2>
          <p className="text-text-muted max-w-xl mx-auto">
            A comprehensive suite of AI-powered tools designed to accelerate
            your research workflow.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group p-6 rounded-2xl bg-surface-alt/60 backdrop-blur-xl border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
                <feature.icon className="w-6 h-6 text-primary-light" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-2">
                {feature.title}
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 md:px-12 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
            Ready to Transform Your Research?
          </h2>
          <p className="text-text-muted mb-8 max-w-lg mx-auto">
            Join researchers who are already using ResearchIQ to accelerate
            discoveries and streamline their workflow.
          </p>
          <Button size="lg" onClick={() => navigate('/register')}>
            Start for Free
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-text">ResearchIQ</span>
        </div>
        <p className="text-text-dim text-xs">
          &copy; {new Date().getFullYear()} ResearchIQ. Built with AI for researchers.
        </p>
      </footer>
    </div>
  );
}
