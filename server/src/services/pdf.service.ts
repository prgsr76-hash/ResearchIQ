import fs from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

/** Result returned from PDF text extraction */
export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  metadata: {
    title: string;
    author: string;
    creator: string;
  };
}

/**
 * Extracts text content from a PDF file on disk.
 * Normalizes whitespace and removes excessive blank lines.
 *
 * @param filePath - Absolute or relative path to the PDF file
 * @returns Cleaned text, page count, and PDF metadata
 */
export async function extractTextFromPdf(filePath: string): Promise<PdfExtractionResult> {
  const dataBuffer = await fs.readFile(filePath);
  const pdf = new PDFParse(new Uint8Array(dataBuffer));
  const pdfData = await pdf.getText();
  const info = await pdf.getInfo();

  const cleanedText = cleanText(pdfData.text);

  return {
    text: cleanedText,
    pageCount: pdfData.pages.length || 0,
    metadata: {
      title: info.info?.Title ?? '',
      author: info.info?.Author ?? '',
      creator: info.info?.Creator ?? '',
    },
  };
}

/**
 * Normalizes extracted PDF text:
 * - Collapses multiple spaces into one
 * - Removes excessive blank lines (max 2 consecutive)
 * - Trims leading/trailing whitespace
 */
function cleanText(raw: string): string {
  return raw
    .replace(/[^\S\n]+/g, ' ')         // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')         // max 2 consecutive newlines
    .replace(/^\s+|\s+$/gm, '')         // trim each line
    .trim();
}
