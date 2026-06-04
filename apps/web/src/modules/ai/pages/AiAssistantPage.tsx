import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Send, Loader2, Bot, User } from 'lucide-react';
import { api } from '@/services/api/client.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import type { ApiResponse } from '@wanderlog/shared';

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}


export default function AiAssistantPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI travel assistant. I can help you optimise your itinerary, find gaps in your schedule, suggest activities, and generate a packing list. What would you like help with?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: AiMessage = { role: 'user', content, timestamp: new Date() };
    setMessages((m) => [...m, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Route to appropriate AI endpoint based on intent
      let response: string;

      if (content.toLowerCase().includes('packing') || content.toLowerCase().includes('pack')) {
        const res = await api.post<ApiResponse<{ list: string }>>(`/trips/${tripId}/ai/packing-list`);
        response = typeof res.data.list === 'string' ? res.data.list : JSON.stringify(res.data.list);
      } else if (content.toLowerCase().includes('gap') || content.toLowerCase().includes('analyse') || content.toLowerCase().includes('analyze')) {
        const res = await api.post<ApiResponse<{ suggestion: string }>>(`/trips/${tripId}/ai/find-gaps`);
        response = res.data.suggestion;
      } else {
        const res = await api.post<ApiResponse<{ suggestion: string }>>(`/trips/${tripId}/ai/suggest-activities`, { query: content });
        response = res.data.suggestion;
      }

      setMessages((m) => [...m, { role: 'assistant', content: response, timestamp: new Date() }]);
    } catch {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: 'I\'m sorry, I couldn\'t process that request. Please check your AI configuration or try again later.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickActions = [
    { label: 'Find itinerary gaps', prompt: 'Analyse my itinerary and find any gaps or missing elements' },
    { label: 'Generate packing list', prompt: 'Generate a comprehensive packing list for this trip' },
    { label: 'Suggest restaurants', prompt: 'Suggest some great restaurants near my planned locations' },
    { label: 'Tips & warnings', prompt: 'What are important travel tips and things to watch out for at my destinations?' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">AI Travel Assistant</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Powered by your configured AI provider</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant'
                ? 'bg-gradient-to-br from-amber-400 to-orange-600'
                : 'bg-brand-600'
            }`}>
              {msg.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'assistant'
                ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                : 'bg-brand-600 text-white'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 py-3 border-t border-slate-100 dark:border-slate-800">
          {quickActions.map(({ label, prompt }) => (
            <button
              key={label}
              onClick={() => sendMessage(prompt)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <input
          className="input flex-1"
          placeholder="Ask anything about your trip..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          disabled={isTyping}
        />
        <Button
          variant="primary"
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
        >
          {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
