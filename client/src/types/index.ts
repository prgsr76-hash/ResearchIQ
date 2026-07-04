// ========== User & Auth ==========
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// ========== Paper ==========
export interface Paper {
  id: string;
  userId: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  keywords: string[];
  filename: string;
  originalName: string;
  fileSize: number;
  pageCount: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  processingProgress: number;
  summary: PaperSummary | null;
  createdAt: string;
}

export interface PaperSummary {
  problemStatement: string;
  methodology: string;
  results: string;
  limitations: string;
  futureWork: string;
}

// ========== Chat ==========
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: string;
}

export interface ChatSession {
  id: string;
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  paperId: string;
  paperTitle: string;
  chunkText: string;
  score: number;
}

// ========== Comparison ==========
export interface ComparisonResult {
  papers: Paper[];
  comparison: string;
}

// ========== Literature Review ==========
export interface LitReview {
  id: string;
  topic: string;
  introduction: string;
  existingResearch: string;
  comparativeAnalysis: string;
  researchGaps: string;
  conclusion: string;
  papersCited: string[];
  createdAt: string;
}

// ========== Gap Analysis ==========
export interface GapAnalysis {
  coveredTopics: { topic: string; count: number }[];
  methodologiesUsed: { name: string; count: number }[];
  missingAreas: string[];
  suggestedDirections: { title: string; description: string }[];
}
