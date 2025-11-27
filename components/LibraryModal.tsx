
import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, BookOpen, History as HistoryIcon, Search, ArrowUpRight, Calendar, PlayCircle, RotateCw, ChevronLeft, ChevronRight, CheckCircle2, Lightbulb, Download, Upload, CloudUpload, CloudDownload } from 'lucide-react';
import { HistoryItem, VocabularyItem, WebDavConfig } from '../types';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  vocabulary: VocabularyItem[];
  onDeleteHistory: (id: string) => void;
  onDeleteVocabulary: (id: string) => void;
  onImportData?: (history: HistoryItem[], vocabulary: VocabularyItem[]) => void;
  webdavConfig?: WebDavConfig;
}

const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  history,
  vocabulary,
  onDeleteHistory,
  onDeleteVocabulary,
  onImportData,
  webdavConfig
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'vocabulary'>('vocabulary');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Review Mode State
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewInput, setReviewInput] = useState('');

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset review state when modal opens or tab changes
  useEffect(() => {
    if (!isOpen) {
      setIsReviewMode(false);
      setIsFlipped(false);
      setReviewIndex(0);
    }
  }, [isOpen]);

  // Handle Escape key to close modal or exit review mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        if (isReviewMode) {
          exitReview();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isReviewMode, onClose]);

  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredHistory = history.filter(h => 
    h.sourceText.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVocabulary = vocabulary.filter(v => 
    v.original.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.better.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Review Handlers
  const startReview = () => {
    if (filteredVocabulary.length === 0) return;
    setIsReviewMode(true);
    setReviewIndex(0);
    setIsFlipped(false);
    setReviewInput('');
  };

  const exitReview = () => {
    setIsReviewMode(false);
    setIsFlipped(false);
    setReviewInput('');
  };

  const nextCard = () => {
    setIsFlipped(false);
    setReviewIndex((prev) => (prev + 1) % filteredVocabulary.length);
    setReviewInput('');
  };

  const prevCard = () => {
    setIsFlipped(false);
    setReviewIndex((prev) => (prev - 1 + filteredVocabulary.length) % filteredVocabulary.length);
    setReviewInput('');
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const deleteCurrentCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentCard = filteredVocabulary[reviewIndex];
    if (!currentCard) return;

    // Logic to handle index when deleting
    if (filteredVocabulary.length <= 1) {
      // If it's the last card, exit review
      exitReview();
    } else if (reviewIndex >= filteredVocabulary.length - 1) {
      // If deleting the last item in the array, move index back
      setReviewIndex(prev => Math.max(0, prev - 1));
    }
    // If deleting a middle item, the index stays same (pointing to the next item)

    onDeleteVocabulary(currentCard.id);
    setIsFlipped(false); // Reset flip state for the "next" card
    setReviewInput('');
  };

  const canUseWebDav = webdavConfig?.enabled && webdavConfig.url && webdavConfig.username && webdavConfig.password;

  // Export / Import Handlers - local file backup
  const handleExport = () => {
    const data = {
      history,
      vocabulary,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `echoloop_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Basic validation
        if (data.history && Array.isArray(data.history) && data.vocabulary && Array.isArray(data.vocabulary)) {
          if (onImportData) {
            onImportData(data.history, data.vocabulary);
            alert('Backup imported successfully!');
          }
        } else {
          alert('Invalid file format. Please select a valid EchoLoop backup file.');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to parse the file.');
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleSyncUpload = async () => {
    const confirmed = window.confirm('警告：是否上传到 WebDAV？');
    if (!confirmed) return;

    if (!canUseWebDav || !webdavConfig) {
      alert('WebDAV is not fully configured. Please check settings.');
      return;
    }

    try {
      const payload = {
        action: 'push',
        webdav: {
          url: webdavConfig.url,
          username: webdavConfig.username,
          password: webdavConfig.password
        },
        data: {
          history,
          vocabulary,
          exportDate: new Date().toISOString(),
          version: '1.0'
        }
      };

      const response = await fetch('/api/webdav-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'WebDAV upload failed');
      }
      alert('Synced to WebDAV successfully.');
    } catch (err) {
      console.error('WebDAV upload error:', err);
      alert('Failed to sync to WebDAV. Please check your settings and network.');
    }
  };

  const handleSyncDownload = async () => {
    const confirmed = window.confirm('警告：覆盖本地数据？');
    if (!confirmed) return;

    if (!canUseWebDav || !webdavConfig) {
      alert('WebDAV is not fully configured. Please check settings.');
      return;
    }

    try {
      const payload = {
        action: 'pull',
        webdav: {
          url: webdavConfig.url,
          username: webdavConfig.username,
          password: webdavConfig.password
        }
      };

      const response = await fetch('/api/webdav-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'WebDAV download failed');
      }

      const json = await response.json();
      const data = json.data;

      if (data && data.history && Array.isArray(data.history) && data.vocabulary && Array.isArray(data.vocabulary)) {
        if (onImportData) {
          onImportData(data.history, data.vocabulary);
        }
        alert('Synced from WebDAV successfully.');
      } else {
        alert('Invalid WebDAV file format.');
      }
    } catch (err) {
      console.error('WebDAV download error:', err);
      alert('Failed to sync from WebDAV. Please check your settings and network.');
    }
  };

  const renderReviewMode = () => {
    const currentCard = filteredVocabulary[reviewIndex];
    
    // Safety check if card was deleted or list changed
    if (!currentCard) {
        if (filteredVocabulary.length > 0) {
            setReviewIndex(0);
            return null; // Rerender will fix
        } else {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 animate-fade-in">
                    <CheckCircle2 size={64} className="mb-6 text-green-500" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">All Mastered!</h3>
                    <p className="mb-8 text-gray-500">You've reviewed and mastered all your vocabulary words.</p>
                    <button 
                        onClick={exitReview} 
                        className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium"
                    >
                        Back to Library
                    </button>
                </div>
            );
        }
    }

    const progress = ((reviewIndex + 1) / filteredVocabulary.length) * 100;

    return (
      <div className="flex flex-col h-full items-center justify-start p-4 sm:p-6 animate-fade-in relative overflow-y-auto">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
          <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="w-full max-w-2xl flex justify-between items-center mb-4 sm:mb-6 mt-2 sm:mt-4">
          <button onClick={exitReview} className="text-gray-500 hover:text-gray-800 flex items-center gap-2 text-sm font-medium">
            <ChevronLeft size={16} /> Back to List
          </button>
          
          <div className="flex items-center gap-4">
              <button 
                onClick={deleteCurrentCard}
                className="text-green-600 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 border border-green-200 shadow-sm"
                title="Mark as Mastered (Delete from list)"
              >
                <CheckCircle2 size={18} />
                <span>Mastered</span>
              </button>
              <span className="text-gray-400 font-mono text-sm">
                {reviewIndex + 1} / {filteredVocabulary.length}
              </span>
          </div>
        </div>

        {/* Flashcard */}
        <div 
          className="w-full max-w-xl min-h-[360px] sm:min-h-[430px] perspective-1000 group"
        >
          <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front (Question) */}
            {!isFlipped && (
              <div className="absolute inset-0 bg-white rounded-3xl shadow-xl border-2 border-gray-100 flex flex-col items-center justify-center p-6 sm:p-10 text-center hover:border-brand-200 transition-colors overflow-y-auto">
                 {/* Native meaning same size as English */}
                 {currentCard.meaning && (
                    <p className="text-base text-gray-800 font-serif mb-2 sm:mb-3 leading-relaxed">
                      {currentCard.meaning}
                    </p>
                 )}

                 {/* Original English */}
                 <p className="text-base text-gray-700 font-serif mb-2 sm:mb-3 underline decoration-red-400 decoration-wavy decoration-2 underline-offset-4 leading-relaxed">
                  {currentCard.original}
                 </p>
                 
                 {/* User input area */}
                 <textarea
                   value={reviewInput}
                   onChange={(e) => setReviewInput(e.target.value)}
                   placeholder="Type your own sentence or notes here..."
                   className="mt-4 w-full min-h-[80px] rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 resize-none"
                 />
              </div>
            )}

            {/* Back (Answer) */}
            {isFlipped && (
              <div className="absolute inset-0 bg-brand-600 rounded-3xl shadow-xl flex flex-col items-center justify-start p-6 sm:p-10 text-center text-white">
                 <p className="text-xl sm:text-2xl font-serif font-medium leading-snug mb-3">
                   {currentCard.better}
                 </p>

                 {/* Scrollable content area for user's answer + explanation */}
                 <div className="mt-2 sm:mt-4 w-full max-w-lg text-left max-h-[260px] sm:max-h-[320px] overflow-y-auto space-y-4">
                   {/* User's input echo */}
                   {reviewInput && (
                     <div className="w-full">
                       <p className="text-[11px] uppercase tracking-wide text-brand-100 mb-1 font-semibold">Your answer</p>
                       <p className="text-sm text-brand-50 bg-white/10 rounded-2xl px-3 py-2 leading-relaxed break-words">
                         {reviewInput}
                       </p>
                     </div>
                   )}
                   
                   {/* Explanation / Hint moved to back and fully shown */}
                   <div className="p-5 bg-white/10 rounded-xl border border-white/20 w-full">
                      <p className="text-brand-100 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Lightbulb size={14} /> Explanation
                      </p>
                      <p className="text-white text-sm leading-relaxed font-medium opacity-95">
                          {currentCard.reason}
                      </p>
                   </div>
                 </div>

                 <p className="mt-4 sm:mt-6 text-brand-200 text-xs font-medium">Click for next card</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 sm:gap-6 mt-6 sm:mt-8 mb-2 sm:mb-0">
          <button 
            onClick={(e) => { e.stopPropagation(); prevCard(); }}
            className="p-4 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-brand-600 transition-colors shadow-sm"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); toggleFlip(); }}
            className="px-8 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <RotateCw size={18} className={isFlipped ? 'rotate-180 transition-transform duration-300' : ''} />
            {isFlipped ? 'See Question' : 'Show Answer'}
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); nextCard(); }}
            className="p-4 rounded-full bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-brand-600 transition-colors shadow-sm"
          >
            <ChevronRight size={24} />
          </button>
        </div>

      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] sm:h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header - Only show standard header if not in review mode */}
        {!isReviewMode && (
          <>
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3 sm:gap-4">
                <button 
                  onClick={onClose}
                  className="mr-1 sm:mr-2 flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">My Library</h3>
                <div className="flex bg-white rounded-lg p-0.5 sm:p-1 border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setActiveTab('vocabulary')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2
                      ${activeTab === 'vocabulary' ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <BookOpen size={16} /> V
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                  {/* WebDAV Sync Buttons (fallback to local backup when disabled) */}
                  {canUseWebDav ? (
                    <>
                      <button 
                        onClick={handleSyncDownload}
                        className="text-gray-500 hover:text-brand-600 hover:bg-brand-50 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1"
                        title="从 WebDAV 拉取（Pull）——云端数据将覆盖当前本地数据"
                      >
                        <CloudDownload size={18} />
                        <span className="hidden sm:inline text-xs font-medium">Pull</span>
                      </button>
                      <button 
                        onClick={handleSyncUpload}
                        className="text-gray-500 hover:text-brand-600 hover:bg-brand-50 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1"
                        title="推送到 WebDAV（Push）——当前本地数据将覆盖云端文件"
                      >
                        <CloudUpload size={18} />
                        <span className="hidden sm:inline text-xs font-medium">Push</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleExport}
                        className="text-gray-500 hover:text-brand-600 hover:bg-brand-50 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1"
                        title="Download Backup"
                      >
                        <Download size={18} />
                        <span className="hidden sm:inline text-xs font-medium">Export</span>
                      </button>
                      <button 
                        onClick={handleImportClick}
                        className="text-gray-500 hover:text-brand-600 hover:bg-brand-50 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center gap-1"
                        title="Import Backup"
                      >
                        <Upload size={18} />
                        <span className="hidden sm:inline text-xs font-medium">Import</span>
                      </button>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleFileChange}
                  />
              </div>
            </div>

            {/* Search & Actions Bar */}
            <div className="px-4 py-3 sm:p-4 border-b border-gray-100 bg-white flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-between">
              <div className="relative w-full md:w-auto flex-grow max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 sm:pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-all text-sm"
                />
              </div>
              
              {activeTab === 'vocabulary' && filteredVocabulary.length > 0 && (
                <button 
                  onClick={startReview}
                  className="w-full md:w-auto px-4 sm:px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-md shadow-brand-100"
                >
                  <PlayCircle size={16} />
                  Start Review
                </button>
              )}
            </div>
          </>
        )}

        {/* Content */}
        <div className="flex-grow overflow-y-auto bg-gray-50">
          
          {/* Render Review Mode if Active */}
          {isReviewMode ? (
            renderReviewMode()
          ) : (
            <div className="p-4 sm:p-6">
              {/* Vocabulary Tab */}
              {activeTab === 'vocabulary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {filteredVocabulary.length === 0 ? (
                    <div className="col-span-full text-center py-12 sm:py-20 text-gray-400">
                      <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
                      <p>No vocabulary saved yet.</p>
                      <p className="text-sm mt-2">Save improvements from your practice results to see them here.</p>
                    </div>
                  ) : (
                    filteredVocabulary.map(item => (
                      <div key={item.id} className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative">
                        <button 
                            onClick={() => onDeleteVocabulary(item.id)}
                            className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove word"
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs text-gray-400">{formatDate(item.timestamp)}</span>
                          </div>

                          <div className="space-y-3">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                  <span className="text-xs font-bold text-gray-400 uppercase">Your Usage</span>
                                </div>
                                <p className="text-gray-800 font-medium line-through decoration-red-200">{item.original}</p>
                                {item.meaning && <p className="text-xs text-gray-400 mt-1">{item.meaning}</p>}
                            </div>
                            
                            <div className="flex justify-center">
                                <ArrowUpRight size={16} className="text-gray-300" />
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  <span className="text-xs font-bold text-brand-600 uppercase">Better Alternative</span>
                                </div>
                                <p className="text-lg font-bold text-brand-700">{item.better}</p>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-600">{item.reason}</p>
                          </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryModal;
