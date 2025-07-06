'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ChevronDown, Check } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';

interface ModelOption {
  id: string;
  name: string;
  description: string;
}

const models: ModelOption[] = [
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat',
  },
  {
    id: 'reasoning-model',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const selectedModelData = models.find(m => m.id === selectedModel) || models[0];

  return (
    <Select value={selectedModel} onValueChange={onModelChange}>
      <SelectTrigger className="bg-background border-border hover:bg-accent text-foreground min-w-[140px] w-48 h-10 justify-between">
        <SelectValue>
          {selectedModelData.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-80 bg-background border border-border rounded-lg shadow-lg p-2">
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id} className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors">
            <div>
              <div className="font-medium text-sm">{model.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{model.description}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}