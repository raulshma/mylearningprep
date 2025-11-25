import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { createAPIError, type APIError } from '@/lib/schemas/error';

/**
 * Parsed resume result containing extracted text and metadata
 */
export interface ParsedResume {
  text: string;
  metadata: {
    pageCount: number;
    format: 'pdf' | 'docx';
  };
}

/**
 * Result type for resume parsing operations
 */
export type ParseResult = 
  | { success: true; data: ParsedResume }
  | { success: false; error: APIError };

/**
 * Resume Parser Service
 * Handles parsing of PDF and DOCX resume files
 * Requirements: 2.1, 2.2, 2.4
 */
export class ResumeParser {
  /**
   * Parse a PDF file and extract text content
   * Requirements: 2.1 - Parse PDF resume within 5 seconds
   */
  async parsePDF(buffer: Buffer): Promise<ParseResult> {
    try {
      // Convert Buffer to Uint8Array for pdf-parse
      const uint8Array = new Uint8Array(buffer);
      const parser = new PDFParse({ data: uint8Array });
      const textResult = await parser.getText();
      
      const text = textResult.text?.trim() || '';
      
      if (!text) {
        return {
          success: false,
          error: createAPIError(
            'PARSE_ERROR',
            'Could not extract text from PDF. The file may be image-based or corrupted.',
            { field: 'resumeFile' }
          ),
        };
      }

      // Get document info for page count
      const info = await parser.getInfo();
      
      // Clean up resources
      await parser.destroy();

      return {
        success: true,
        data: {
          text,
          metadata: {
            pageCount: info.total || 1,
            format: 'pdf',
          },
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: createAPIError(
          'PARSE_ERROR',
          `Failed to parse PDF: ${message}`,
          { field: 'resumeFile' }
        ),
      };
    }
  }

  /**
   * Parse a DOCX file and extract text content
   * Requirements: 2.2 - Parse DOCX resume within 5 seconds
   */
  async parseDOCX(buffer: Buffer): Promise<ParseResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      const text = result.value?.trim() || '';
      
      if (!text) {
        return {
          success: false,
          error: createAPIError(
            'PARSE_ERROR',
            'Could not extract text from DOCX. The file may be empty or corrupted.',
            { field: 'resumeFile' }
          ),
        };
      }

      // Log any warnings from mammoth
      if (result.messages && result.messages.length > 0) {
        console.warn('DOCX parsing warnings:', result.messages);
      }

      return {
        success: true,
        data: {
          text,
          metadata: {
            pageCount: 1, // DOCX doesn't have page count in raw extraction
            format: 'docx',
          },
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: createAPIError(
          'PARSE_ERROR',
          `Failed to parse DOCX: ${message}`,
          { field: 'resumeFile' }
        ),
      };
    }
  }

  /**
   * Parse a resume file based on its type
   * Automatically detects format from file extension or MIME type
   * Requirements: 2.4 - Error handling with fallback support
   */
  async parse(buffer: Buffer, filename: string): Promise<ParseResult> {
    const extension = filename.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'pdf':
        return this.parsePDF(buffer);
      case 'docx':
        return this.parseDOCX(buffer);
      default:
        return {
          success: false,
          error: createAPIError(
            'VALIDATION_ERROR',
            `Unsupported file format: ${extension}. Please upload a PDF or DOCX file.`,
            { field: 'resumeFile', supportedFormats: 'pdf, docx' }
          ),
        };
    }
  }
}

/**
 * Singleton instance of the resume parser
 */
export const resumeParser = new ResumeParser();
