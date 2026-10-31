import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Globe2
} from 'lucide-react';
import {
  AssistantLanguage,
  AssistantMessage,
  AssistantContext,
  resolveProjectQuestion,
  SpeechRecognitionService,
  speakText
} from '../../lib/voice-assistant';

interface AskFundTrailAssistantProps {
  context: AssistantContext;
}

export const AskFundTrailAssistant: React.FC<AskFundTrailAssistantProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<AssistantLanguage>('en');
  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text:
        lang === 'hi'
          ? `नमस्ते! मैं FundTrail का वॉयस एवं टेक्स्ट सहायक हूँ। आप मुझसे इस प्रोजेक्ट के वित्तीय विवरण, खर्चों के बिल, माइलस्टोन्स या डिलीवरी पावती (Proof of Delivery) के बारे में कोई भी सवाल पूछ सकते हैं।`
          : `Hello! I'm Ask FundTrail, your multilingual voice & transparency assistant. Ask me anything about this project's recorded donations, expenditures, invoice evidence, or Proof of Delivery acknowledgements.`,
      language: lang,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechServiceRef = useRef<SpeechRecognitionService | null>(null);

  useEffect(() => {
    speechServiceRef.current = new SpeechRecognitionService();
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Update greeting when language changes if only the welcome message is present
  const handleLanguageChange = (newLang: AssistantLanguage) => {
    setLang(newLang);
    if (messages.length === 1) {
      setMessages([
        {
          id: 'msg-welcome',
          sender: 'assistant',
          text:
            newLang === 'hi'
              ? `नमस्ते! मैं FundTrail का वॉयस एवं टेक्स्ट सहायक हूँ। आप मुझसे इस प्रोजेक्ट के वित्तीय विवरण, खर्चों के बिल, माइलस्टोन्स या डिलीवरी पावती (Proof of Delivery) के बारे में कोई भी सवाल पूछ सकते हैं।`
              : `Hello! I'm Ask FundTrail, your multilingual voice & transparency assistant. Ask me anything about this project's recorded donations, expenditures, invoice evidence, or Proof of Delivery acknowledgements.`,
          language: newLang,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      language: lang,
      timestamp: time
    };

    const resolved = resolveProjectQuestion(query, lang, context);

    const assistantMsg: AssistantMessage = {
      id: `asst-${Date.now() + 1}`,
      sender: 'assistant',
      text: resolved.text,
      language: lang,
      referenceLink: resolved.referenceLink,
      audioAvailable: true,
      timestamp: time
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputQuery('');

    // Optional audio readout
    if (isListening) {
      speakText(resolved.text, lang);
    }
  };

  const toggleSpeechRecognition = () => {
    if (!speechServiceRef.current?.isSupported) {
      setMicError(
        lang === 'hi'
          ? 'आपके ब्राउज़र में वॉयस इनपुट समर्थित नहीं है। कृपया लिखकर सवाल पूछें।'
          : 'Voice input is not supported in this browser. Please type your query.'
      );
      setTimeout(() => setMicError(null), 4000);
      return;
    }

    if (isListening) {
      speechServiceRef.current.stopListening();
      setIsListening(false);
    } else {
      setMicError(null);
      setIsListening(true);
      speechServiceRef.current.startListening(
        lang,
        (transcript) => {
          setInputQuery(transcript);
          handleSendMessage(transcript);
          setIsListening(false);
        },
        (err) => {
          setMicError(err);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );
    }
  };

  const quickPrompts =
    lang === 'hi'
      ? [
          'इस प्रोजेक्ट में कुल कितना पैसा आया और खर्च हुआ?',
          'किन खर्चों के बिल अपलोड हैं?',
          'कितने बच्चों को सामान मिला (Proof of Delivery)?',
          'माइलस्टोन्स की स्थिति क्या है?',
          'क्या यह रिपोर्ट ब्लॉकचेन पर एंकर है?'
        ]
      : [
          'How much money was received and spent?',
          'Which expenses have supporting evidence?',
          'How many deliveries have been acknowledged?',
          'What is the status of milestones?',
          'Is this report anchored on Polygon Amoy?'
        ];

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-full shadow-2xl hover:shadow-emerald-300/50 hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-emerald-400/40"
          title="Ask FundTrail Voice Assistant"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="font-semibold text-sm tracking-wide">
            {lang === 'hi' ? 'Ask FundTrail (सहायक)' : 'Ask FundTrail'}
          </span>
          <span className="bg-emerald-800/80 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md text-emerald-200">
            Voice & AI
          </span>
        </button>
      )}

      {/* Floating Assistant Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[95vw] sm:w-[420px] max-h-[85vh] h-[640px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                  Ask FundTrail
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    FACTUAL
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {lang === 'hi' ? 'सत्यापित रिपोर्ट पर आधारित सहायक' : 'Grounded on published project records'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    lang === 'en' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => handleLanguageChange('hi')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    lang === 'hi' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  हिंदी
                </button>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 rounded-bl-none border border-slate-200/80 shadow-sm'
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Reference Link */}
                  {m.referenceLink && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <a
                        href={`#${m.referenceLink.targetId}`}
                        onClick={() => {
                          const el = document.getElementById(m.referenceLink!.targetId);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="hover:underline"
                      >
                        {m.referenceLink.label}
                      </a>
                    </div>
                  )}

                  {/* Audio Readout Button */}
                  {m.sender === 'assistant' && m.audioAvailable && (
                    <button
                      onClick={() => speakText(m.text, m.language)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-emerald-700 transition"
                      title="Listen to this response"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lang === 'hi' ? 'उत्तर सुनें' : 'Listen'}</span>
                    </button>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {/* Quick Prompt Suggestions */}
            {messages.length <= 3 && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  {lang === 'hi' ? 'सुझाए गए प्रश्न:' : 'Suggested questions:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="text-left text-xs bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 py-1.5 px-2.5 rounded-xl border border-slate-200 transition"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Mic Error Banner */}
          {micError && (
            <div className="bg-amber-50 text-amber-800 text-xs px-4 py-2 border-t border-amber-200 flex items-center justify-between">
              <span>{micError}</span>
              <button onClick={() => setMicError(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Footer Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={
                    lang === 'hi'
                      ? 'सवाल टाइप करें या माइक दबाएं...'
                      : 'Ask a question or tap microphone...'
                  }
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none transition"
                />

                {/* Mic Button */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-200'
                  }`}
                  title={isListening ? 'Stop listening' : 'Speak your question'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputQuery.trim()}
                className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                {lang === 'hi' ? 'शून्य-भ्रम (Zero hallucination)' : 'Zero hallucination guardrail'}
              </span>
              <span>Web Speech API (Bhashini-Ready)</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

