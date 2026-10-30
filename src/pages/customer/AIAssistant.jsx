import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Trash2,
  Mic,
  Paperclip,
  Image as ImageIcon,
  Sparkles,
  Bot,
  User,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const AIAssistant = () => {
  const { darkMode } = useOutletContext();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);

  // States
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [faqQuery, setFaqQuery] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'faqs'

  // Attachment states
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const defaultWelcomeMessage = {
    id: 'msg-init',
    sender: 'ai',
    text: "Namaste! I am your SmartServe AI Assistant. Need help finding a verified service provider, estimating costs, checking working hours, or tracking bookings in Coimbatore? Ask me anything!",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestedQuestions: [
      "I need an electrician",
      "My AC is not cooling",
      "Show my active bookings",
      "What are provider working hours?"
    ]
  };

  useEffect(() => {
    // Attempt loading saved chat history from backend MongoDB for authenticated customer
    const customer = CustomerService.getCustomerInfo();
    if (customer && customer.email) {
      CustomerService.getAIChatHistory(customer.email).then(saved => {
        if (saved && saved.length > 0) {
          setMessages(saved);
        } else {
          setMessages([defaultWelcomeMessage]);
        }
      }).catch(() => {
        setMessages([defaultWelcomeMessage]);
      });
    } else {
      setMessages([defaultWelcomeMessage]);
    }

    setFaqs(CustomerService.getAIFaqs());
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Image Selection Handler
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setValidationError("Unsupported image format. Please select JPEG, PNG, or WebP.");
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setValidationError("Image exceeds maximum permitted size of 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const base64Data = dataUrl.split(',')[1];
      setSelectedImage({
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        dataUrl: dataUrl,
        base64: base64Data,
        sizeFormatted: formatBytes(file.size)
      });
    };
    reader.onerror = () => {
      setValidationError("Failed to read image file.");
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  // Document Selection Handler
  const handleDocSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    const nameLower = file.name.toLowerCase();
    const isSupported = nameLower.endsWith('.pdf') || nameLower.endsWith('.txt') || nameLower.endsWith('.docx') ||
      file.type.includes('pdf') || file.type.includes('plain') || file.type.includes('wordprocessingml');

    if (!isSupported) {
      setValidationError("Unsupported file format. Please upload PDF, TXT, or DOCX documents.");
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setValidationError("Document exceeds maximum permitted size of 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const base64Data = dataUrl.split(',')[1];
      setSelectedDoc({
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type || (nameLower.endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
        base64: base64Data,
        sizeFormatted: formatBytes(file.size)
      });
    };
    reader.onerror = () => {
      setValidationError("Failed to read document file.");
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleSendMessage = async (text, overrideImage = null, overrideDoc = null) => {
    const userText = (text || '').trim();
    const currentImage = overrideImage !== null ? overrideImage : selectedImage;
    const currentDoc = overrideDoc !== null ? overrideDoc : selectedDoc;

    if ((!userText && !currentImage && !currentDoc) || isTyping) return;

    // Build user message
    const userMsg = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: userText,
      image: currentImage ? { name: currentImage.name, dataUrl: currentImage.dataUrl } : null,
      document: currentDoc ? { name: currentDoc.name, sizeFormatted: currentDoc.sizeFormatted } : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setSelectedImage(null);
    setSelectedDoc(null);
    setValidationError(null);
    setIsTyping(true);

    const imagePayload = currentImage ? {
      name: currentImage.name,
      mimeType: currentImage.mimeType,
      data: currentImage.base64,
      size: currentImage.size
    } : null;

    const docPayload = currentDoc ? {
      name: currentDoc.name,
      mimeType: currentDoc.mimeType,
      data: currentDoc.base64,
      size: currentDoc.size
    } : null;

    try {
      const customerInfo = CustomerService.getCustomerInfo();
      const recentHistory = messages.slice(-6);
      const response = await CustomerService.sendAIMessage(
        userText,
        recentHistory,
        customerInfo,
        imagePayload,
        docPayload
      );

      const aiMsg = {
        id: 'msg_' + (Date.now() + 1),
        sender: 'ai',
        text: response.reply || "Thank you for reaching out to SmartServe AI. How else can I assist you?",
        card: response.card || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: response.suggestedQuestions || []
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('AI assistant component error:', err);
      const errorMsg = {
        id: 'msg_err_' + (Date.now() + 1),
        sender: 'ai',
        isError: true,
        text: err.message || "Failed to process your request. Please check your connection and try again.",
        failedPayload: { text: userText, image: currentImage, doc: currentDoc },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: ["Which services are available?", "How do I book a service?"]
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInputVal(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      try {
        recognition.start();
      } catch {
        setIsListening(false);
      }
    } else {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        setInputVal("My AC is not cooling, suggest a provider.");
      }, 1500);
    }
  };

  const clearChat = async () => {
    const customer = CustomerService.getCustomerInfo();
    if (customer && customer.email) {
      await CustomerService.clearAIChatHistory(customer.email);
    }
    setMessages([
      {
        id: 'msg-init-' + Date.now(),
        sender: 'ai',
        text: "Conversation cleared. How can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedQuestions: [
          "I need an electrician",
          "My AC is not cooling",
          "Show my active bookings",
          "Book a plumber tomorrow"
        ]
      }
    ]);
    setSelectedImage(null);
    setSelectedDoc(null);
    setValidationError(null);
  };

  const retryMessage = (failedPayload) => {
    if (!failedPayload) return;
    handleSendMessage(failedPayload.text, failedPayload.image, failedPayload.doc);
  };

  const filteredFaqs = faqs.filter(
    f =>
      f.question.toLowerCase().includes(faqQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(faqQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hidden File Pickers */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleDocSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-extrabold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Bot className="w-8 h-8 text-blue-500" />
            AI Smart Assistant
          </h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Your intelligent helper for planning, recommendations, and customer support.
          </p>
        </div>

        {/* Tab Switchers */}
        <div className={`p-1 rounded-2xl flex border ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-lg'
                : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chatbot
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'faqs'
                ? 'bg-blue-600 text-white shadow-lg'
                : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Smart FAQ
          </button>
        </div>
      </div>

      {activeTab === 'chat' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Chat main workspace */}
          <div className={`lg:col-span-3 flex flex-col h-[600px] rounded-3xl border overflow-hidden ${
            darkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {/* Chat header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              darkMode ? 'border-white/5 bg-slate-950/20' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    SmartServe Assistant
                  </h4>
                  <span className="text-[10px] text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                    Online & Ready
                  </span>
                </div>
              </div>
              <button
                onClick={clearChat}
                className={`p-2 rounded-xl border hover:text-rose-500 transition-colors ${
                  darkMode ? 'bg-slate-900 border-white/5 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Chat area messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 max-w-[85%] ${m.sender === 'user' ? 'ms-auto flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    m.sender === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-blue-500" />}
                  </div>

                  <div className="space-y-2 max-w-full">
                    <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : m.isError
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-tl-none'
                          : darkMode 
                            ? 'bg-slate-900 text-slate-100 border border-white/5 rounded-tl-none' 
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}>
                      {/* Attached Image Thumbnail */}
                      {m.image && (
                        <div className="mb-2">
                          <img
                            src={m.image.dataUrl || m.image.previewUrl}
                            alt={m.image.name}
                            className="max-w-[220px] max-h-[160px] rounded-2xl object-cover border border-white/20 shadow-sm"
                          />
                        </div>
                      )}

                      {/* Attached Document Badge */}
                      {m.document && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-700/60 border border-blue-400/30 text-white text-xs mb-2 shadow-sm">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="font-semibold truncate max-w-[180px]">{m.document.name}</span>
                          {m.document.sizeFormatted && (
                            <span className="text-[10px] text-blue-200">({m.document.sizeFormatted})</span>
                          )}
                        </div>
                      )}

                      {/* Text content */}
                      {m.text && m.text.split('\n').map((line, idx) => (
                        <p key={idx} className="mb-1">{line}</p>
                      ))}

                      {/* Retry Button if request failed */}
                      {m.isError && m.failedPayload && (
                        <div className="mt-3">
                          <button
                            onClick={() => retryMessage(m.failedPayload)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Retry Message
                          </button>
                        </div>
                      )}

                      {/* Smart Message Card if returned by AI */}
                      {m.card && (
                        <div className={`mt-3 p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                          darkMode ? 'bg-slate-950/60 border-white/10' : 'bg-white border-slate-200 shadow-md'
                        }`}>
                          <div className="flex items-center gap-3">
                            {m.card.photo ? (
                              <img
                                src={m.card.photo}
                                alt={m.card.title}
                                className="w-12 h-12 rounded-xl object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-base flex-shrink-0">
                                {m.card.title ? m.card.title.charAt(0).toUpperCase() : 'S'}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>{m.card.title}</h5>
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-[8px] font-extrabold uppercase">
                                  {m.card.matchReason}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">{m.card.category} • {m.card.location}</p>
                              <p className="text-[11px] font-black text-blue-500 mt-0.5">{m.card.price}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => navigate(`/customer/providers?category=${encodeURIComponent(m.card.category)}`)}
                            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider shadow-md"
                          >
                            Book Now
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span className="text-[9px] text-slate-500 block px-2">
                      {m.timestamp}
                    </span>

                    {/* Suggested questions */}
                    {m.suggestedQuestions && m.suggestedQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {m.suggestedQuestions.map((q) => (
                          <button
                            key={q}
                            onClick={() => handleSendMessage(q)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                              darkMode 
                                ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:border-blue-500' 
                                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-blue-500'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-slate-800`}>
                    <Bot className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className={`p-4 rounded-3xl rounded-tl-none bg-slate-900/50 border border-white/5 flex items-center gap-1.5`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className={`p-4 border-t ${
              darkMode ? 'border-white/5 bg-slate-950/20' : 'border-slate-100 bg-slate-50'
            }`}>
              {/* Selected Attachments Preview Bar */}
              {(selectedImage || selectedDoc || validationError) && (
                <div className={`mb-3 p-2.5 rounded-2xl border flex flex-wrap items-center gap-2 ${
                  darkMode ? 'bg-slate-900/80 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}>
                  {validationError && (
                    <div className="w-full text-xs text-rose-500 flex items-center gap-1.5 px-2 py-1">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {selectedImage && (
                    <div className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl border text-xs shadow-sm ${
                      darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-slate-200'
                    }`}>
                      <img src={selectedImage.dataUrl} alt="Preview" className="w-8 h-8 rounded-lg object-cover" />
                      <div className="max-w-[140px] truncate">
                        <p className={`font-semibold truncate text-[11px] ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {selectedImage.name}
                        </p>
                        <p className="text-[9px] text-slate-400">{selectedImage.sizeFormatted}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="p-1 hover:text-rose-500 text-slate-400 rounded-lg transition-colors"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {selectedDoc && (
                    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs shadow-sm ${
                      darkMode ? 'bg-slate-950 border-white/10' : 'bg-white border-slate-200'
                    }`}>
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="max-w-[140px] truncate">
                        <p className={`font-semibold truncate text-[11px] ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {selectedDoc.name}
                        </p>
                        <p className="text-[9px] text-slate-400">{selectedDoc.sizeFormatted}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDoc(null)}
                        className="p-1 hover:text-rose-500 text-slate-400 rounded-lg transition-colors"
                        title="Remove document"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isListening && (
                <div className="flex items-center justify-center gap-2 py-2 mb-2 text-xs font-semibold text-blue-500 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  Listening to voice input... Speak now.
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputVal);
                }}
                className="flex items-center gap-2"
              >
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      selectedImage ? 'bg-blue-600 text-white border-blue-600' :
                      darkMode ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
                    }`}
                    title="Upload image (JPEG, PNG, WebP)"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      selectedDoc ? 'bg-blue-600 text-white border-blue-600' :
                      darkMode ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
                    }`}
                    title="Upload document (PDF, TXT, DOCX)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isListening
                        ? 'bg-red-500 text-white border-red-500 animate-bounce'
                        : darkMode ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
                    }`}
                    title="Voice input"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(inputVal);
                    }
                  }}
                  disabled={isTyping}
                  placeholder="Ask a question about home services..."
                  className={`flex-1 px-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />

                <button
                  type="submit"
                  disabled={isTyping || (!inputVal.trim() && !selectedImage && !selectedDoc)}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-md transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Collateral Help suggestions */}
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl border ${
              darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center gap-1.5 text-blue-500 mb-3 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Quick Prompts</span>
              </div>
              <h4 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'} mb-2`}>
                Instant Inquiries
              </h4>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-4`}>
                Click any of these sample prompt requests to check the AI chatbot feedback logic:
              </p>

              <div className="space-y-2">
                {[
                  "I need an electrician",
                  "My AC is not cooling",
                  "Show my active bookings",
                  "What are provider working hours?",
                  "Book a plumber tomorrow"
                ].map((promptText) => (
                  <button
                    key={promptText}
                    onClick={() => handleSendMessage(promptText)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-semibold hover:border-blue-500 transition-colors ${
                      darkMode ? 'bg-slate-950/40 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    "{promptText}"
                  </button>
                ))}
              </div>
            </div>

            <div className={`p-6 rounded-3xl border text-center ${
              darkMode ? 'bg-blue-950/20 border-blue-500/10' : 'bg-blue-50 border-blue-100'
            }`}>
              <Bot className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h5 className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'} mb-1`}>
                Need Deeper Analysis?
              </h5>
              <p className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-600'} leading-relaxed mb-3`}>
                Use the dedicated estimators and planners for budget checks and sequential scheduling.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate('/customer/ai-estimator')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider"
                >
                  Cost Estimator
                </button>
                <button
                  onClick={() => navigate('/customer/ai-planner')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
                    darkMode ? 'bg-slate-900 border-white/5 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  Service Planner
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Expandable Accordion FAQs */
        <div className={`p-8 rounded-3xl border space-y-6 ${
          darkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* FAQ search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={faqQuery}
              onChange={(e) => setFaqQuery(e.target.value)}
              placeholder="Search FAQs..."
              className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div className="space-y-4">
            {filteredFaqs.map((f, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className={`border rounded-2xl transition-all overflow-hidden ${
                    darkMode ? 'bg-slate-950/20 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left font-bold text-xs sm:text-sm text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    <span>{f.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`p-4 border-t text-xs leading-relaxed ${
                          darkMode ? 'border-white/5 text-slate-300' : 'border-slate-200 text-slate-600'
                        }`}>
                          <p>{f.answer}</p>
                          <div className="flex gap-2 items-center mt-3 pt-2 border-t border-dashed border-white/5">
                            <span className="text-[10px] text-slate-500">Ask AI instead:</span>
                            <button
                              onClick={() => {
                                handleSendMessage(f.question);
                                setActiveTab('chat');
                              }}
                              className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-0.5"
                            >
                              Send to Chat <Send className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {filteredFaqs.length === 0 && (
              <p className="text-center text-slate-500 text-xs py-8">
                No matching AI FAQs found. Type another search query.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
