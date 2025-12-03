
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, AIConfig } from "../types";

// Default prompt template with {{nativeLanguage}} placeholder
export const DEFAULT_ANALYSIS_PROMPT = `You are an expert English writing coach. The user is practicing "Back Translation". 

1. The user started with an Original English Text.
2. It was translated to their native language ({{nativeLanguage}}) (hidden from user).
3. The user translated that back into English (User's Back-Translation).

Compare the 'Original English Text' with the 'User's Back-Translation'.

IMPORTANT GUIDELINES:
1. Identify improvements. Always extract the **FULL SENTENCE** for both 'segment' (Original) and 'userVersion' (User's).
2. The fields 'summary', 'strengths', 'reason', and 'meaning' MUST be written in {{nativeLanguage}}.
3. 'betterAlternative' should be the English correction.
4. Ignore errors in capitalization, punctuation, and proper names.

Output JSON ONLY matching this structure:
{
  "score": number (0-100),
  "summary": string ({{nativeLanguage}}),
  "strengths": string[] ({{nativeLanguage}}),
  "improvements": [
    {
      "segment": string (Full Original Sentence),
      "meaning": string ({{nativeLanguage}} translation of segment),
      "userVersion": string (Full User Sentence),
      "betterAlternative": string (English correction),
      "reason": string ({{nativeLanguage}} explanation),
      "type": "grammar" | "vocabulary" | "style" | "nuance"
    }
  ]
}`;

// --- HELPER: Gemini Client ---
const getGeminiClient = (config: AIConfig) => {
  const apiKey = (config.useCustom && config.customApiKey && config.customApiKey.trim() !== '') 
    ? config.customApiKey 
    : process.env.API_KEY;

  const options: any = { apiKey };

  if (config.useCustom && config.customBaseUrl && config.customBaseUrl.trim() !== '') {
    options.baseUrl = config.customBaseUrl.trim().replace(/\/+$/, "");
  }
  
  return new GoogleGenAI(options);
};

const getModelName = (config: AIConfig) => {
  if (config.useCustom && config.customModelName && config.customModelName.trim() !== '') {
    return config.customModelName.trim();
  }
  return config.selectedPresetId || 'gemini-2.5-flash';
};

