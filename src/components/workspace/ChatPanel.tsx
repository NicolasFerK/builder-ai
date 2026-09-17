import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatMessage } from '@/types';
import { useProjects } from '@/hooks/useProjects';
import { useParams } from 'react-router-dom';

export function ChatPanel() {
  const { projectId } = useParams();
  const { projects, updateProject } = useProjects();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentProject = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [currentProject?.chatHistory]);

  const handleSendMessage = () => {
    if (!input.trim() || !currentProject) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    const updatedHistory = [...currentProject.chatHistory, userMessage];
    updateProject(currentProject.id, { chatHistory: updatedHistory });
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I've received your request: "${input}". I'm processing this and will start building the application based on your description. (This is a simulated response)`,
        timestamp: Date.now(),
      };
      updateProject(currentProject.id, { 
        chatHistory: [...updatedHistory, aiMessage] 
      });
    }, 1000);
  };

  if (!currentProject) return null;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Chat</h2>
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
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute right-1.5 h-8 w-8 rounded-full"
            disabled={!input.trim()}
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
