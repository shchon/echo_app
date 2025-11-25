
import React, { useState, useRef, useEffect } from 'react';
import { AppStep, AnalysisResult, HistoryItem, VocabularyItem, Improvement, AIConfig } from './types';
import { generateTargetTranslation, analyzeBackTranslation, generatePracticeContent, testConnection } from './services/geminiService';
import StepIndicator from './components/StepIndicator';
import CoachChat from './components/CoachChat';
import LibraryModal from './components/LibraryModal';
import { 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  Check, 
  FileText,
  Languages,
  ChevronRight,
  Globe,
  Settings,
  X,
  Cpu,
  Dices,
  Loader2,
  Library,
  Bookmark,
  BookmarkCheck,
  Link as LinkIcon,
  KeyRound,
  MessageSquareText,
  Server,
  PlugZap,
  CheckCircle2,
  XCircle,
  Zap
} from 'lucide-react';

const LANGUAGES = [
  { id: 'Simplified Chinese', label: '简体中文' },
  { id: 'Traditional Chinese', label: '繁體中文' },
  { id: 'Japanese', label: '日本語' },
  { id: 'Korean', label: '한국어' },
  { id: 'Spanish', label: 'Español' },
  { id: 'French', label: 'Français' },
  { id: 'German', label: 'Deutsch' },
  { id: 'Portuguese', label: 'Português' },
  { id: 'Russian', label: 'Русский' },
  { id: 'Italian', label: 'Italiano' },
];

const PRESET_MODELS = [
  { 
    id: 'gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    description: 'Fast and efficient. Best for quick practice.' 
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3.0 Pro', 
    description: 'Enhanced reasoning. Better for complex grammar analysis.' 
  },
];

const TOPICS = ["General Life", "Business", "Technology", "Travel", "Academic", "Fiction"];
const DIFFICULTIES = ["Beginner (A2)", "Intermediate (B1/B2)", "Advanced (C1)"];

const DEFAULT_CONFIG: AIConfig = {
  useCustom: false,
  selectedPresetId: 'gemini-2.5-flash',
  customBaseUrl: '',
  customApiKey: '',
  customModelName: 'gemini-2.5-flash',
  provider: 'gemini'
};

