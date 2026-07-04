import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Plus,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Bot,
  User,
  Loader2,
  FileText,
  X,
} from 'lucide-react';
import { ChatSession, ChatMessage, Source } from '../types';
import { chatApi } from '../services/api';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

function SourceCitation({ source }: { source: Source }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-dim shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-text-dim shrink-0" />
        )}
        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-primary-light truncate font-medium">
          {source.paperTitle || 'Source Document'}
        </span>
        <span className="text-text-dim ml-auto text-xs shrink-0">
          {(source.score * 100).toFixed(0)}% match
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-3 py-2 text-sm text-text-muted bg-surface/40 border-t border-border/30 leading-relaxed">
              {source.chunkText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-gradient-to-br from-primary to-accent'
            : 'bg-surface-alt border border-border'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-primary-light" />
        )}
      </div>

      {/* Content */}
      <div
        className={`max-w-[75%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-br from-primary to-primary-hover text-white rounded-tr-sm'
              : 'bg-surface-alt border border-glass-border text-text rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&_p]:leading-relaxed [&_code]:bg-surface/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-primary-light [&_code]:font-mono [&_pre]:bg-surface/50 [&_pre]:border [&_pre]:border-border/50 [&_pre]:rounded-lg [&_ul]:text-text-muted [&_ol]:text-text-muted [&_li]:marker:text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-text-dim px-1">
              Sources ({message.sources.length})
            </p>
            {message.sources.map((source, i) => (
              <SourceCitation key={i} source={source} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-xs text-text-dim px-1 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp
            ? new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''}
        </p>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-surface-alt border border-border flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary-light" />
      </div>
      <div className="bg-surface-alt border border-glass-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary-light rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await chatApi.listSessions();
      const data = res.data.sessions || res.data || [];
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        loadSession(data[0].sessionId || data[0].id);
      }
    } catch {
      toast.error('Failed to load chat sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setActiveSessionId(sessionId);
      const res = await chatApi.getSession(sessionId);
      const session = res.data.session || res.data;
      setMessages(session.messages || []);
    } catch {
      toast.error('Failed to load chat');
    }
  };

  const createNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await chatApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => (s.sessionId || s.id) !== sessionId));
      if (activeSessionId === sessionId) {
        createNewChat();
      }
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  const sendMessage = async () => {
    const query = input.trim();
    if (!query || sending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: query,
      sources: [],
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const paperId = searchParams.get('paperId');
      const res = await chatApi.query(query, activeSessionId || undefined, paperId || undefined);
      const data = res.data;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer || data.response || data.content || '',
        sources: data.sources || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update session ID for new chats
      if (!activeSessionId && data.sessionId) {
        setActiveSessionId(data.sessionId);
        fetchSessions(); // Refresh session list
      }
    } catch {
      toast.error('Failed to get response');
      // Remove the optimistic user message on error
      setMessages((prev) => prev.slice(0, -1));
      setInput(query);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] -m-6 overflow-hidden">
      {/* Session Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-border bg-surface/50 flex flex-col overflow-hidden shrink-0"
          >
            <div className="p-4 border-b border-border">
              <button
                onClick={createNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-medium hover:shadow-lg hover:shadow-primary/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingSessions ? (
                <div className="flex justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-center text-text-dim text-sm py-8">
                  No chats yet
                </p>
              ) : (
                sessions.map((session) => {
                  const sid = session.sessionId || session.id;
                  return (
                    <div
                      key={sid}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        activeSessionId === sid
                          ? 'bg-primary/10 text-text'
                          : 'text-text-muted hover:bg-surface-hover'
                      }`}
                      onClick={() => loadSession(sid)}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="truncate text-sm flex-1">
                        {session.title || 'New Chat'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(sid);
                        }}
                        className="p-1 text-text-dim hover:text-error transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-surface/30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <h2 className="font-medium text-text">
            {activeSessionId ? 'Research Chat' : 'New Chat'}
          </h2>
          {searchParams.get('paperId') && (
            <Badge variant="info" className="ml-auto">
              Focused on paper
            </Badge>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.length === 0 && !sending ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-primary-light" />
                </div>
                <h3 className="text-xl font-semibold text-text mb-2">
                  Research Assistant
                </h3>
                <p className="text-text-muted mb-6">
                  Ask questions about your uploaded papers. I'll find relevant information and provide source-backed answers.
                </p>
                <div className="grid gap-2">
                  {[
                    'What methodologies are discussed across my papers?',
                    'Summarize the key findings related to machine learning',
                    'Which papers discuss limitations of current approaches?',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="text-left text-sm px-4 py-2.5 rounded-xl bg-surface-alt/50 border border-border/50 text-text-muted hover:text-text hover:border-primary/30 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {sending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-border bg-surface/30">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your research papers..."
                rows={1}
                className="w-full bg-surface-alt border border-border rounded-xl px-4 py-3 pr-12 text-text placeholder:text-text-dim resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all max-h-32"
                style={{ minHeight: '48px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />
              {input && (
                <button
                  onClick={() => setInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-dim hover:text-text-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="p-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/25 transition-all shrink-0"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import Badge locally since it might not export variant "info" — handle gracefully
function Badge({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: string; className?: string }) {
  const colors: Record<string, string> = {
    default: 'bg-surface-alt text-text-muted',
    info: 'bg-primary/10 text-primary-light',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[variant] || colors.default} ${className}`}>
      {children}
    </span>
  );
}