// --- HELPER: OpenAI Compatible Fetcher ---
const callOpenAI = async (
  config: AIConfig, 
  messages: { role: string; content: string }[], 
  responseFormat?: 'json_object'
): Promise<string> => {
  if (!config.customApiKey || !config.customBaseUrl) {
    throw new Error("Missing API Key or Base URL for Custom OpenAI connection.");
  }

  // Ensure URL ends with /v1/chat/completions or just /chat/completions depending on user input
  // But typically user provides BASE URL like https://api.deepseek.com
  const baseUrl = config.customBaseUrl.replace(/\/+$/, "");
  // Some users might paste the full path, handle that gracefully
  const url = baseUrl.endsWith('/chat/completions') 
    ? baseUrl 
    : `${baseUrl}/chat/completions`;

  const model = config.customModelName || 'gpt-3.5-turbo';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.customApiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        ...(responseFormat ? { response_format: { type: responseFormat } } : {})
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API Error:", response.status, errorText);
      throw new Error(`API Request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI Request Failed:", error);
    throw error;
  }
};

// --- EXPORTED FUNCTIONS ---

export const testConnection = async (config: AIConfig): Promise<boolean> => {
  try {
    if (config.useCustom && config.provider === 'openai') {
      // Test OpenAI Connection
      const result = await callOpenAI(config, [{ role: 'user', content: 'Hello' }]);
      return !!result;
    } else {
      // Test Gemini Connection
      const ai = getGeminiClient(config);
      const modelName = getModelName(config);
      await ai.models.generateContent({
        model: modelName,
        contents: "Test connection.",
      });
      return true;
    }
  } catch (error) {
    console.error(`Connection verification failed:`, error);
    return false;
  }
};

export const generateTargetTranslation = async (
  sourceText: string,
  targetLanguage: string,
  config: AIConfig
): Promise<{ fullTranslation: string; sentencePairs: { index: number; source: string; target: string }[] }> => {
  // Basic sentence split for English; we keep this simple and let the model
  // handle nuanced cases while still being aware of per-sentence structure.
  const englishSentences = sourceText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const prompt = `You are a professional translator.

Translate the following English sentences into natural, high-quality ${targetLanguage}.

RULES:
- Keep the sentence boundaries: for each English sentence, return exactly ONE corresponding ${targetLanguage} sentence.
- Preserve the number and order of sentences. Do NOT merge or split sentences.
- The translations should be suitable for a learner who will later translate them back into English.

Return JSON ONLY with the following structure:
{
  "fullTranslation": string,              // all sentences joined into a smooth ${targetLanguage} paragraph
  "sentencePairs": [
    { "index": number, "source": string, "target": string }
  ]
}

Here are the English sentences (with indices):

${englishSentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`;

  try {
    let jsonString = "";

    if (config.useCustom && config.provider === 'openai') {
      const textResponse = await callOpenAI(
        config,
        [{ role: 'user', content: prompt }],
        'json_object'
      );
      jsonString = textResponse;
    } else {
      const ai = getGeminiClient(config);
      const modelName = getModelName(config);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      jsonString = response.text || '{}';
    }

    jsonString = jsonString.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(jsonString);

    const fullTranslation: string = parsed.fullTranslation || '';
    const rawPairs: any[] = Array.isArray(parsed.sentencePairs) ? parsed.sentencePairs : [];
    const sentencePairs = rawPairs.map((p, idx) => ({
      index: typeof p.index === 'number' ? p.index : idx + 1,
      source: typeof p.source === 'string' ? p.source : englishSentences[idx] || '',
      target: typeof p.target === 'string' ? p.target : '',
    }));

    return {
      fullTranslation,
      sentencePairs,
    };
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to generate translation.');
  }
};

export const generatePracticeContent = async (
  difficulty: string,
  topic: string,
  config: AIConfig
): Promise<string> => {
  const prompt = `
    Generate a short, engaging English paragraph for a student practicing translation.
    
    Criteria:
    - Difficulty Level: ${difficulty}
    - Topic: ${topic}
    - Length: Approx 60-80 words.
    - Style: Natural, coherent, and grammatically correct.
    
    Output JUST the English text. No intro, no markdown, no explanations.
  `;

  try {
    if (config.useCustom && config.provider === 'openai') {
      return await callOpenAI(config, [{ role: 'user', content: prompt }]);
    } else {
      const ai = getGeminiClient(config);
      const modelName = getModelName(config);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return response.text?.trim() || "Failed to generate content.";
    }
  } catch (error) {
    console.error("Content generation error:", error);
    throw new Error("Failed to generate practice content.");
  }
};

export const analyzeBackTranslation = async (
  originalText: string,
  userBackTranslation: string,
  nativeLanguage: string,
  config: AIConfig
): Promise<AnalysisResult> => {
  
  // Use custom prompt if available, otherwise use default.
  // Replace {{nativeLanguage}} placeholder with actual language.
  const promptTemplate = config.customAnalysisPrompt || DEFAULT_ANALYSIS_PROMPT;
  const systemInstruction = promptTemplate.replace(/{{nativeLanguage}}/g, nativeLanguage);

  const userContent = `
    Original English Text:
    """${originalText}"""
    
    User's Back-Translation:
    """${userBackTranslation}"""
  `;

  try {
    let jsonString = "";

    if (config.useCustom && config.provider === 'openai') {
      // OpenAI Path
      const textResponse = await callOpenAI(config, [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userContent }
      ], 'json_object'); 
      jsonString = textResponse;
    } else {
      // Gemini Path
      const ai = getGeminiClient(config);
      const modelName = getModelName(config);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: systemInstruction + "\n" + userContent,
        config: {
          responseMimeType: "application/json",
        },
      });
      jsonString = response.text || "{}";
    }

    // Cleaning JSON string (handling markdown code blocks if any)
    jsonString = jsonString.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(jsonString) as AnalysisResult;

  } catch (error) {
    console.error("Analysis error:", error);
    throw new Error("Failed to analyze text.");
  }
};

export const getCoachResponse = async (
  context: string,
  userMessage: string,
  config: AIConfig
): Promise<string> => {
  const prompt = `
      You are a friendly and helpful English language tutor named "EchoCoach".
      The user has just completed a back-translation exercise and has questions about the feedback.
      
      CONTEXT OF THE EXERCISE:
      ${context}
      
      USER'S QUESTION:
      "${userMessage}"
      
      INSTRUCTIONS:
      - Answer clearly, concisely, and encouragingly.
      - Explain grammar or vocabulary nuances if asked.
      - Keep the tone supportive.
      - If the user writes in another language, reply in that language. Otherwise, use English (or match the language of the context if apparent).
    `;

  try {
    if (config.useCustom && config.provider === 'openai') {
      return await callOpenAI(config, [{ role: 'user', content: prompt }]);
    } else {
      const ai = getGeminiClient(config);
      const modelName = getModelName(config);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      return response.text || "I apologize, I couldn't process that question right now.";
    }
  } catch (error) {
    console.error("Coach chat error:", error);
    return "Sorry, I'm having trouble connecting to the server at the moment.";
  }
};
