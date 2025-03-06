import mammoth from 'mammoth';

export class FileParser {
  static async parseFile(file: File): Promise<string> {
    const fileType = file.type;
    
    try {
      switch (fileType) {
        case 'application/pdf':
          return await this.parsePDF(file);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.parseDocx(file);
        case 'text/plain':
          return await this.parseText(file);
        default:
          throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      }
    } catch (error) {
      console.error('File parsing error:', error);
      throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async parsePDF(file: File): Promise<string> {
    try {
      // Convert PDF to text using PDF.js CDN
      const fileArrayBuffer = await file.arrayBuffer();
      const pdfJsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      
      // Load PDF.js dynamically
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = pdfJsUrl;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load PDF parser'));
        document.head.appendChild(script);
      });

      // Initialize PDF.js
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      // Load and parse PDF
      const pdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;
      const numPages = pdf.numPages;
      const textContent: string[] = [];

      // Extract text from each page
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map((item: any) => item.str)
          .join(' ');
        textContent.push(text);
      }

      return this.cleanText(textContent.join('\n\n'));
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error('Failed to parse PDF file. Please ensure the file is not corrupted.');
    }
  }

  private static async parseDocx(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return this.cleanText(result.value);
    } catch (error) {
      console.error('DOCX parsing error:', error);
      throw new Error('Failed to parse DOCX file. Please ensure the file is not corrupted.');
    }
  }

  private static async parseText(file: File): Promise<string> {
    try {
      const text = await file.text();
      return this.cleanText(text);
    } catch (error) {
      console.error('Text file parsing error:', error);
      throw new Error('Failed to parse text file. Please ensure the file is not corrupted.');
    }
  }

  private static cleanText(text: string): string {
    return text
      .replace(/[^\x20-\x7E\n]/g, ' ') // Remove non-printable characters
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/[^\S\r\n]+/g, ' ')  // Replace multiple spaces (but not newlines) with single space
      .replace(/\n{3,}/g, '\n\n')  // Replace multiple newlines with double newline
      .replace(/[•●]/g, '-') // Replace bullet points with dashes
      .trim();
  }

  static isValidFileType(file: File): boolean {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    return validTypes.includes(file.type);
  }

  static getFileTypeError(file: File): string | null {
    if (!this.isValidFileType(file)) {
      return 'Please upload a PDF, DOCX, or TXT file.';
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return 'File size must be less than 10MB.';
    }
    return null;
  }
}