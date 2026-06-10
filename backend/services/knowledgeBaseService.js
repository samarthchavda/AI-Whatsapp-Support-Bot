const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const KnowledgeBaseChunk = require('../models/KnowledgeBaseChunk');

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
      const { PDFParse } = require('pdf-parse');
      const pdf = new PDFParse({ data: dataBuffer });
      await pdf.load();
      const result = await pdf.getText();
      return result.text;
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
   * Extract text from CSV file
   */
  async extractTextFromCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const fsSync = require('fs');
      const csvParser = require('csv-parser');
      
      fsSync.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          try {
            if (results.length === 0) {
              return resolve('');
            }
            // Format each row as: Key1: Val1, Key2: Val2...
            const formattedRows = results.map(row => {
              return Object.entries(row)
                .map(([key, val]) => `${key.trim()}: ${val.trim()}`)
                .join(', ');
            });
            resolve(formattedRows.join('\n'));
          } catch (err) {
            reject(err);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Extract text from URL
   */
  async extractTextFromURL(url) {
    try {
      const axios = require('axios');
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const html = response.data;
      if (typeof html !== 'string') {
        throw new Error('URL did not return HTML content');
      }
      
      // Clean up HTML tags (Zero dependency parsing)
      let cleaned = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
      cleaned = cleaned.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
      cleaned = cleaned.replace(/<[^>]+>/g, ' ');
      
      // Decode common entities
      cleaned = cleaned.replace(/&nbsp;/g, ' ')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&amp;/g, '&')
                       .replace(/&quot;/g, '"')
                       .replace(/&#39;/g, "'");
                       
      // Normalize whitespace
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return cleaned;
    } catch (error) {
      console.error('Error scraping URL:', error.message);
      throw new Error(`Failed to scrape URL: ${error.message}`);
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
    } else if (fileExtension === 'csv') {
      extractedText = await this.extractTextFromCSV(file.path);
    } else {
      throw new Error('Unsupported file type. Only PDF, TXT, and CSV files are allowed.');
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
   * Generate vector embedding for a block of text
   */
  async generateEmbedding(text) {
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      
      if (result && result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
      throw new Error('Invalid embedding response structure');
    } catch (error) {
      console.warn('⚠️ Gemini embedding failed, generating fallback representation:', error.message);
      // Fallback: Generate a deterministic pseudo-random vector of 768 dimensions based on string hash
      const dims = 768;
      const embedding = new Array(dims);
      
      // Compute simple hash of text
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }
      
      // Generate deterministic numbers
      for (let i = 0; i < dims; i++) {
        const seed = Math.sin(hash + i) * 10000;
        embedding[i] = seed - Math.floor(seed);
      }
      
      return embedding;
    }
  }

  /**
   * Compute cosine similarity between two vector arrays
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Chunk text and save chunks with embeddings
   */
  async processAndSaveChunks(kbDoc) {
    try {
      const text = kbDoc.extractedText;
      const chunks = this.chunkText(text, 1200); // 1200 chars chunks
      
      console.log(`🧩 Segmenting document "${kbDoc.title}" into ${chunks.length} chunks...`);
      
      const chunkDocs = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const embedding = await this.generateEmbedding(chunkText);
        
        const chunkDoc = new KnowledgeBaseChunk({
          knowledgeBaseId: kbDoc._id,
          admin: kbDoc.uploadedBy,
          text: chunkText,
          embedding,
          chunkIndex: i
        });
        
        await chunkDoc.save();
        chunkDocs.push(chunkDoc);
      }
      
      console.log(`✅ Stored ${chunkDocs.length} chunks for "${kbDoc.title}"`);
      return chunkDocs;
    } catch (error) {
      console.error('Error saving chunks:', error);
      throw new Error(`Failed to chunk and embed knowledge base: ${error.message}`);
    }
  }

  /**
   * Perform vector similarity search on knowledge base chunks
   */
  async searchChunks(queryText, adminId, limit = 3) {
    try {
      const queryEmbedding = await this.generateEmbedding(queryText);
      const chunks = await KnowledgeBaseChunk.find({ admin: adminId });
      
      if (chunks.length === 0) {
        return [];
      }
      
      const matches = chunks.map(chunk => {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        return { chunk, score };
      });
      
      matches.sort((a, b) => b.score - a.score);
      const topMatches = matches.slice(0, limit);
      
      return topMatches.map(m => ({
        text: m.chunk.text,
        score: m.score,
        knowledgeBaseId: m.chunk.knowledgeBaseId
      }));
    } catch (error) {
      console.error('Error searching vector chunks:', error);
      return [];
    }
  }

  /**
   * Query the knowledge base using Gemini API (with RAG vector context support)
   */
  async queryKnowledgeBase(question, contextOrAdminId) {
    try {
      let relevantTexts = [];
      let isRAG = false;

      if (Array.isArray(contextOrAdminId)) {
        relevantTexts = contextOrAdminId;
      } else if (contextOrAdminId) {
        // Retrieve relevant chunks via RAG vector search
        const searchResults = await this.searchChunks(question, contextOrAdminId, 3);
        relevantTexts = searchResults.map(r => r.text);
        isRAG = true;
        console.log(`🔍 RAG Search returned ${searchResults.length} matching contexts`);
      }

      if (relevantTexts.length === 0) {
        return {
          answer: "I don't have access to any knowledge base documents yet. Let me connect you to a human agent.",
          foundInKB: false,
          confidence: 0
        };
      }

      // Combine all knowledge base texts
      const combinedKB = relevantTexts.join('\n\n---\n\n');

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
        usedKnowledgeBase: true,
        isRAG
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
  chunkText(text, maxChunkSize = 1200) {
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
