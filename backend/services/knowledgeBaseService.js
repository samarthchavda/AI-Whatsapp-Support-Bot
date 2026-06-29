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

      const model = this.genAI.getGenerativeModel({ model: "gemini-embedding-001" });
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
      
      const KnowledgeBase = require('../models/KnowledgeBase');
      const kbQuery = { isActive: true };
      if (adminId) {
        kbQuery.uploadedBy = adminId;
      }
      const activeKBs = await KnowledgeBase.find(kbQuery);
      const activeKBIds = activeKBs.map(kb => kb._id);
      
      if (activeKBIds.length === 0) {
        return [];
      }
      
      const chunkQuery = { knowledgeBaseId: { $in: activeKBIds } };
      if (adminId) {
        chunkQuery.admin = adminId;
      }
      
      const chunks = await KnowledgeBaseChunk.find(chunkQuery);
      
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
        console.log('🔍 RAG Search returned empty, running local keyword fallback search...');
        const localRes = await this.queryLocalFallback(question, contextOrAdminId);
        if (localRes.foundInKB) {
          return localRes;
        }
        return {
          answer: null,
          foundInKB: false,
          confidence: 0
        };
      }

      // Combine all knowledge base texts
      const combinedKB = relevantTexts.join('\n\n---\n\n');

      // Create a prompt for Gemini
      const systemInstruction = `You are a professional customer support agent with access to a store knowledge base.

Rules:
1. Answer only from the most relevant section. Ignore unrelated retrieved content.
2. Do not copy raw knowledge base text. Rewrite answers in natural, conversational customer-support language.
3. Answer the customer's question directly first. If the question implies a Yes/No answer, start with Yes or No.
4. Never repeat the document title, mention page numbers, or include internal references (like PDFs, pages, help center titles, or guides).
5. If the answer IS in the knowledge base, use it to respond naturally.
6. Keep responses concise, polite, and customer-focused. Never invent order, refund, or policy details.

Smart Fallback Rules (when the knowledge base does NOT contain the answer):
- OFFERS/DISCOUNTS: "We don't have any active offers right now, but stay tuned! We'll notify you as soon as a new offer drops. 🎉"
- STORE INFO: "We are an online store committed to giving you the best products and service. Browse our website or ask me anything specific! 🛍️"
- PRODUCTS: "We have a great range of products! Visit our store to explore the full catalog, or tell me what you're looking for. 😊"
- DELIVERY: "Delivery typically takes 3-7 business days depending on your location. Share your order number for exact details."
- PAYMENT: "We accept all major payment methods including UPI, credit/debit cards, and net banking."
- GREETINGS (hi/hello): Reply warmly and ask how you can help. Do NOT escalate.
- WHO ARE YOU: "I'm your AI shopping assistant! I can help with orders, products, policies, and more. 🤖"
- ONLY say "Let me connect you to a human agent" for REFUNDS, COMPLAINTS, or genuinely complex issues.

KNOWLEDGE BASE:
${combinedKB}

Now answer the following customer question using the knowledge base above. If the answer is not in the KB, use the Smart Fallback Rules.`;

      const model = this.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: 0.3, // Lower temperature for more factual responses
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1000,
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
      console.error('Error querying knowledge base, falling back to local text search:', error);
      return this.queryLocalFallback(question, contextOrAdminId);
    }
  }

  /**
   * Local keyword search fallback when Gemini RAG / API is not working or key is expired
   */
  async queryLocalFallback(question, contextOrAdminId) {
    try {
      let texts = [];
      if (Array.isArray(contextOrAdminId)) {
        texts = contextOrAdminId;
      } else if (contextOrAdminId) {
        const KnowledgeBase = require('../models/KnowledgeBase');
        const kbs = await KnowledgeBase.find({ uploadedBy: contextOrAdminId, isActive: true });
        texts = kbs.map(kb => kb.extractedText);
      }

      if (texts.length === 0) {
        return {
          answer: "I don't have access to any store policies or knowledge base documents right now.",
          foundInKB: false,
          confidence: 0
        };
      }

      // Segment text into paragraphs/lines
      const paragraphs = [];
      for (const text of texts) {
        // Reconstruct paragraphs: replace single newlines with spaces, preserve double newlines
        const reconstructedText = text
          .replace(/\r\n/g, '\n')
          .split(/\n\n+/)
          .map(para => para.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(para => para.length > 5);

        // Split bullet points or list items so they can be queried individually
        for (const para of reconstructedText) {
          if (para.includes(' - ') || para.includes(' • ') || para.startsWith('- ') || para.startsWith('• ')) {
            const items = para.split(/(?:\s+-\s+|\s+•\s+|^-\s+|^•\s+)/)
              .map(item => item.trim())
              .filter(item => item.length > 10);
            paragraphs.push(...items);
          } else {
            paragraphs.push(para);
          }
        }
      }

      // Extract keywords from question
      const stopWords = new Set([
        'is', 'the', 'a', 'an', 'of', 'to', 'for', 'on', 'in', 'at', 'by', 'from',
        'with', 'about', 'can', 'i', 'you', 'my', 'your', 'do', 'does', 'did',
        'what', 'where', 'when', 'how', 'why', 'are', 'we', 'our', 'it', 'this',
        'that', 'me', 'us', 'they', 'them', 'he', 'she', 'him', 'her', 'be', 'been',
        'have', 'has', 'had', 'will', 'would', 'should', 'could', 'or', 'and', 'but'
      ]);

      const keywords = question.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 1 && !stopWords.has(w));
      if (keywords.length === 0) {
        return {
          answer: "I'm not sure how to help with that. Could you ask specifically about shipping, returns, or store info?",
          foundInKB: false,
          confidence: 0
        };
      }

      console.log(`🔍 Local Fallback Search using keywords:`, keywords);

      // Topic detection for user's question
      const questionLower = question.toLowerCase();
      const isAskingAboutShipping = /shipping|delivery|ship|carrier|delivery time|delivery window/i.test(questionLower);
      const isAskingAboutReturns = /return|refund|exchange|send back/i.test(questionLower);
      const isAskingAboutCancellations = /cancel|cancellation/i.test(questionLower);
      const hasSpecificTopic = isAskingAboutShipping || isAskingAboutReturns || isAskingAboutCancellations;

      // Rank paragraphs based on keyword matches
      const matches = [];
      for (const para of paragraphs) {
        let score = 0;
        const paraLower = para.toLowerCase();
        
        for (const kw of keywords) {
          if (paraLower.includes(kw)) {
            score++;
            // Give extra weight if it contains multiple matches or matches whole word
            if (new RegExp(`\\b${kw}\\b`).test(paraLower)) {
              score += 0.5;
            }
          }
        }

        // Apply topic mismatch penalty if a specific topic is requested
        if (hasSpecificTopic) {
          const isParaShipping = /shipping|delivery|ship|flat rate/i.test(paraLower);
          const isParaReturns = /return|refund|exchange|refund policy/i.test(paraLower);
          const isParaCancellations = /cancel|cancellation/i.test(paraLower);

          let hasMismatch = false;
          if (isParaReturns && !isAskingAboutReturns) {
            hasMismatch = true;
          }
          if (isParaCancellations && !isAskingAboutCancellations) {
            hasMismatch = true;
          }
          if (isParaShipping && !isAskingAboutShipping && !isParaReturns && !isParaCancellations) {
            hasMismatch = true;
          }

          if (hasMismatch) {
            score -= 2.0; // Apply a heavy penalty for topic mismatch
          }
        }

        if (score > 0.5) {
          // Apply length penalty (fourth root of paragraph length) to favor concise matches
          const lengthPenalty = Math.pow(para.length, 0.25);
          const normalizedScore = score / lengthPenalty;
          matches.push({ text: para, score: normalizedScore });
        }
      }

      // Sort by score descending
      matches.sort((a, b) => b.score - a.score);

      if (matches.length === 0) {
        return {
          answer: "I don't have that information in my knowledge base. Let me connect you to a human agent.",
          foundInKB: false,
          confidence: 0
        };
      }

      // Filter matches: discard weak matches with less than 40% of the top score
      const topScore = matches[0].score;
      const threshold = topScore * 0.4;
      const strongMatches = matches.filter(m => m.score >= threshold);

      // Clean up paragraphs (remove headers, page references, and duplicate snippets)
      const cleanedMatches = [];
      const seenTexts = new Set();
      
      for (const m of strongMatches) {
        let txt = m.text.trim();
        
        // Skip headers like "2. Shipping Policies & Rates" or "3. Returns & Refunds Policy"
        if (/^\d+\.\s+[A-Za-z\s&]+/i.test(txt) || /^(Store Overview|Shipping Policies|Returns & Refunds|Order Cancellations|Contact & Support)/i.test(txt)) {
          continue;
        }
        
        // Skip metadata lines or lines containing PDF names, guides, or document headers
        if (/\.pdf/i.test(txt) || 
            /knowledge base/i.test(txt) || 
            /document title/i.test(txt) ||
            /store guide/i.test(txt) ||
            /store guidelines/i.test(txt) ||
            /help center/i.test(txt) ||
            /policies & rates/i.test(txt) ||
            /returns & refunds/i.test(txt) ||
            /order cancellations/i.test(txt)) {
          continue;
        }

        // Remove trailing or inline section headers like "3. Returns & Refunds"
        txt = txt.replace(/\s+\d+\.\s+[A-Z][A-Za-z\s&']+/g, '').trim();
        txt = txt.replace(/\s+\.\s*$/, '.').replace(/\.\s*\.$/, '.');
        
        // Remove leading dashes/bullet points
        txt = txt.replace(/^[\s•\-\*]+/g, '').trim();

        // Remove page references
        txt = txt.replace(/\bpage\s+\d+\b/gi, '');
        txt = txt.replace(/\bpg\.\s*\d+\b/gi, '');
        txt = txt.replace(/\bpages\s+\d+(?:\s*-\s*\d+)?\b/gi, '');
        txt = txt.replace(/\[\s*page\s*\d+\s*\]/gi, '');
        txt = txt.replace(/\(\s*page\s*\d+\s*\)/gi, '');
        txt = txt.replace(/\s+/g, ' ').trim();
        
        if (txt && !seenTexts.has(txt)) {
          seenTexts.add(txt);
          cleanedMatches.push(txt);
        }
        if (cleanedMatches.length >= 2) break; // Limit to top 2 clean paragraphs for concise readability
      }

      if (cleanedMatches.length === 0) {
        return {
          answer: "I couldn't find any information in the store policies about that. Let me connect you to a human agent.",
          foundInKB: false,
          confidence: 0
        };
      }

      // Convert label-based bullet points into conversational sentences
      const formatConversationalSentence = (txt) => {
        let cleaned = txt.replace(/^[\s•\-\*\d\.\#]+/g, '').trim();
        
        const colonIndex = cleaned.indexOf(':');
        if (colonIndex > 0 && colonIndex < 35) {
          const label = cleaned.substring(0, colonIndex).trim();
          let content = cleaned.substring(colonIndex + 1).trim();
          
          const labelLower = label.toLowerCase().replace(/\s+/g, ' ');
          const contentLower = content.toLowerCase().replace(/\s+/g, ' ');
          
          // Remove duplicate word if last word of label matches first word of content
          const labelWords = labelLower.split(/\s+/);
          const lastLabelWord = labelWords[labelWords.length - 1];
          const contentFirstWord = contentLower.split(/\s+/)[0];
          
          let contentToUse = content;
          if (lastLabelWord === contentFirstWord || lastLabelWord.replace(/s$/, '') === contentFirstWord.replace(/s$/, '')) {
            const spaceIndex = content.indexOf(' ');
            if (spaceIndex > 0) {
              contentToUse = content.substring(spaceIndex).trim();
            }
          }
          
          const lowercaseFirst = (str) => {
            if (!str) return '';
            const firstWord = str.split(/\s+/)[0];
            if (firstWord === 'I' || firstWord === 'We' || firstWord === 'Our' || firstWord === 'You' || /^[A-Z]{2,}/.test(firstWord)) {
              return str;
            }
            return str.charAt(0).toLowerCase() + str.slice(1);
          };

          // Check if content already contains the label to avoid redundancy
          const labelBase = labelLower.replace(/s$/, ''); // singular form
          if (contentLower.includes(labelBase) || contentLower.startsWith(labelLower.substring(0, 4))) {
            return content;
          }

          if (labelLower.includes('free shipping')) {
            if (contentLower.startsWith('available')) {
              return `We offer free shipping, which is ${lowercaseFirst(contentToUse)}`;
            }
            return `For free shipping, ${lowercaseFirst(contentToUse)}`;
          }
          
          if (labelLower.includes('standard shipping')) {
            if (/^\d|\$/.test(contentToUse)) {
              return `Standard shipping is a ${contentToUse}`;
            }
            return `Standard shipping is ${lowercaseFirst(contentToUse)}`;
          }

          if (labelLower.includes('flat rate') || labelLower.includes('flat shipping')) {
            return `We have a flat shipping rate of ${lowercaseFirst(contentToUse)}`;
          }
          
          if (labelLower.includes('delivery')) {
            if (contentLower.startsWith('takes') || contentLower.startsWith('window') || contentLower.startsWith('standard')) {
              return `Delivery typically ${lowercaseFirst(contentToUse)}`;
            }
            return `For delivery, ${lowercaseFirst(contentToUse)}`;
          }
          
          if (labelLower.includes('returns window') || labelLower.includes('return window')) {
            return `Our return window is ${lowercaseFirst(contentToUse)}`;
          }
          
          if (labelLower.includes('unopened')) {
            return `For unopened items, ${lowercaseFirst(contentToUse)}`;
          }
          
          if (labelLower.includes('opened')) {
            return `Please note that opened items ${lowercaseFirst(contentToUse)}`;
          }
          
          if (labelLower.includes('final sale')) {
            return `Keep in mind that final sale items ${lowercaseFirst(contentToUse)}`;
          }
          
          if (labelLower.includes('restriction') || labelLower.includes('exclusion')) {
            return `Please note that ${lowercaseFirst(contentToUse)}`;
          }

          if (labelLower.includes('guarantee')) {
            return `Under our ${labelLower}, ${lowercaseFirst(contentToUse)}`;
          }

          return `Regarding ${labelLower}, ${lowercaseFirst(contentToUse)}`;
        }
        
        return cleaned;
      };

      const formattedSentences = cleanedMatches.map(formatConversationalSentence);
      
      // Check if question implies Yes/No
      const isYesNoQuestion = /is there|do you|can i|are you|will i|should i|does the/i.test(questionLower);
      
      let randomGreeting = "";
      if (isYesNoQuestion) {
        const answerLower = formattedSentences.join(' ').toLowerCase();
        const containsNotSupported = /not supported|do not|don't|only/i.test(answerLower);
        const containsFree = /free|yes|available/i.test(answerLower);
        
        if (questionLower.includes('internationally') && containsNotSupported) {
          randomGreeting = "No, ";
        } else if (questionLower.includes('free') && containsFree) {
          randomGreeting = "Yes! ";
        } else if (containsNotSupported) {
          randomGreeting = "No, ";
        } else {
          randomGreeting = "Yes! ";
        }
      } else {
        const greetings = [
          "Hi! 😊 ",
          "Hello! ",
          "Hi there! ",
          "Hello, "
        ];
        randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      }

      const closings = [
        " Let me know if you have any other questions!",
        " Feel free to ask if you need anything else.",
        " Let me know if there's anything else I can help you with! 😊",
        ""
      ];
      const randomClosing = closings[Math.floor(Math.random() * closings.length)];

      let bodyText = "";
      if (formattedSentences.length === 1) {
        bodyText = formattedSentences[0];
      } else if (formattedSentences.length === 2) {
        const first = formattedSentences[0];
        let second = formattedSentences[1];
        if (second.charAt(0) === second.charAt(0).toUpperCase() && !/^[A-Z]{2,}/.test(second.split(/\s+/)[0])) {
          second = second.charAt(0).toLowerCase() + second.slice(1);
        }
        bodyText = `${first} Additionally, ${second}`;
      } else {
        bodyText = formattedSentences.join(" Also, ");
      }

      if (bodyText && !/[.!?]$/.test(bodyText)) {
        bodyText += ".";
      }

      const responseText = `${randomGreeting}${bodyText}${randomClosing}`;

      return {
        answer: responseText,
        foundInKB: true,
        confidence: 0.9,
        usedKnowledgeBase: true,
        localFallback: true
      };

    } catch (fallbackError) {
      console.error('Error in local fallback search:', fallbackError);
      return {
        answer: "I'm having trouble accessing the store policies right now. Let me connect you to a human agent.",
        foundInKB: false,
        confidence: 0
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