const App: React.FC = () => {
  // State
  const [step, setStep] = useState<AppStep>(AppStep.INPUT_SOURCE);
  const [sourceText, setSourceText] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState(LANGUAGES[0].id);
  const [translatedText, setTranslatedText] = useState('');
  const [backTranslation, setBackTranslation] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generator State
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(DIFFICULTIES[1]);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [settingsTab, setSettingsTab] = useState<'preset' | 'custom'>('preset');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Library State
  const [showLibrary, setShowLibrary] = useState(false);
  
  // FIX: Use Lazy Initialization for History and Vocabulary to prevent overwriting LocalStorage with empty arrays
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('echoLoopHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load history from LocalStorage", e);
      return [];
    }
  });

  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>(() => {
    try {
      const saved = localStorage.getItem('echoLoopVocabulary');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load vocabulary from LocalStorage", e);
      return [];
    }
  });
  
  const [recentlySavedVocab, setRecentlySavedVocab] = useState<string[]>([]);

  // Refs for auto-scrolling
  const topRef = useRef<HTMLDivElement>(null);

  // Load Config from LocalStorage (Config is less sensitive to race conditions, but moved to effect for clarity)
  useEffect(() => {
    const savedConfig = localStorage.getItem('echoLoopConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Ensure provider exists for old configs
        if (!parsed.provider) parsed.provider = 'gemini';
        setAiConfig({ ...DEFAULT_CONFIG, ...parsed });
        if (parsed.useCustom) setSettingsTab('custom');
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }
    
    // Note: We removed history/vocabulary loading from here because it's now handled in useState initialization
  }, []);

  // Save Data to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('echoLoopHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('echoLoopVocabulary', JSON.stringify(vocabulary));
  }, [vocabulary]);

  useEffect(() => {
    localStorage.setItem('echoLoopConfig', JSON.stringify(aiConfig));
  }, [aiConfig]);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Data Handlers ---

  const addToHistory = (result: AnalysisResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      sourceText,
      userBackTranslation: backTranslation,
      score: result.score,
      summary: result.summary,
      timestamp: Date.now()
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const deleteHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const addToVocabulary = (imp: Improvement) => {
    const id = Date.now().toString() + Math.random().toString();
    const newItem: VocabularyItem = {
      id,
      original: imp.userVersion,
      better: imp.betterAlternative,
      reason: imp.reason,
      context: imp.segment, // Save the original segment as context
      meaning: imp.meaning, // Save the native meaning
      timestamp: Date.now()
    };
    setVocabulary(prev => [newItem, ...prev]);
    setRecentlySavedVocab(prev => [...prev, imp.betterAlternative]);
  };

  const deleteVocabulary = (id: string) => {
    setVocabulary(prev => prev.filter(v => v.id !== id));
  };

  const handleImportData = (importedHistory: HistoryItem[], importedVocabulary: VocabularyItem[]) => {
    // Merge history (avoid duplicates by ID)
    setHistory(prev => {
      const existingIds = new Set(prev.map(h => h.id));
      const newItems = importedHistory.filter(h => !existingIds.has(h.id));
      return [...newItems, ...prev];
    });

    // Merge vocabulary (avoid duplicates by ID)
    setVocabulary(prev => {
      const existingIds = new Set(prev.map(v => v.id));
      const newItems = importedVocabulary.filter(v => !existingIds.has(v.id));
      return [...newItems, ...prev];
    });
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    const success = await testConnection(aiConfig);
    setConnectionStatus(success ? 'success' : 'error');
    
    // Reset status after 3 seconds
    setTimeout(() => {
        if (success) setConnectionStatus('idle');
    }, 3000);
  };

  // --- Workflow Handlers ---

  const handleStartPractice = async () => {
    if (!sourceText.trim()) return;
    setError(null);
    setStep(AppStep.TRANSLATING_TO_TARGET);
    try {
      const translation = await generateTargetTranslation(sourceText, nativeLanguage, aiConfig);
      setTranslatedText(translation);
      setStep(AppStep.PRACTICE_BACK_TRANSLATION);
    } catch (e) {
      setError("Failed to generate translation. Please check your configuration and connection.");
      setStep(AppStep.INPUT_SOURCE);
    }
  };

  const handleGenerateRandomText = async () => {
    setIsGeneratingContent(true);
    setError(null);
    try {
      const text = await generatePracticeContent(selectedDifficulty, selectedTopic, aiConfig);
      setSourceText(text);
    } catch (e) {
      setError("Failed to generate random content. Check your AI settings.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleSubmitBackTranslation = async () => {
    if (!backTranslation.trim()) return;
    setError(null);
    setStep(AppStep.ANALYZING);
    try {
      const result = await analyzeBackTranslation(sourceText, backTranslation, nativeLanguage, aiConfig);
      setAnalysis(result);
      addToHistory(result);
      setStep(AppStep.RESULTS);
      setRecentlySavedVocab([]);
      scrollToTop();
    } catch (e) {
      setError("Failed to analyze your translation. Check your configuration.");
      setStep(AppStep.PRACTICE_BACK_TRANSLATION);
    }
  };

  const handleReset = () => {
    setStep(AppStep.INPUT_SOURCE);
    setSourceText('');
    setTranslatedText('');
    setBackTranslation('');
    setAnalysis(null);
    setError(null);
    scrollToTop();
  };

  const handleTryAgainSameText = () => {
    setStep(AppStep.PRACTICE_BACK_TRANSLATION);
    setBackTranslation('');
    setAnalysis(null);
    setError(null);
    scrollToTop();
  };

  // -------------------------------------------------------------------------
  // RENDER HELPERS
  // -------------------------------------------------------------------------

  const renderHeader = () => (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 py-4 mb-8 shadow-sm transition-all duration-300">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-100">
            <RotateCcw className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">EchoLoop</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
           {/* Native Language Selector in Header */}
           <div className="relative group">
             <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-gray-50 hover:bg-white hover:border-brand-300 transition-all cursor-pointer">
                <Globe size={16} className="text-gray-500 group-hover:text-brand-500" />
                <select
                  value={nativeLanguage}
                  onChange={(e) => setNativeLanguage(e.target.value)}
                  className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer appearance-none pr-6"
                  style={{ backgroundImage: 'none' }}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
             </div>
           </div>

           <div className="h-6 w-px bg-gray-200 mx-1"></div>
           
           <button 
             onClick={() => setShowLibrary(true)}
             className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors relative group"
             title="My Library"
           >
             <Library size={20} />
             {history.length > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>}
           </button>

           <button 
             onClick={() => { setShowSettings(true); setConnectionStatus('idle'); }}
             className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
             title="Settings"
           >
             <Settings size={20} />
           </button>
        </div>
      </div>
    </header>
  );

  const renderSettingsModal = () => {
    if (!showSettings) return null;
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings size={20} className="text-brand-600" />
              Application Settings
            </h3>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-2 bg-gray-50 border-b border-gray-100 flex gap-1 px-6">
            <button 
              onClick={() => {
                setSettingsTab('preset');
                setAiConfig(prev => ({ ...prev, useCustom: false }));
                setConnectionStatus('idle');
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2
                ${settingsTab === 'preset' 
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Cpu size={16} /> Preset Models
            </button>
            <button 
               onClick={() => {
                setSettingsTab('custom');
                setAiConfig(prev => ({ 
                  ...prev, 
                  useCustom: true,
                  // Default to safe model if empty
                  customModelName: prev.customModelName || 'gemini-2.5-flash' 
                }));
                setConnectionStatus('idle');
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2
                ${settingsTab === 'custom' 
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5' 
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Server size={16} /> Custom Connection
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto">
            {settingsTab === 'preset' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-2">Choose a pre-configured Gemini model.</p>
                {PRESET_MODELS.map((model) => (
                  <div 
                    key={model.id}
                    onClick={() => setAiConfig(prev => ({ ...prev, selectedPresetId: model.id }))}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3
                      ${aiConfig.selectedPresetId === model.id 
                        ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' 
                        : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'}`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-1 flex-shrink-0 flex items-center justify-center
                      ${aiConfig.selectedPresetId === model.id ? 'border-brand-600 bg-brand-600' : 'border-gray-300 bg-white'}`}>
                      {aiConfig.selectedPresetId === model.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${aiConfig.selectedPresetId === model.id ? 'text-brand-900' : 'text-gray-900'}`}>
                        {model.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {model.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-700 leading-relaxed mb-4">
                    Connect to any Gemini or OpenAI-compatible API. 
                    <br/>For DeepSeek/Local Models, select "OpenAI Compatible".
                 </div>

                 {/* Provider Selector */}
                 <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                       <Zap size={16} className="text-gray-400" />
                       API Provider Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setAiConfig(prev => ({ ...prev, provider: 'gemini' }))}
                          className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${aiConfig.provider === 'gemini' 
                               ? 'border-brand-500 bg-brand-50 text-brand-700' 
                               : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                        >
                           Google Gemini
                        </button>
                        <button 
                          onClick={() => setAiConfig(prev => ({ ...prev, provider: 'openai' }))}
                          className={`p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${aiConfig.provider === 'openai' 
                               ? 'border-brand-500 bg-brand-50 text-brand-700' 
                               : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                        >
                           OpenAI Compatible
                        </button>
                    </div>
                 </div>

                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                     <LinkIcon size={16} className="text-gray-400" />
                     Base URL (请求地址)
                   </label>
                   <input 
                      type="text"
                      value={aiConfig.customBaseUrl || ''}
                      onChange={(e) => {
                          setAiConfig(prev => ({...prev, customBaseUrl: e.target.value}));
                          setConnectionStatus('idle');
                      }}
                      placeholder={aiConfig.provider === 'openai' ? "https://api.deepseek.com/v1" : "https://generativelanguage.googleapis.com"}
                      className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                     <KeyRound size={16} className="text-gray-400" />
                     API Key
                   </label>
                   <input 
                      type="password"
                      value={aiConfig.customApiKey || ''}
                      onChange={(e) => {
                          setAiConfig(prev => ({...prev, customApiKey: e.target.value}));
                          setConnectionStatus('idle');
                      }}
                      placeholder="Paste your API Key"
                      className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                     <MessageSquareText size={16} className="text-gray-400" />
                     Model Name
                   </label>
                   <input 
                      type="text"
                      value={aiConfig.customModelName || ''}
                      onChange={(e) => {
                          setAiConfig(prev => ({...prev, customModelName: e.target.value}));
                          setConnectionStatus('idle');
                      }}
                      placeholder={aiConfig.provider === 'openai' ? "deepseek-chat" : "gemini-2.5-flash"}
                      className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                   />
                 </div>
                 
                 {/* Test Connection Button */}
                 <div className="pt-2 flex items-center justify-between">
                    <button 
                        onClick={handleTestConnection}
                        disabled={connectionStatus === 'testing'}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-brand-600 hover:border-brand-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
                    >
                        {connectionStatus === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <PlugZap size={16} />}
                        Test Connection
                    </button>
                    
                    {connectionStatus === 'success' && (
                        <span className="text-green-600 text-sm font-medium flex items-center gap-1 animate-fade-in">
                            <CheckCircle2 size={16} /> Connected Successfully!
                        </span>
                    )}
                    
                    {connectionStatus === 'error' && (
                        <span className="text-red-500 text-sm font-medium flex items-center gap-1 animate-fade-in">
                            <XCircle size={16} /> Connection Failed
                        </span>
                    )}
                 </div>
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button 
              onClick={() => setShowSettings(false)}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
            >
              Save & Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInputSource = () => (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        
        {/* AI Generator Section */}
        <div className="mb-8 p-5 bg-brand-50 rounded-xl border border-brand-100">
           <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-brand-600" />
              <span className="text-sm font-bold text-brand-800">No text? Let AI generate one for you</span>
           </div>
           <div className="grid grid-cols-2 gap-3 mb-3">
              <select 
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="p-2 rounded-lg border border-brand-200 text-sm text-gray-700 focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select 
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="p-2 rounded-lg border border-brand-200 text-sm text-gray-700 focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
           </div>
           <button 
              onClick={handleGenerateRandomText}
              disabled={isGeneratingContent}
              className="w-full py-2 bg-white border border-brand-200 text-brand-700 font-medium rounded-lg hover:bg-brand-100 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
           >
              {isGeneratingContent ? <Loader2 size={16} className="animate-spin" /> : <Dices size={16} />}
              {isGeneratingContent ? 'Generating...' : 'Generate Random Text'}
           </button>
        </div>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-widest">OR PASTE YOUR OWN</span>
            <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <FileText size={18} className="text-gray-400" />
            English Source Text
            </label>
            <textarea
            className="w-full h-48 p-4 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none resize-none text-lg font-serif leading-relaxed placeholder:text-gray-300 placeholder:font-sans transition-all"
            placeholder="Paste English text here, or generate it above..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            />
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleStartPractice}
            disabled={!sourceText.trim()}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 shadow-md shadow-brand-200"
          >
            Generate Exercise
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPractice = () => (
    <div className="max-w-4xl mx-auto animate-fade-in flex flex-col gap-6">
      {/* Target Language Card */}
      <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Languages size={120} className="text-indigo-500" />
        </div>
        <div className="relative z-10">
          <h3 className="text-indigo-900 font-semibold text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Translate back to English
          </h3>
          <p className="text-2xl font-serif text-indigo-950 leading-relaxed">
            {translatedText}
          </p>
        </div>
      </div>

      {/* User Input Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <PenToolIcon />
          Your English Translation
        </label>
        <textarea
          className="w-full h-48 p-4 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none resize-none text-lg font-serif leading-relaxed transition-all"
          placeholder="Type your English translation here..."
          value={backTranslation}
          onChange={(e) => setBackTranslation(e.target.value)}
        />
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmitBackTranslation}
            disabled={!backTranslation.trim()}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-md shadow-brand-100"
          >
            Analyze My Translation
            <Sparkles size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderLoading = (message: string) => (
    <div className="max-w-md mx-auto text-center py-20 animate-pulse">
      <div className="w-16 h-16 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-6"></div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing...</h3>
      <p className="text-gray-500">{message}</p>
    </div>
  );

  const renderResults = () => {
    if (!analysis) return null;

    return (
      <div className="max-w-5xl mx-auto animate-fade-in pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2">
            {/* Score Header */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 mb-8 flex flex-col md:flex-row gap-8 items-center">
            <div className="relative flex-shrink-0">
                <div className="w-32 h-32 rounded-full bg-brand-50 flex items-center justify-center border-4 border-brand-100">
                <span className="text-4xl font-bold text-brand-700">{analysis.score}</span>
                </div>
                {analysis.score >= 90 && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-sm border border-yellow-200">
                    EXCELLENT
                </div>
                )}
            </div>
            <div className="flex-grow text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Feedback Summary</h2>
                <p className="text-gray-600 leading-relaxed mb-4">{analysis.summary}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {analysis.strengths.map((str, i) => (
                    <span key={i} className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 border border-green-100">
                    <Check size={14} /> {str}
                    </span>
                ))}
                </div>
            </div>
            </div>

            {/* Comparison Columns */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Original English</h4>
                <div className="prose prose-gray">
                <p className="font-serif text-gray-800 leading-relaxed">{sourceText}</p>
                </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 relative">
                <h4 className="text-sm font-semibold text-brand-600 uppercase tracking-wider mb-4">Your Version</h4>
                <div className="prose prose-gray">
                <p className="font-serif text-gray-800 leading-relaxed">{backTranslation}</p>
                </div>
            </div>
            </div>

            {/* Detailed Improvements */}
            <div className="space-y-6 mb-12">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="text-orange-500" />
                    Key Improvements
                </h3>
                
                {analysis.improvements.length === 0 ? (
                    <div className="p-8 bg-green-50 rounded-xl text-center border border-green-100">
                        <p className="text-green-800 font-medium">Great job! No major improvements found.</p>
                    </div>
                ) : (
                    analysis.improvements.map((item, idx) => {
                      const isSaved = recentlySavedVocab.includes(item.betterAlternative);
                      return (
                        <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="grid md:grid-cols-12 gap-0">
                                {/* Left: The Change */}
                                <div className="md:col-span-5 bg-gray-50 p-6 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-center relative group">
                                    <div className="mb-4">
                                        <span className="text-xs font-bold text-red-500 uppercase mb-1 block">You Wrote</span>
                                        <p className="text-gray-800 font-medium underline decoration-red-500 decoration-wavy decoration-2 underline-offset-4 leading-relaxed">{item.userVersion}</p>
                                        {/* NATIVE MEANING DISPLAYED HERE */}
                                        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{item.meaning}</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-start">
                                          <span className="text-xs font-bold text-green-600 uppercase mb-1 block">Better Alternative</span>
                                          <button 
                                            onClick={() => !isSaved && addToVocabulary(item)}
                                            disabled={isSaved}
                                            className={`p-1 rounded-md transition-colors ${isSaved ? 'text-brand-600' : 'text-gray-400 hover:text-brand-600 hover:bg-brand-100'}`}
                                            title="Save to Vocabulary"
                                          >
                                            {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                                          </button>
                                        </div>
                                        <p className="text-gray-900 font-medium bg-green-100 inline-block px-1 rounded">{item.betterAlternative}</p>
                                    </div>
                                </div>
                                
                                {/* Right: The Reason */}
                                <div className="md:col-span-7 p-6 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border
                                            ${item.type === 'grammar' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                            item.type === 'vocabulary' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                                            item.type === 'style' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                            'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {item.type}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                                        <span className="font-semibold text-gray-900">Why? </span>
                                        {item.reason}
                                    </p>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-500 italic">
                                            <span className="font-semibold not-italic text-gray-600">Original Context: </span>
                                            "...{item.segment}..."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )})
                )}
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4 mt-12">
                <button 
                    onClick={handleTryAgainSameText}
                    className="px-6 py-3 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                    <RotateCcw size={18} />
                    Retry Same Text
                </button>
                <button 
                    onClick={handleReset}
                    className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-brand-100"
                >
                    New Practice
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
        
        {/* Sidebar: Coach Chat */}
        <div className="lg:col-span-1">
           <div className="sticky top-28 transition-all duration-300">
              <CoachChat 
                contextData={`Original: ${sourceText}\nUser Back-Translation: ${backTranslation}\nAnalysis Score: ${analysis.score}\nAnalysis Summary: ${analysis.summary}`} 
                config={aiConfig}
              />
           </div>
        </div>
      </div>
    );
  };

  // Icons
  const PenToolIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-brand-100 selection:text-brand-900" ref={topRef}>
      {renderHeader()}
      {renderSettingsModal()}
      <LibraryModal 
         isOpen={showLibrary}
         onClose={() => setShowLibrary(false)}
         history={history}
         vocabulary={vocabulary}
         onDeleteHistory={deleteHistory}
         onDeleteVocabulary={deleteVocabulary}
         onImportData={handleImportData}
      />
      
      <main className="px-6 pb-12">
        <StepIndicator currentStep={step} />
        
        {error && (
          <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {step === AppStep.INPUT_SOURCE && renderInputSource()}
        
        {step === AppStep.TRANSLATING_TO_TARGET && renderLoading(`Translating your text to ${LANGUAGES.find(l => l.id === nativeLanguage)?.label.split('(')[0] || nativeLanguage}...`)}
        
        {step === AppStep.PRACTICE_BACK_TRANSLATION && renderPractice()}
        
        {step === AppStep.ANALYZING && renderLoading("Analyzing your back-translation against the original...")}
        
        {step === AppStep.RESULTS && renderResults()}
      </main>
    </div>
  );
};

export default App;
