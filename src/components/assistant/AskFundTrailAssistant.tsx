import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Loader2,
  Radio
} from 'lucide-react';
import {
  AssistantLanguage,
  AssistantMessage,
  AssistantContext,
  resolveProjectQuestion,
  AudioRecorderService,
  transcribeAudioWithGemini,
  playOrSpeakResponse,
  stopCurrentAudioPlayback
} from '../../lib/voice-assistant';

interface AskFundTrailAssistantProps {
  context: AssistantContext;
}

type VoiceState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'speaking'
  | 'error';

export const AskFundTrailAssistant: React.FC<AskFundTrailAssistantProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<AssistantLanguage>('en');
  const [inputQuery, setInputQuery] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to listen');
  const [micError, setMicError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

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
  const recorderRef = useRef<AudioRecorderService | null>(null);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    recorderRef.current = new AudioRecorderService();
    return () => {
      stopCurrentAudioPlayback();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
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

  const handleSendMessage = (textToSend?: string, shouldAutoSpeak = false) => {
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
    const asstMsgId = `asst-${Date.now() + 1}`;

    const assistantMsg: AssistantMessage = {
      id: asstMsgId,
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
    if (shouldAutoSpeak) {
      playAssistantAudio(asstMsgId, resolved.text, lang);
    }
  };

  const playAssistantAudio = (msgId: string, text: string, msgLang: AssistantLanguage) => {
    if (speakingMessageId === msgId) {
      // Toggle stop
      stopCurrentAudioPlayback();
      setSpeakingMessageId(null);
      setVoiceState('idle');
      setStatusMessage('Ready to listen');
      return;
    }

    setSpeakingMessageId(msgId);
    setVoiceState('speaking');
    setStatusMessage(msgLang === 'hi' ? 'उत्तर बोल रहा हूँ...' : 'Speaking...');

    playOrSpeakResponse(text, msgLang, {
      onStart: () => {
        setVoiceState('speaking');
        setStatusMessage(msgLang === 'hi' ? 'उत्तर बोल रहा हूँ...' : 'Speaking...');
      },
      onEnd: () => {
        setSpeakingMessageId(null);
        setVoiceState('idle');
        setStatusMessage('Ready to listen');
      },
      onError: (err) => {
        setSpeakingMessageId(null);
        setVoiceState('idle');
        setStatusMessage('Voice playback completed');
      }
    });
  };

  const toggleRecording = async () => {
    setMicError(null);

    // If currently speaking, stop it
    if (speakingMessageId) {
      stopCurrentAudioPlayback();
      setSpeakingMessageId(null);
    }

    // Stop recording if active
    if (voiceState === 'recording') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setVoiceState('processing');
      setStatusMessage(lang === 'hi' ? 'आवाज़ पहचानी जा रही है (Gemini STT)...' : 'Processing voice with Gemini...');

      try {
        const audioBlob = await recorderRef.current!.stopRecording();
        if (audioBlob.size < 500) {
          setVoiceState('idle');
          setStatusMessage('Ready to listen');
          setMicError(lang === 'hi' ? 'आवाज़ रिकॉर्ड नहीं हुई। कृपया दोबारा बोलें।' : 'Empty recording. Please try speaking again.');
          return;
        }

        const { text } = await transcribeAudioWithGemini(audioBlob, lang);
        if (!text.trim()) {
          setVoiceState('idle');
          setStatusMessage('Ready to listen');
          setMicError(lang === 'hi' ? 'कोई सवाल स्पष्ट नहीं सुनाई दिया।' : 'No clear question was recognized.');
          return;
        }

        setStatusMessage(lang === 'hi' ? 'सवाल पहचान लिया गया' : 'Question recognized');
        handleSendMessage(text, true);
      } catch (err: any) {
        setVoiceState('error');
        const errStr = err.message || 'Transcription error';
        if (errStr.includes('GEMINI_API_KEY') || errStr.includes('pending configuration')) {
          setMicError(lang === 'hi' ? 'Gemini Voice सेवा सर्वर पर कॉन्फ़िगर हो रही है।' : 'Gemini Voice service pending server configuration.');
        } else {
          setMicError(errStr);
        }
        setTimeout(() => {
          setVoiceState('idle');
          setStatusMessage('Ready to listen');
        }, 4000);
      }
      return;
    }

    // Start recording
    if (!AudioRecorderService.isSupported()) {
      setMicError(
        lang === 'hi'
          ? 'आपके ब्राउज़र में माइक्रोफ़ोन रिकॉर्डिंग समर्थित नहीं है।'
          : 'Microphone recording is not supported in this browser.'
      );
      return;
    }

    try {
      setRecordingSeconds(0);
      await recorderRef.current!.startRecording(20, async () => {
        // Timeout callback after 20s
        toggleRecording();
      });

      setVoiceState('recording');
      setStatusMessage(lang === 'hi' ? 'सुन रहा हूँ... (बोलना समाप्त होने पर माइक दबाएं)' : 'Listening... (Tap mic when done)');

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 19) {
            clearInterval(timerIntervalRef.current);
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setVoiceState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError(
          lang === 'hi'
            ? 'माइक्रोफ़ोन की अनुमति अस्वीकृत की गई। कृपया ब्राउज़र सेटिंग्स में अनुमति दें।'
            : 'Microphone permission denied. Please allow microphone access.'
        );
      } else {
        setMicError(err.message || 'Could not access microphone.');
      }
      setTimeout(() => {
        setVoiceState('idle');
        setStatusMessage('Ready to listen');
      }, 4000);
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
                      onClick={() => playAssistantAudio(m.id, m.text, m.language)}
                      className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium transition rounded-md px-2 py-1 ${
                        speakingMessageId === m.id
                          ? 'bg-emerald-100 text-emerald-800 font-semibold animate-pulse'
                          : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-100'
                      }`}
                      title={speakingMessageId === m.id ? 'Stop audio' : 'Listen with Google Gemini Voice'}
                    >
                      {speakingMessageId === m.id ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{lang === 'hi' ? 'रोकें (Stop)' : 'Stop'}</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{lang === 'hi' ? 'उत्तर सुनें' : 'Listen'}</span>
                        </>
                      )}
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
            {/* Voice Status Pill */}
            {(voiceState !== 'idle' || (statusMessage && statusMessage !== 'Ready to listen')) && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5">
                  {voiceState === 'recording' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                  {voiceState === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-amber-600" />}
                  {voiceState === 'speaking' && <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />}
                  <span className="font-medium">{statusMessage}</span>
                </span>
                {voiceState === 'recording' && (
                  <button
                    onClick={toggleRecording}
                    className="text-[10px] uppercase font-bold text-rose-600 hover:underline"
                  >
                    Done
                  </button>
                )}
              </div>
            )}

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
                  className="w-full pl-3.5 pr-12 py-2.5 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-emerald-500 focus:outline-none transition"
                />

                {/* Mic Button with MediaRecorder & Gemini Voice */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={voiceState === 'processing'}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition ${
                    voiceState === 'recording'
                      ? 'bg-rose-500 text-white animate-pulse shadow-md'
                      : voiceState === 'processing'
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-200'
                  }`}
                  title={
                    voiceState === 'recording'
                      ? `Recording (${recordingSeconds}s)... Tap to stop`
                      : voiceState === 'processing'
                      ? 'Transcribing audio with Gemini...'
                      : 'Speak your question'
                  }
                >
                  {voiceState === 'recording' ? (
                    <div className="flex items-center gap-1">
                      <MicOff className="w-4 h-4 text-white" />
                      <span className="text-[10px] font-bold font-mono text-white pr-0.5">{recordingSeconds}s</span>
                    </div>
                  ) : voiceState === 'processing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputQuery.trim() || voiceState === 'processing'}
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
              <span>Google Gemini Voice</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

