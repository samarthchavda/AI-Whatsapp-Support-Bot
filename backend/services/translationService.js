const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const runtimeConfig = require('./runtimeConfigService');

const SUPPORTED_SWITCH_LANGUAGES = [
  { regex: /\b(english|eng)\b/i, name: 'English' },
  { regex: /\b(gujarati|gujrati|guj)\b|ગુજરાતી/i, name: 'Gujarati' },
  { regex: /\b(marathi|mar)\b|मराठी/i, name: 'Marathi' },
  { regex: /\b(hindi|hin)\b|हिन्दी|हिंदी/i, name: 'Hindi' },
  { regex: /\b(hinglish)\b/i, name: 'Hinglish' },
  { regex: /\b(tamil)\b|தமிழ்/i, name: 'Tamil' },
  { regex: /\b(telugu)\b|తెలుగు/i, name: 'Telugu' },
  { regex: /\b(kannada)\b|ಕನ್ನಡ/i, name: 'Kannada' },
  { regex: /\b(bengali|bangla)\b|বাংলা/i, name: 'Bengali' },
  { regex: /\b(punjabi)\b|ਪੰਜਾਬੀ/i, name: 'Punjabi' },
  { regex: /\b(malayalam)\b|മലയാളം/i, name: 'Malayalam' },
  { regex: /\b(spanish|espanol)\b/i, name: 'Spanish' },
  { regex: /\b(french|francais)\b/i, name: 'French' },
  { regex: /\b(arabic)\b|العربية/i, name: 'Arabic' },
  { regex: /\b(german|deutsch)\b/i, name: 'German' }
];

const SWITCH_VERBS_RE = /\b(talk|speak|reply|chat|respond|answer|write|switch|continue|change|use|bolo|bolna|bol|bola|baat|vat|vaat|kare|karo|samjhao|please|pls|plz)\b|વાત|બોલો|લખો|बोला|बोलो|बात|लिखो/i;
const QUESTION_STOPWORDS_RE = /\b(order|track|tracking|status|cancel|cancellation|refund|return|policy|shipping|delivery|product|products|price|cost|coupon|discount|payment|cod|upi|where|when|how|what|why|help|complaint|issue|damage|damaged)\b|#\d+|\bord-\d+\b/i;

