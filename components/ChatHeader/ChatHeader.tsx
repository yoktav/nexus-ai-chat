'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { PanelsLeftBottom, Plus } from 'lucide-react';
import ModelSelector from '@/components/ModelSelector';
import ThemeToggle from '@/components/ThemeToggle';

interface ChatHeaderProps {
  isChatHistoryOpen: boolean;
  onToggleChatHistory: () => void;
  onNewChat: () => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ChatHeader({
  isChatHistoryOpen,
  onToggleChatHistory,
  onNewChat,
  selectedModel,
  onModelChange
}: ChatHeaderProps) {
  const router = useRouter();

  const handleNewChat = () => {
    onNewChat();
    router.push('/');
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 border-b border-border/50" style={{ height: 'var(--header-height)' }}>
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleChatHistory}
            >
              <PanelsLeftBottom className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isChatHistoryOpen ? 'Hide' : 'Show'} previous chats</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewChat}
              className="hover:bg-accent"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>New chat</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="flex items-center gap-4">
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={onModelChange}
        />
        <ThemeToggle />
      </div>
    </header>
  );
}