import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Play, MoreVertical, Zap, RotateCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatMessage } from '@/types';
import { useProjects } from '@/hooks/useProjects';
import { useParams } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';
import { parseCodeBlocks, updateFileInTree } from '@/utils/codeParser';
import { useToast } from '@/hooks/use-toast';
import { ContextManager } from '@/utils/contextManager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function ChatPanel() {
  const { projectId } = useParams();
  const { projects, updateProject } = useProjects();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find(p => p.id === projectId);
  const contextUsage = currentProject ? ContextManager.calculateContextUsage(currentProject) : 0;
  const contextStatus = ContextManager.getContextStatus(contextUsage);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [currentProject?.chatHistory, isTyping, isSummarizing]);

  const handleApplyCode = async (content: string) => {
    if (!currentProject) return;

    const blocks = parseCodeBlocks(content);
    if (blocks.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No code detected',
        description: 'Could not find any code blocks to apply.',
      });
      return;
    }

    try {
      let updatedFiles = [...currentProject.files];
      
      for (const block of blocks) {
        updatedFiles = updateFileInTree(updatedFiles, block.path, block.content);
      }

      updateProject(currentProject.id, { files: updatedFiles });
      
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

  const handleSendMessage = async (customPrompt?: string, customMessages?: any[]) => {
    if (!input.trim() && !customPrompt && !customMessages) return;
    if (!currentProject) return;

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

    if (customMessages) {
      messagesToSend = customMessages;
    } else {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: currentInput,
        timestamp: Date.now(),
      };

      const updatedHistory = [...currentProject.chatHistory, userMessage];
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
          content: `(Simulated) I've received your request: \"${currentInput || 'Special command'}\". Please configure your real API in Settings to get real responses!`,
          timestamp: Date.now(),
        };
        updateProject(currentProject.id, { 
          chatHistory: [...currentProject.chatHistory, aiMessage] 
        });
        setIsTyping(false);
      }, 1000);
      return;
    }

    try {
      const { systemContext, messages } = ContextManager.buildPrompt(currentProject);
      
      const finalMessages = customMessages 
        ? [{ role: 'system', content: systemContext }, ...customMessages]
        : [{ role: 'system', content: systemContext }, ...messages];

      const response = await fetch(settings.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey && { 'Authorization': `Bearer ${settings.apiKey}` }),
        },
        body: JSON.stringify({
          model: settings.modelName || 'default',
          messages: finalMessages,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      let aiContent = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        aiContent = data.choices[0].message.content;
      } else if (data.response) {
        aiContent = data.response;
      } else {
        aiContent = JSON.stringify(data);
      }

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
      };

      if (!customMessages) {
        updateProject(currentProject.id, { 
          chatHistory: [...currentProject.chatHistory, aiMessage] 
        });
      } else {
        return aiContent;
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to communicate with the AI API. Check your settings and CORS configuration.'}`,
        timestamp: Date.now(),
      };
      updateProject(currentProject.id, { 
        chatHistory: [...currentProject.chatHistory, errorMessage] 
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleCompactContext = async () => {
    if (!currentProject || isSummarizing) return;

    setIsSummarizing(true);
    toast({ title: 'Compressing context...', description: 'The AI is summarizing your session.' });

    try {
      const summaryPrompt = "Summarize this conversation into a structured format including: Objective, Changes Made, Files Modified, Decisions, Problems, and Pending Tasks. Be concise.";
      const userSummaryMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: summaryPrompt,
        timestamp: Date.now(),
      };

      const summaryResult = await handleSendMessage(summaryPrompt, [...currentProject.chatHistory, userSummaryMessage].map(m => ({ role: m.role, content: m.content })));

      if (typeof summaryResult === 'string') {
        updateProject(currentProject.id, { 
          sessionSummary: summaryResult,
          chatHistory: [] 
        });

        toast({
          title: 'Context compressed!',
          description: 'Conversation history has been summarized and cleared.',
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
              <DropdownMenuItem onClick={() => { /* Placeholder for New Session */ }}>
                <Zap className='mr-2 h-4 w-4' />
                New Session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className='flex-1' ref={scrollRef}>
        <div className='p-4 space-y-6'>
          {currentProject.chatHistory.map((message) => (
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
                <div className={`px-4 py-2 rounded-2xl text-sm ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-none' 
                    : 'bg-muted text-foreground rounded-tl-none'
                }`}>
                  {message.content}
                </div>
                <span className='text-[10px] text-muted-foreground mt-1 px-1'>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                {message.role === 'assistant' && parseCodeBlocks(message.content).length > 0 && (
                  <div className='mt-2 flex justify-start'>
                    <Button 
                      variant='outline' 
                      size='sm' 
                      className='gap-2 h-8 text-xs'
                      onClick={() => handleApplyCode(message.content)}
                    >
                      <Play className='w-3 h-3' />
                      Apply Code to Files
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
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
