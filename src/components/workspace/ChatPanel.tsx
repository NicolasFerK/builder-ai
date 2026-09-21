import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatMessage } from '@/types';
import { useProjects } from '@/hooks/useProjects';
import { useParams } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';

export function ChatPanel() {
  const { projectId } = useParams();
  const { projects, updateProject } = useProjects();
  const { settings } = useSettings();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [currentProject?.chatHistory, isTyping]);

  const handleSendMessage = async () => {
    if (!input.trim() || !currentProject) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    const updatedHistory = [...currentProject.chatHistory, userMessage];
    updateProject(currentProject.id, { chatHistory: updatedHistory });
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    if (!settings.apiUrl) {
      // Fallback to simulation if no API is configured
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `(Simulated) I've received your request: \"${currentInput}\". Please configure your real API in Settings to get real responses!`,
          timestamp: Date.now(),
        };
        updateProject(currentProject.id, { 
          chatHistory: [...updatedHistory, aiMessage] 
        });
        setIsTyping(false);
      }, 1000);
      return;
    }

    try {
      const response = await fetch(settings.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey && { 'Authorization': `Bearer ${settings.apiKey}` }),
        },
        body: JSON.stringify({
          model: settings.modelName || 'default',
          messages: updatedHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errorData = await response.json();
          errorDetail = errorData.error?.message || errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (e) {
          // fallback to statusText
        }
        throw new Error(`API error (${response.status}): ${errorDetail}`);
      }

      const data = await response.json();
      
      // Handle different response formats (OpenAI style vs others)
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

      updateProject(currentProject.id, { 
        chatHistory: [...updatedHistory, aiMessage] 
      });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to communicate with the AI API. Check your settings and CORS configuration.'}`,
        timestamp: Date.now(),
      };
      updateProject(currentProject.id, { 
        chatHistory: [...updatedHistory, errorMessage] 
      });
    } finally {
      setIsTyping(false);
    }
  };

  if (!currentProject) return null;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold">Chat</h2>
        {!settings.apiUrl && (
          <div className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium animate-pulse">
            API Not Configured
          </div>
        )}
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-6">
          {currentProject.chatHistory.map((message) => (
            <div 
              key={message.id} 
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="w-8 h-8 border shrink-0">
                <AvatarFallback className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                  {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
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
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 border shrink-0">
                <AvatarFallback className="bg-muted">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted px-4 py-2 rounded-2xl text-sm animate-pulse">
                AI is thinking...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="relative flex items-center gap-2"
        >
          <Input
            placeholder="Ask the AI to build something..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="pr-12 py-6 rounded-full"
            disabled={isTyping}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-1.5 h-8 w-8 rounded-full"
            disabled={!input.trim() || isTyping}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
