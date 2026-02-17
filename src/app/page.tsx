'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import dynamic from 'next/dynamic';
import { extractTextFromPDF } from './actions';

// Import with prop types
const DocumentScene3D = dynamic(() => import('@/components/DocumentScene3D'), {
  ssr: false,
  loading: () => null,
});

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Send,
  Upload,
  Bot,
  User,
  Sparkles,
  ArrowRight,
  X,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function Home() {
  const [pdfText, setPdfText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pdfTextRef = useRef(pdfText);
  useEffect(() => {
    pdfTextRef.current = pdfText;
  }, [pdfText]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => ({ pdfText: pdfTextRef.current }),
      }),
    []
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (error) => {
      console.error('[useChat] Error:', error);
      setErrorMsg(error.message || 'Something went wrong. Check your API key.');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (pdfText && inputRef.current) {
      inputRef.current.focus();
    }
  }, [pdfText]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file || !file.name.endsWith('.pdf')) {
      return;
    }
    setIsUploading(true);
    setFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const text = await extractTextFromPDF(formData);
      setPdfText(text);
    } catch (error) {
      console.error('Error extracting text:', error);
      setFileName('');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || status !== 'ready') return;
    setErrorMsg('');
    sendMessage({ text: inputVal });
    setInputVal('');
  };

  const handleNewDocument = () => {
    setPdfText('');
    setFileName('');
    setInputVal('');
  };

  const isStreaming = status === 'streaming';
  const visibleMessages = messages.filter((m) => m.role !== 'system');
  const isChatMode = !!pdfText;

  return (
    // Unified Container
    <div className="relative min-h-screen overflow-hidden">

      {/* 1. Background Layer (Persistent) */}
      <DocumentScene3D isChatMode={isChatMode} />

      {/* Gradient Overlay for Chat Mode to ensure readability even with background */}
      {isChatMode && (
        <div className="absolute inset-0 bg-background/80 pointer-events-none backdrop-blur-[2px] transition-opacity duration-1000" style={{ zIndex: 1 }} />
      )}
      {/* Gradient Overlay for Upload Mode */}
      {!isChatMode && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background pointer-events-none transition-opacity duration-1000" style={{ zIndex: 1 }} />
      )}

      {/* 2. Content Layer */}
      <div className="relative z-10 h-full min-h-screen">

        {/* VIEW: UPLOAD */}
        {!isChatMode && (
          <div className="flex min-h-screen flex-col items-center justify-center p-6 animate-fade-in">
            {/* Logo & Title */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-3">
                DocChat
              </h1>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                Upload a PDF and start asking questions. Powered by AI.
              </p>
            </div>

            {/* Upload Card */}
            <Card
              className={`relative overflow-hidden transition-all duration-300 cursor-pointer group bg-card/60 backdrop-blur-md border-muted/30 ${isDragging
                ? 'drop-zone-active border-primary shadow-lg shadow-primary/10'
                : 'hover:border-muted-foreground/30 hover:shadow-lg'
                }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="p-10 flex flex-col items-center text-center">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-4 animate-pulse-subtle">
                    <div className="w-14 h-14 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <div>
                      <p className="font-medium">Processing document...</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {fileName}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors duration-300">
                      <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                    </div>
                    <p className="font-semibold text-lg mb-1">
                      Drop your PDF here
                    </p>
                    <p className="text-sm text-muted-foreground mb-5">
                      or click to browse files
                    </p>
                    <Badge variant="secondary" className="gap-1.5">
                      <FileText className="w-3 h-3" />
                      PDF files supported
                    </Badge>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={onInputChange}
                className="hidden"
                disabled={isUploading}
              />
            </Card>

            <p className="text-center text-xs text-muted-foreground/60 mt-6">
              Your documents are processed locally and never stored.
            </p>
          </div>
        )}

        {/* VIEW: CHAT */}
        {isChatMode && (
          <div className="flex flex-col h-screen animate-fade-in">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/50 backdrop-blur-md">
              <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-semibold text-sm">DocChat</h1>
                    <span className="text-muted-foreground/40">·</span>
                    <div className="flex items-center gap-1.5 max-w-[200px]">
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {fileName}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewDocument}
                  className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                  New Document
                </Button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-3xl mx-auto px-4 py-6">
                {visibleMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[60vh]">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h2 className="font-semibold text-lg mb-2">
                      Start a conversation
                    </h2>
                    <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
                      Ask anything about your document. The AI has read the entire content.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        'Summarize this document',
                        'What are the key points?',
                        'Explain the main topic',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            sendMessage({ text: suggestion });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-background/50 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors duration-200"
                        >
                          {suggestion}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {visibleMessages.map((m, idx) => {
                      const isUser = m.role === 'user';
                      const textParts = m.parts?.filter(
                        (p: any) => p.type === 'text'
                      );
                      const text = textParts
                        ?.map((p: any) => p.text)
                        .join('')
                        || '';

                      return (
                        <div
                          key={m.id}
                          className="animate-fade-in"
                          style={{ animationDelay: `${Math.min(idx * 50, 200)}ms` }}
                        >
                          <div className={`flex gap-4 py-6`}>
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${isUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                                }`}
                            >
                              {isUser ? (
                                <User className="w-4 h-4" />
                              ) : (
                                <Bot className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                {isUser ? 'You' : 'DocChat'}
                              </p>
                              <div className="text-[0.94rem] leading-7 break-words max-w-none">
                                {isUser ? (
                                  <p className="whitespace-pre-wrap">{text}</p>
                                ) : (
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => <p className="mb-4 last:mb-0 text-foreground/90">{children}</p>,
                                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                      em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
                                      ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2">{children}</ul>,
                                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-3">{children}</ol>,
                                      li: ({ children }) => <li className="text-[0.94rem] leading-7 text-foreground/90 pl-1">{children}</li>,
                                      h1: ({ children }) => <h3 className="text-lg font-semibold mt-6 mb-3 text-foreground">{children}</h3>,
                                      h2: ({ children }) => <h4 className="text-base font-semibold mt-5 mb-2 text-foreground">{children}</h4>,
                                      h3: ({ children }) => <h5 className="text-[0.94rem] font-semibold mt-4 mb-2 text-foreground">{children}</h5>,
                                      code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                                      pre: ({ children }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                                      blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-4 my-4 text-foreground/70 italic">{children}</blockquote>,
                                    }}
                                  >{text}</ReactMarkdown>
                                )}
                              </div>
                            </div>
                          </div>
                          {idx < visibleMessages.length - 1 && (
                            <div className="border-b border-border/30" />
                          )}
                        </div>
                      );
                    })}

                    {(status === 'submitted' || status === 'streaming') && visibleMessages[visibleMessages.length - 1]?.role === 'user' && (
                      <div className="flex gap-3 py-4 animate-fade-in">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-muted-foreground mb-1">DocChat</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{status === 'submitted' ? 'Thinking' : 'Writing'}<span className="typing-dot-text">...</span></span>
                          </div>
                        </div>
                      </div>
                    )}

                    {errorMsg && (
                      <div className="flex gap-3 py-4 animate-fade-in">
                        <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-destructive mb-1">Error</p>
                          <p className="text-sm text-destructive/80">{errorMsg}</p>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="sticky bottom-0 border-t bg-background/50 backdrop-blur-md">
              <div className="max-w-3xl mx-auto px-4 py-3">
                <form onSubmit={onSubmit} className="relative">
                  <input
                    ref={inputRef}
                    className="w-full h-11 pl-4 pr-12 rounded-xl border bg-muted/50 hover:bg-muted/70 focus:bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 transition-all duration-200"
                    value={inputVal}
                    placeholder="Ask something about your document..."
                    onChange={(e) => setInputVal(e.target.value)}
                    disabled={isStreaming}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputVal.trim() || isStreaming}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
                <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
                  DocChat can make mistakes. Verify important information.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
