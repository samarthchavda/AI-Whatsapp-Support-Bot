const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class KnowledgeBaseService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF file');
    }
  }

  /**
   * Extract text from TXT file
   */
  async extractTextFromTXT(filePath) {
    try {
      const text = await fs.readFile(filePath, 'utf-8');
      return text;
    } catch (error) {
      console.error('Error reading text file:', error);
      throw new Error('Failed to read text file');
    }
  }

  /**
   * Process uploaded file and extract text
   */
  async processFile(file) {
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    let extractedText = '';

    if (fileExtension === 'pdf') {
      extractedText = await this.extractTextFromPDF(file.path);
    } else if (fileExtension === 'txt') {
      extractedText = await this.extractTextFromTXT(file.path);
    } else {
      throw new Error('Unsupported file type. Only PDF and TXT files are allowed.');
    }

    // Clean up the text
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!extractedText || extractedText.length < 10) {
      throw new Error('No text could be extracted from the file');
    }

    return {
      text: extractedText,
      length: extractedText.length,
      fileType: fileExtension
    };
  }

  /**
   * Query the knowledge base using Gemini API
   */
  async queryKnowledgeBase(question, knowledgeBaseTexts) {
    try {
      if (!knowledgeBaseTexts || knowledgeBaseTexts.length === 0) {
        return {
          answer: "I don't have access to any knowledge base documents yet. Let me connect you to a human agent.",
          foundInKB: false,
          confidence: 0
        };
      }

      // Combine all knowledge base texts
      const combinedKB = knowledgeBaseTexts.join('\n\n---\n\n');

      // Create a prompt for Gemini
      const systemInstruction = `You are a helpful customer support assistant with access to a knowledge base.

IMPORTANT RULES:
1. ONLY answer questions using information from the provided knowledge base
2. If the answer is NOT in the knowledge base, you MUST respond with: "I don't have that information in my knowledge base. Let me connect you to a human agent."
3. Be concise and helpful
4. If you find the answer, provide it clearly and reference the knowledge base
5. Never make up information that's not in the knowledge base

KNOWLEDGE BASE:
${combinedKB}

Now answer the following customer question based ONLY on the knowledge base above.`;

      const model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: 0.3, // Lower temperature for more factual responses
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 300,
        }
      });

      const result = await model.generateContent(question);
      const answer = result.response.text();

      // Check if the answer indicates information not found
      const notFoundPhrases = [
        'not in the knowledge base',
        'not in my knowledge base',
        "don't have that information",
        'not mentioned',
        'not available',
        'connect you to a human agent',
        'human agent'
      ];

      const foundInKB = !notFoundPhrases.some(phrase => 
        answer.toLowerCase().includes(phrase.toLowerCase())
      );

      return {
        answer: answer,
        foundInKB: foundInKB,
        confidence: foundInKB ? 0.8 : 0.2,
        usedKnowledgeBase: true
      };
    } catch (error) {
      console.error('Error querying knowledge base:', error);
      return {
        answer: "I'm having trouble accessing the knowledge base right now. Let me connect you to a human agent.",
        foundInKB: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Chunk text into smaller pieces for better processing
   */
  chunkText(text, maxChunkSize = 2000) {
    const chunks = [];
    const paragraphs = text.split('\n\n');
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

module.exports = new KnowledgeBaseService();
