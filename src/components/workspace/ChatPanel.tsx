import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Play, MoreVertical, Zap, RotateCcw, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatMessage, SessionSummary } from '@/types';
import { useProjects } from '@/hooks/useProjects';
import { useParams } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';
import { parseCodeBlocks, updateFileInTree } from '@/utils/codeParser';
import { useToast } from '@/hooks/use-toast';
import { ContextManager, ContextBuilderOptions } from '@/utils/contextManager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ChatPanel() {
  const { projectId } = useParams();
  const { projects, updateProject } = useProjects();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
  const [lastAiMessageId, setLastAiMessageId] = useState<string | null>(null);
  const [lastUndoState, setLastUndoState] = useState<{ files: any[], messageId: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find(p => p.id === projectId);
  const contextUsage = currentProject ? ContextManager.calculateContextUsage(currentProject) : 0;
  const contextStatus = currentProject ? ContextManager.getContextStatus(contextUsage) : { label: 'None', color: 'outline' };

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [currentProject?.chatHistory, isTyping, isSummarizing]);

  const handleApplyCode = async (content: string, messageId: string) => {
    if (!currentProject) return;

    console.log(`[REAL-APPLY] RAW RESPONSE: ${content}`);
    console.log(`[REAL-APPLY] RAW RESPONSE LENGTH: ${content.length}`);

    console.log(`[REAL-APPLY] PARSER INPUT: ${content}`);
    const blocks = parseCodeBlocks(content);
    console.log(`[REAL-APPLY] PARSER OUTPUT: ${JSON.stringify(blocks)}`);
    console.log(`[REAL-APPLY] PARSED FILE COUNT: ${blocks.length}`);
    console.log(`[REAL-APPLY] PARSED FILE PATHS: ${JSON.stringify(blocks.map(b => b.path))}`);

    if (blocks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No code detected',
        description: 'Could not find any code blocks to apply.',
      });
      return;
    }

    try {
      const previousFiles = [...currentProject.files];
      let updatedFiles = [...currentProject.files];
      
      for (const block of blocks) {
        updatedFiles = updateFileInTree(updatedFiles, block.path, block.content);
      }

      console.log(`[REAL-APPLY] BEFORE UPDATE PROJECT: ${JSON.stringify(updatedFiles.map(f => f.name))}`);

      updateProject(currentProject.id, { files: updatedFiles });
      
      setLastUndoState({
        files: previousFiles,
        messageId: messageId
      });

      toast({
        title: 'Code applied successfully!',
        description: `Updated ${blocks.length} file(s) in your project.`,
      });
    } catch (error) {
      console.error('Failed to apply code:', error);
      toast({
        variant: 'destructive',
        title: 'Error applying code',
        description: 'An error occurred while updating the project files.',
      });
    }
  };

  const handleUndo = () => {
    if (!lastUndoState || !currentProject) return;

    updateProject(currentProject.id, { files: lastUndoState.files });
    setLastUndoState(null);
    toast({
      title: 'Changes undone!',
      description: 'Reverted to the previous file state.',
    });
  };

  const handleNewSession = () => {
    if (!currentProject) return;

    updateProject(currentProject.id, { chatHistory: [] });
    setIsNewSessionDialogOpen(false);
    toast({
      title: 'New session started',
      description: 'Conversation history has been cleared.',
    });
  };

  const handleSendMessage = async (
    customPrompt?: string,
    customMessages?: any[],
    contextOptions?: ContextBuilderOptions
  ) => {
    if (!input.trim() && !customPrompt && !customMessages) return;
    if (!currentProject) {
      console.error('[BUILDERAI DEBUG] ERROR: currentProject is undefined. Cannot send message.');
      return;
    }

    // [BUILDERAI DEBUG]
    console.log(`[BUILDERAI DEBUG] USER MESSAGE RECEIVED: ${input || customPrompt || 'N/A'}`);

    // Warning for high context
    if (contextUsage > 80 && !customPrompt && !customMessages) {
      toast({
        title: 'High context usage',
        description: 'Your conversation is getting long. Consider compacting context to maintain performance.',
        variant: 'default',
      });
    }

    let messagesToSend: any[] = [];
    let currentInput = input;
    let updatedHistory: ChatMessage[] = [...currentProject.chatHistory];

    if (customMessages) {
      messagesToSend = customMessages;
    } else {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: currentInput,
        timestamp: Date.now(),
      };

      updatedHistory = [...currentProject.chatHistory, userMessage];
      updateProject(currentProject.id, { chatHistory: updatedHistory });
      messagesToSend = updatedHistory.map(m => ({ role: m.role, content: m.content }));
    }

    setInput('');
    setIsTyping(true);

    if (!settings.apiUrl) {
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `(Simulated) I've received your request: \\\"${currentInput || 'Special command'}\\\". Please configure your real API in Settings to get real responses!`,
          timestamp: Date.now(),
        };
        updateProject(currentProject.id, {
          chatHistory: [...updatedHistory, aiMessage]
        });
        setIsTyping(false);
      }, 1000);
      return;
    }

    let aiMessageId: string | null = null;
    let accumulatedContent = '';

    try {
      // Create a temporary project object with the updated history to ensure ContextManager has the latest messages for the system prompt
      const projectWithLatestHistory = {
        ...currentProject,
        chatHistory: customMessages ? currentProject.chatHistory : updatedHistory
      };

      const { systemContext } = ContextManager.buildPrompt(projectWithLatestHistory, contextOptions);
      
      const finalMessages = [{ role: 'system', content: systemContext }, ...messagesToSend];

      // [BUILDERAI DEBUG]
      console.log(`[BUILDERAI DEBUG] FINAL MODEL INPUT: ${JSON.stringify(finalMessages)}`);

      // [BUILDERAI DEBUG]
      console.log(`[BUILDERAI DEBUG] REQUEST SENT: ${settings.apiUrl}`);
      console.log(`[BUILDERAI DEBUG] REQUEST BODY: ${JSON.stringify({
        model: settings.modelName || 'default',
        messages: finalMessages,
        stream: true
      })}`);

      const response = await fetch(settings.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey && { 'Authorization': `Bearer ${settings.apiKey}` }),
        },
        body: JSON.stringify({
          model: settings.modelName || 'default',
          messages: finalMessages,
          stream: true,
        }),
      });

      // [BUILDERAI DEBUG]
      console.log(`[BUILDERAI DEBUG] HTTP STATUS: ${response.status}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      // Prepare for streaming
      aiMessageId = crypto.randomUUID();
      setLastAiMessageId(aiMessageId);

      const aiMessage: ChatMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      if (!customMessages) {
        updateProject(currentProject.id, {
          chatHistory: [...updatedHistory, aiMessage]
        });
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

              if (trimmedLine.startsWith('data: ')) {
                try {
                  const jsonStr = trimmedLine.substring(6);
                  const data = JSON.parse(jsonStr);
                  const content = data.choices?.[0]?.delta?.content || '';
                  accumulatedContent += content;

                  if (!customMessages && content) {
                    // Update message in history
                    // To avoid stale state, we must be careful with updateProject. 
                    // Since updateProject is an async-like effect from useProjects, 
                    // we'll just pass the new history. 
                    // We need to find the current project's latest history that includes our aiMessage.
                    // In a real app, we'd use a functional update, but here we'll rely on the fact 
                    // that we just added aiMessage to updatedHistory.
                    
                    // We'll rebuild the history for the update based on what we know.
                    // Since we can't easily get the LATEST history from the hook in the middle of this function,
                    // we'll assume currentProject is somewhat stable or the update will merge.
                    // Actually, we need to reconstruct the history.
                    
                    const currentChatHistory = customMessages ? currentProject.chatHistory : [...updatedHistory, aiMessage];
                    const newHistory = currentChatHistory.map(m => 
                      m.id === aiMessageId ? { ...m, content: accumulatedContent } : m
                    );
                    updateProject(currentProject.id, { chatHistory: newHistory });
                  }
                } catch (e) {
                  console.error('Error parsing SSE chunk', e);
                }
              }
            }
          }
        } catch (error) {
          accumulatedContent += '\n\n**Resposta interrompida**';
          if (!customMessages && aiMessageId) {
            const currentChatHistory = customMessages ? currentProject.chatHistory : [...updatedHistory, aiMessage];
            const newHistory = currentChatHistory.map(m => 
              m.id === aiMessageId ? { ...m, content: accumulatedContent } : m
            );
            updateProject(currentProject.id, { chatHistory: newHistory });
          }
          throw error;
        } finally {
          reader.releaseLock();
        }
      }

      if (customMessages) {
        return accumulatedContent;
      }

      // Ensure final content is set if loop finished but last chunk was part of a line
      if (!customMessages && aiMessageId && accumulatedContent) {
        const finalChatHistory = customMessages ? currentProject.chatHistory : [...updatedHistory, aiMessage];
        const newHistory = finalChatHistory.map(m => 
          m.id === aiMessageId ? { ...m, content: accumulatedContent } : m
        );
        updateProject(currentProject.id, { chatHistory: newHistory });
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `BuilderAI Error: ${error instanceof Error ? error.message : 'Failed to communicate with the AI API. Check your settings and CORS configuration.'}`,
        timestamp: Date.now(),
      };
      
      updateProject(currentProject.id, {
        chatHistory: [...updatedHistory, errorMessage]
      });
    } finally {
      setIsTyping(false);
      setLastAiMessageId(null);
    }
  };

  const handleCompactContext = async () => {
    if (!currentProject || isSummarizing) return;

    setIsSummarizing(true);
    toast({ title: 'Compressing context...', description: 'The AI is summarizing your session.' });

    try {
      const summaryPrompt = await ContextManager.generateSummaryPrompt(currentProject);
      
      // We create a special message to trigger the summarization via the AI
      const userSummaryMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: summaryPrompt,
        timestamp: Date.now(),
      };

      // IMPORTANT: When summarizing, we pass a higher maxHistoryMessages to ensure the AI sees the full context!
      const summaryResult = await handleSendMessage(
        undefined, 
        [...currentProject.chatHistory, userSummaryMessage].map(m => ({ role: m.role, content: m.content })),
        { maxHistoryMessages: 50 }
      );

      if (typeof summaryResult === 'string') {
        const newSummary: SessionSummary = {
          id: `session-summary-${Date.now()}`,
          timestamp: Date.now(),
          content: summaryResult,
        };

        updateProject(currentProject.id, {
          sessionSummaries: [...(currentProject.sessionSummaries || []), newSummary],
          currentSessionSummary: newSummary,
          chatHistory: []
        });

        toast({
          title: 'Context compressed!',
          description: 'Conversation history has been summarized and versioned.',
        });
      }
    } catch (error) {
      console.error('Compression error:', error);
      toast({
        variant: 'destructive',
        title: 'Compression failed',
        description: 'An error occurred while trying to summarize the conversation.',
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!currentProject) return null;

  return (
    <div className='flex flex-col h-full bg-card'>
      <div className='p-4 border-b flex justify-between items-center'>
        <div className='flex items-center gap-3'>
          <h2 className='font-semibold'>Chat</h2>
          <Badge variant='outline' className={`capitalize ${contextStatus.color}`}>
            Context: {contextStatus.label}
          </Badge>
        </div>
        <div className='flex items-center gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon'>
                <MoreVertical className='w-4 h-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={handleCompactContext} disabled={isSummarizing}>
                <RotateCcw className='mr-2 h-4 w-4' />
                {isSummarizing ? 'Summarizing...' : 'Compact Context'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNewSessionDialogOpen(true)}>
                <Zap className='mr-2 h-4 w-4' />
                New Session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog
            open={isNewSessionDialogOpen}
            onOpenChange={setIsNewSessionDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start a new session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear your current chat history. You won't be able to see previous messages in this session, but your files will remain unchanged.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleNewSession}>
                  Start New Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <ScrollArea className='flex-1' ref={scrollRef}>
        <div className='p-4 space-y-6'>
          {currentProject.chatHistory.map((message) => {
            return (
              <div 
                key={message.id} 
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className='w-8 h-8 border shrink-0'>
                  <AvatarFallback className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                    {message.role === 'user' ? <User className='w-4 h-4' /> : <Bot className='w-4 h-4' />}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-muted text-foreground rounded-tl-none'
                  }`}>
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            if (inline) {
                              return <code className={className} {...props}>{children}</code>;
                            }
                            return (
                              <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto font-mono text-sm my-2">
                                <code className={className} {...props}>{children}</code>
                              </pre>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>
                  <span className='text-[10px] text-muted-foreground mt-1 px-1'>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {message.role === 'assistant' && parseCodeBlocks(message.content).length > 0 && (
                    <div className='mt-2 flex justify-start gap-2'>
                      <Button 
                        variant='outline' 
                        size='sm' 
                        className='gap-2 h-8 text-xs'
                        onClick={() => handleApplyCode(message.content, message.id)}
                        disabled={message.id === lastAiMessageId}
                      >
                        <Play className='w-3 h-3' />
                        Apply Code to Files
                      </Button>

                      {lastUndoState?.messageId === message.id && (
                        <Button 
                          variant='secondary' 
                          size='sm' 
                          className='gap-2 h-8 text-xs text-destructive hover:text-destructive'
                          onClick={handleUndo}
                        >
                          <RotateCcw className='w-3 h-3' />
                          Undo
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isTyping && (
            <div className='flex gap-3'>
              <Avatar className='w-8 h-8 border shrink-0'>
                <AvatarFallback className='bg-muted'>
                  <Bot className='w-4 h-4' />
                </AvatarFallback>
              </Avatar>
              <div className='bg-muted px-4 py-2 rounded-2xl text-sm animate-pulse'>
                AI is thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className='p-4 border-t'>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className='relative flex items-center gap-2'
        >
          <Input
            placeholder='Ask the AI to build something...'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className='pr-12 py-6 rounded-full'
            disabled={isTyping}
          />
          <Button 
            type='submit' 
            size='icon' 
            className='absolute right-1.5 h-8 w-8 rounded-full'
            disabled={!input.trim() || isTyping}
          >
            <Send className='w-4 h-4' />
          </Button>
        </form>
        <p className='text-[10px] text-center text-muted-foreground mt-2'>
          AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
