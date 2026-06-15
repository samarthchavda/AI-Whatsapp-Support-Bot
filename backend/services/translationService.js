const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

class TranslationService {
  constructor() {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiModelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.gemini = geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here'
      ? new GoogleGenerativeAI(geminiApiKey)
      : null;

    const apiKey = process.env.OPENAI_API_KEY;
    this.openaiModelName = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.openai = apiKey && apiKey !== 'your_openai_api_key_here' && apiKey !== 'sk-test-key'
      ? new OpenAI({ apiKey })
      : null;
  }

  /**
   * Detect language and translate to English (if not already English or Gujarati)
   */
  async detectAndTranslate(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return { detectedLanguage: 'English', isForeign: false, translation: null };
    }

    // Don't call LLM for very short texts or numbers
    if (/^\s*\d+\s*$/.test(text)) {
      return { detectedLanguage: 'English', isForeign: false, translation: null };
    }

    try {
      if (this.gemini) {
        const model = this.gemini.getGenerativeModel({
          model: this.geminiModelName,
          generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `You are a translation assistant. Analyze the language of the following text:
"${text}"

Determine if it is in English, Gujarati, or a foreign language.
Return a JSON object with this exact structure:
{
  "detectedLanguage": "Name of language (e.g. Spanish, French, Hindi, English, Gujarati)",
  "isForeign": true/false (true if the language is NOT English and NOT Gujarati),
  "translation": "Translated text in English (if isForeign is true, otherwise null)"
}
Do not return markdown or any additional formatting.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        const parsed = JSON.parse(responseText);
        
        return {
          detectedLanguage: parsed.detectedLanguage || 'English',
          isForeign: parsed.isForeign === true,
          translation: parsed.isForeign ? parsed.translation : null
        };
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: this.openaiModelName,
          messages: [
            {
              role: 'system',
              content: 'You are a translation assistant. Analyze the text and return a JSON object with keys: "detectedLanguage" (e.g. Spanish, English), "isForeign" (boolean, true if not English or Gujarati), and "translation" (translated text in English if isForeign is true, else null).'
            },
            {
              role: 'user',
              content: text
            }
          ],
          response_format: { type: "json_object" }
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        return {
          detectedLanguage: parsed.detectedLanguage || 'English',
          isForeign: parsed.isForeign === true,
          translation: parsed.isForeign ? parsed.translation : null
        };
      }
    } catch (error) {
      console.error('Error in detectAndTranslate:', error);
    }

    // Default fallback
    return { detectedLanguage: 'English', isForeign: false, translation: null };
  }

  /**
   * Translate English/Gujarati text back into the customer's native language
   */
  async translateText(text, targetLanguage) {
    if (!text || !targetLanguage || targetLanguage.toLowerCase() === 'english' || targetLanguage.toLowerCase() === 'gujarati') {
      return text;
    }

    try {
      if (this.gemini) {
        const model = this.gemini.getGenerativeModel({ model: this.geminiModelName });
        const prompt = `Translate the following text into ${targetLanguage}:
"${text}"

Return only the translated text. Do not add any explanations, notes, or markdown formatting.`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: this.openaiModelName,
          messages: [
            {
              role: 'system',
              content: `Translate the user's text into ${targetLanguage}. Return ONLY the translation, with no explanation or introductory text.`
            },
            {
              role: 'user',
              content: text
            }
          ]
        });

        return response.choices[0].message.content.trim();
      }
    } catch (error) {
      console.error(`Error in translateText to ${targetLanguage}:`, error);
    }

    return text; // Fallback to original text
  }
}

module.exports = new TranslationService();
