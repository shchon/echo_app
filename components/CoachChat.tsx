
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles } from 'lucide-react';
import { getCoachResponse } from '../services/geminiService';
import { ChatMessage, AIConfig } from '../types';

interface CoachChatProps {
  contextData: string;
  config: AIConfig;
}

const CoachChat: React.FC<CoachChatProps> = ({ contextData, config }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: "Hi! I'm your AI Tutor. Do you have any questions about your score or the corrections above?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await getCoachResponse(contextData, userMsg.text, config);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Sorry, I encountered an error. Please check your settings and try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white flex items-center gap-2">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm">AI Tutor</h3>
          <p className="text-xs text-brand-100 opacity-90">Ask about grammar, style, or vocabulary</p>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 border border-brand-200">
                <Sparkles size={14} className="text-brand-600" />
              </div>
            )}
            
            <div 
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-brand-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-700 border border-gray-200 rounded-tl-none'
                }`}
            >
              {msg.text}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-gray-500" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center border border-brand-200">
               <Sparkles size={14} className="text-brand-600" />
            </div>
            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
              <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your question here..."
            className="flex-grow px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-400 transition-all text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachChat;
