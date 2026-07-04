# ResearchIQ — AI-Powered Research Intelligence Platform

A full-stack RAG-based platform for analyzing and querying research papers. Built with React, Express, MongoDB Atlas Vector Search, and Gemini API.

## Features

- 📄 **Research Library** — Upload and organize research papers (PDF)
- 🤖 **RAG Chat** — Ask questions across all uploaded papers with source citations
- 📝 **Paper Summarization** — Generate structured summaries (Problem, Methodology, Results, Limitations, Future Work)
- ⚖️ **Multi-Paper Comparison** — Compare methodologies, datasets, and results across papers
- 📚 **Literature Review Generator** — Auto-generate structured literature reviews from your library
- 🔍 **Research Gap Detection** — Identify underexplored areas and missing methodologies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Tailwind CSS v4 |
| Backend | Node.js + Express 5 + TypeScript |
| Database | MongoDB Atlas |
| Vector Search | MongoDB Atlas Vector Search |
| AI | Gemini API (`gemini-2.0-flash` + `gemini-embedding-001`) |
| PDF Processing | pdf-parse |

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- MongoDB Atlas account (free tier works)
- Google AI Studio API key

### Setup

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Fill in your MongoDB URI, JWT secret, and Gemini API key in `.env`
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start development servers:
   ```bash
   npm run dev
   ```

This starts both the Express API server (port 5000) and the Vite dev server (port 5173).

### MongoDB Atlas Vector Search Index

Create a vector search index named `vector_index` on the `embeddings` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "paperId"
    }
  ]
}
```

## Project Structure

```
researchiq/
├── client/          # React + Vite frontend
├── server/          # Express API backend
├── .env.example     # Environment variable template
└── package.json     # Monorepo root
```

## Author

**Pranjal Gautam**
- GitHub: [prgsr76-hash](https://github.com/prgsr76-hash)
- Developed as an independent, full-stack AI project to demonstrate expertise in RAG, vector databases, and modern web architectures.

