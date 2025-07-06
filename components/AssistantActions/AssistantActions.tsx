'use client';

import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { Copy, Flag } from 'lucide-react';

interface AssistantActionsProps {
  content: string;
  onCopy: (text: string) => void;
  onReport: () => void;
}

export default function AssistantActions({ content, onCopy, onReport }: AssistantActionsProps) {
  return (
    <div className="flex items-center gap-2 ml-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCopy(content)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors animate-fade-in-delay-1"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReport}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors animate-fade-in-delay-2"
          >
            <Flag className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Report</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}