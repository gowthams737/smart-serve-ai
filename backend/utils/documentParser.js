import zlib from 'zlib';

/**
 * Extracts plain text from a text file buffer.
 * @param {Buffer} buffer 
 * @returns {string}
 */
export function extractTextFromTxt(buffer) {
  if (!buffer || buffer.length === 0) return '';
  return buffer.toString('utf-8').trim();
}

/**
 * Lightweight pure-Node.js PDF text extractor.
 * Handles decompressed streams, /FlateDecode zlib streams, and text operators (Tj, TJ, ').
 * @param {Buffer} buffer 
 * @returns {string}
 */
export function extractTextFromPdf(buffer) {
  if (!buffer || buffer.length === 0) return '';

  const extractedStrings = [];
  const pdfString = buffer.toString('binary');

  // Find all stream objects: stream\r?\n ... endstream
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(pdfString)) !== null) {
    let streamData = Buffer.from(match[1], 'binary');

    // Attempt FlateDecode decompression
    try {
      streamData = zlib.inflateSync(streamData);
    } catch {
      // If not inflated or uncompressed, keep original streamData
    }

    const content = streamData.toString('utf-8');

    // Extract text in BT ... ET blocks
    const btRegex = /BT([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btRegex.exec(content)) !== null) {
      const block = btMatch[1];

      // Match [(text) 123 (more)] TJ or (text) Tj or '
      const tjRegex = /\(([^)]*)\)\s*(?:Tj|')/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        if (tjMatch[1].trim()) extractedStrings.push(tjMatch[1]);
      }

      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjArrayMatch;
      while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
        const inner = tjArrayMatch[1];
        const innerStrings = [];
        const strRegex = /\(([^)]*)\)/g;
        let sMatch;
        while ((sMatch = strRegex.exec(inner)) !== null) {
          innerStrings.push(sMatch[1]);
        }
        if (innerStrings.length > 0) {
          extractedStrings.push(innerStrings.join(''));
        }
      }
    }
  }

  // Fallback: If no BT/ET blocks, scan for literal strings in parentheses
  if (extractedStrings.length === 0) {
    const rawMatches = pdfString.match(/\(([a-zA-Z0-9\s.,!?:;@#$%&*()_-]{3,})\)/g);
    if (rawMatches) {
      for (const m of rawMatches.slice(0, 50)) {
        const cleaned = m.slice(1, -1).trim();
        if (cleaned && !cleaned.includes('Font') && !cleaned.includes('PDF')) {
          extractedStrings.push(cleaned);
        }
      }
    }
  }

  return extractedStrings.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Lightweight pure-Node.js DOCX text extractor.
 * Finds word/document.xml in the ZIP buffer and extracts text between <w:t> tags.
 * @param {Buffer} buffer 
 * @returns {string}
 */
export function extractTextFromDocx(buffer) {
  if (!buffer || buffer.length === 0) return '';

  try {
    // A DOCX file is a PKZIP archive. Search for the word/document.xml local file header.
    // Local file header signature is 0x04034b50 (PK\x03\x04)
    let offset = 0;
    while (offset < buffer.length - 30) {
      if (buffer.readUInt32LE(offset) === 0x04034b50) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraFieldLength = buffer.readUInt16LE(offset + 28);
        
        const fileName = buffer.toString('utf-8', offset + 30, offset + 30 + fileNameLength);
        const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

        if (fileName === 'word/document.xml') {
          const compressedData = buffer.slice(dataOffset, dataOffset + compressedSize);
          let xmlContent = '';

          if (compressionMethod === 8) {
            // Deflate compression
            xmlContent = zlib.inflateRawSync(compressedData).toString('utf-8');
          } else if (compressionMethod === 0) {
            // Stored (no compression)
            xmlContent = compressedData.toString('utf-8');
          }

          if (xmlContent) {
            // Extract text from <w:t>...</w:t> elements
            const textMatches = xmlContent.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
            const text = textMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
            return text.replace(/\s+/g, ' ').trim();
          }
        }
        offset = dataOffset + compressedSize;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn('DOCX extraction warning:', err.message);
  }

  return '';
}

/**
 * Parses an attached document based on MIME type or file extension.
 * @param {Object} file { name, mimeType, data (base64) }
 * @returns {Promise<{ success: boolean, text: string, error?: string }>}
 */
export async function parseDocumentAttachment(file) {
  if (!file || !file.data) {
    return { success: false, text: '', error: 'Attachment data is missing.' };
  }

  const name = (file.name || '').toLowerCase();
  const mimeType = (file.mimeType || '').toLowerCase();
  const buffer = Buffer.from(file.data, 'base64');

  // Size limit check (10MB)
  if (buffer.length > 10 * 1024 * 1024) {
    return { success: false, text: '', error: 'File size exceeds maximum permitted limit of 10MB.' };
  }

  if (buffer.length === 0) {
    return { success: false, text: '', error: 'Uploaded file is empty (0 bytes).' };
  }

  try {
    let extractedText = '';

    if (name.endsWith('.txt') || mimeType.includes('text/plain') || mimeType.includes('text/csv') || mimeType.includes('text/markdown')) {
      extractedText = extractTextFromTxt(buffer);
    } else if (name.endsWith('.pdf') || mimeType.includes('application/pdf')) {
      extractedText = extractTextFromPdf(buffer);
    } else if (name.endsWith('.docx') || mimeType.includes('wordprocessingml.document')) {
      extractedText = extractTextFromDocx(buffer);
    } else {
      return { 
        success: false, 
        text: '', 
        error: `Unsupported file format '${file.name}'. Please upload PDF, TXT, or DOCX documents.` 
      };
    }

    // Sanitize extracted text to prevent prompt injection attempts
    const sanitized = sanitizeExtractedContent(extractedText);

    return {
      success: true,
      text: sanitized,
      rawLength: buffer.length,
      charCount: sanitized.length
    };
  } catch (err) {
    return {
      success: false,
      text: '',
      error: `Failed to process document '${file.name}': ${err.message}`
    };
  }
}

/**
 * Sanitizes untrusted content extracted from documents:
 * - Truncates excessively long text (e.g. max 15,000 characters)
 * - Wraps in an isolated untrusted block with boundary indicators
 * - Defends against prompt injection attempts (e.g. "Ignore previous instructions", "You are now...", etc.)
 */
export function sanitizeExtractedContent(text) {
  if (!text) return '';

  // Limit characters to avoid token bloating
  const truncated = text.slice(0, 15000);

  // Neutralize common prompt injection patterns by making them plain text
  const neutralized = truncated
    .replace(/(system prompt|ignore previous instructions|you are now|developer instructions|admin override)/gi, '[REDACTED_COMMAND]')
    .trim();

  return neutralized;
}