function normalizeLanguageName(lang) {
  const cleaned = String(lang || '').trim();
  if (!cleaned) return 'English';
  const lower = cleaned.toLowerCase();
  if (lower === 'en' || lower === 'eng' || lower === 'english') return 'English';
  if (lower === 'gu' || lower === 'guj' || lower === 'gujrati' || lower === 'gujarati') return 'Gujarati';
  if (lower === 'mr' || lower === 'mar' || lower === 'marathi') return 'Marathi';
  if (lower === 'hi' || lower === 'hin' || lower === 'hindi') return 'Hindi';
  if (lower === 'hinglish') return 'Hinglish';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function detectLanguageByScript(text = '') {
  if (/[\u0A80-\u0AFF]/.test(text)) return 'Gujarati';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
  if (/[\u0980-\u09FF]/.test(text)) return 'Bengali';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'Kannada';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'Malayalam';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'Punjabi';
  if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';
  if (/[\u0900-\u097F]/.test(text)) {
    // Distinguish Marathi vs Hindi in Devanagari using common Marathi markers
    if (/(माझ[ाीे]|कुठे|आहे|नाही|सांगा|ऑर्डर|कधी|कृपया|मराठी|होय|माहिती|परत)/i.test(text)) {
      return 'Marathi';
    }
    return 'Hindi';
  }
  return 'English';
}

function isNeutralMessage(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return true;
  if (/^[\d\s#+*._-]+$/.test(trimmed)) return true;
  if (/^\s*(ord-\d+|#\d+)\s*$/i.test(trimmed)) return true;
  if (/^(ok|okay|k|kk|yes|no|yup|yep|nope|ha|haan|na|nahi|done|thx|thanks|thank you)$/i.test(trimmed)) return true;
  if (/^[^\w\u0900-\u0DFF\u0600-\u06FF]+$/.test(trimmed)) return true;
  return false;
}

function extractExplicitLanguageSwitch(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  let matchedLang = null;
  for (const entry of SUPPORTED_SWITCH_LANGUAGES) {
    if (entry.regex.test(trimmed)) {
      matchedLang = entry.name;
      break;
    }
  }
  if (!matchedLang) return null;

  const hasSwitchCue =
    SWITCH_VERBS_RE.test(trimmed) ||
    new RegExp(`^(in\\s+)?${matchedLang}(\\s+please|\\s+plz|\\s+pls)?[.!?]*$`, 'i').test(trimmed) ||
    new RegExp(`\\b(in|to)\\s+${matchedLang}\\b`, 'i').test(trimmed) ||
    new RegExp(`${matchedLang}\\s+(me|mein|madhe|ma|please|plz|pls)\\b`, 'i').test(trimmed);

  if (!hasSwitchCue) return null;

  const hasContentQuestion = QUESTION_STOPWORDS_RE.test(trimmed) || trimmed.length > 70;
  return {
    requestedLanguage: matchedLang,
    isSwitchOnly: !hasContentQuestion
  };
}

class TranslationService {
  constructor() {
    this._activeGeminiKey = null;
    this._activeOpenAiKey = null;
    this._syncClientsFromValues(process.env.GEMINI_API_KEY, process.env.OPENAI_API_KEY);
    this.geminiModelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.openaiModelName = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  _syncClientsFromValues(geminiApiKey, apiKey) {
    const normalizedGemini = geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here' ? geminiApiKey : null;
    if (normalizedGemini !== this._activeGeminiKey) {
      this._activeGeminiKey = normalizedGemini;
      this.gemini = normalizedGemini ? new GoogleGenerativeAI(normalizedGemini) : null;
    }

    const normalizedOpenAi = apiKey && apiKey !== 'your_openai_api_key_here' && apiKey !== 'sk-test-key' ? apiKey : null;
    if (normalizedOpenAi !== this._activeOpenAiKey) {
      this._activeOpenAiKey = normalizedOpenAi;
      this.openai = normalizedOpenAi ? new OpenAI({ apiKey: normalizedOpenAi }) : null;
    }
  }

  async ensureRuntimeConfig() {
    const [geminiKey, geminiModel, openaiKey, openaiModel] = await Promise.all([
      runtimeConfig.get('gemini_api_key'),
      runtimeConfig.get('gemini_model', 'gemini-2.5-flash'),
      runtimeConfig.get('openai_api_key'),
      runtimeConfig.get('openai_model', 'gpt-3.5-turbo')
    ]);
    this.geminiModelName = geminiModel || 'gemini-2.5-flash';
    this.openaiModelName = openaiModel || 'gpt-3.5-turbo';
    this._syncClientsFromValues(geminiKey, openaiKey);
  }

  extractExplicitLanguageSwitch(text) {
    return extractExplicitLanguageSwitch(text);
  }

  isNeutralMessage(text) {
    return isNeutralMessage(text);
  }

  normalizeLanguageName(lang) {
    return normalizeLanguageName(lang);
  }

  /**
   * Detect the customer's language, detect explicit language-switch commands,
   * and produce an English translation for KB RAG & intent matching when needed.
   */
  async detectAndTranslate(text, currentLanguage = 'English') {
    const activeLang = normalizeLanguageName(currentLanguage || 'English');
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return {
        detectedLanguage: activeLang,
        requestedLanguage: null,
        isSwitchOnly: false,
        isLanguageNeutral: true,
        isForeign: false,
        translation: null
      };
    }

    const explicitSwitch = extractExplicitLanguageSwitch(text);
    if (explicitSwitch && explicitSwitch.isSwitchOnly) {
      return {
        detectedLanguage: explicitSwitch.requestedLanguage,
        requestedLanguage: explicitSwitch.requestedLanguage,
        isSwitchOnly: true,
        isLanguageNeutral: false,
        isForeign: explicitSwitch.requestedLanguage !== 'English',
        translation: null
      };
    }

    if (isNeutralMessage(text)) {
      return {
        detectedLanguage: activeLang,
        requestedLanguage: null,
        isSwitchOnly: false,
        isLanguageNeutral: true,
        isForeign: activeLang !== 'English',
        translation: null
      };
    }

    await this.ensureRuntimeConfig();

    const scriptLang = detectLanguageByScript(text);

    try {
      const analysisPrompt = `Analyze this customer WhatsApp message (current conversation language is "${activeLang}"):
"${text}"

Determine:
1. "detectedLanguage": The language of the message (e.g., "English", "Gujarati", "Marathi", "Hindi", "Hinglish", "Gujarati (Roman)", "Marathi (Roman)", "Tamil", "Telugu", "Spanish", "Arabic", etc.). Note: If it's transliterated Gujarati like "maro order kya che", set "Gujarati". If it's transliterated Marathi like "mazi order kuthe aahe", set "Marathi". If it's Hinglish, set "Hindi".
2. "requestedLanguage": If the customer explicitly asks to switch or continue in a specific language (e.g. "please talk in english", "reply in marathi", "hindi me baat karo"), return that language name (e.g., "English", "Marathi", "Hindi"). Otherwise null.
3. "isSwitchOnly": boolean — true ONLY if the entire message is just asking to switch language without asking an order/product/policy/support question.
4. "isLanguageNeutral": boolean — true if the message contains no language clue (e.g. only an order number "#1024", digits, or "ok").
5. "translation": Concise English translation of the message (for search/intent matching) if it is not already clear English; otherwise null.

Return strictly a JSON object matching those keys with no markdown formatting.`;

      let parsed = null;
      if (this.gemini) {
        const model = this.gemini.getGenerativeModel({
          model: this.geminiModelName,
          generationConfig: { responseMimeType: 'application/json' }
        });
        const result = await model.generateContent(analysisPrompt);
        parsed = JSON.parse(result.response.text().trim());
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: this.openaiModelName,
          messages: [
            { role: 'system', content: analysisPrompt },
            { role: 'user', content: text }
          ],
          response_format: { type: 'json_object' }
        });
        parsed = JSON.parse(response.choices[0].message.content);
      }

      if (parsed && typeof parsed === 'object') {
        const reqLang = explicitSwitch?.requestedLanguage || (parsed.requestedLanguage ? normalizeLanguageName(parsed.requestedLanguage) : null);
        const neutral = parsed.isLanguageNeutral === true && !reqLang;
        const detLang = reqLang
          ? reqLang
          : neutral
            ? activeLang
            : normalizeLanguageName(parsed.detectedLanguage || scriptLang);
        const isSwitchOnly = Boolean(explicitSwitch?.isSwitchOnly || (reqLang && parsed.isSwitchOnly === true));
        const isForeign = !neutral && detLang.toLowerCase() !== 'english';

        return {
          detectedLanguage: detLang,
          requestedLanguage: reqLang,
          isSwitchOnly,
          isLanguageNeutral: neutral,
          isForeign,
          translation: isForeign && parsed.translation ? String(parsed.translation).trim() : null
        };
      }
    } catch (error) {
      console.error('Error in detectAndTranslate:', error.message || error);
    }

    // Deterministic script/switch fallback when LLM is not configured or fails
    const resolvedLang = explicitSwitch?.requestedLanguage || scriptLang || activeLang;
    return {
      detectedLanguage: resolvedLang,
      requestedLanguage: explicitSwitch?.requestedLanguage || null,
      isSwitchOnly: Boolean(explicitSwitch?.isSwitchOnly),
      isLanguageNeutral: false,
      isForeign: resolvedLang.toLowerCase() !== 'english',
      translation: null
    };
  }

  /**
   * Translate text into any customer target language (except plain English).
   */
  async translateText(text, targetLanguage) {
    if (!text || !targetLanguage) {
      return text;
    }
    const normalized = normalizeLanguageName(targetLanguage);
    if (normalized.toLowerCase() === 'english') {
      return text;
    }

    await this.ensureRuntimeConfig();

    const prompt = `Translate the following WhatsApp customer support message into natural, polite ${normalized}:
"${text}"

Rules:
- Keep order IDs (e.g. #1024, ORD-001), amounts/currency (e.g. ₹1,499), URLs, email addresses, and brand name "Kwickbot" unchanged.
- Preserve WhatsApp *bold* formatting if present.
- Do not add emojis, notes, or extra commentary. Return ONLY the translated message.`;

    try {
      if (this.gemini) {
        const model = this.gemini.getGenerativeModel({ model: this.geminiModelName });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: this.openaiModelName,
          messages: [
            {
              role: 'system',
              content: `Translate the customer support text into natural ${normalized}. Preserve order numbers, prices, URLs, and "Kwickbot". Return ONLY the translation.`
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
      console.error(`Error in translateText to ${normalized}:`, error.message || error);
    }

    return text;
  }
}

module.exports = new TranslationService();
