'use client';

import { Card } from '@/components/ui/Card';

interface WelcomeScreenProps {
  animationKey: number;
  onSuggestionClick: (suggestion: string) => void;
}

const suggestionCards = [
  "What are the advantages of using Next.js?",
  "Write code to demonstrate dijkstra's algorithm",
  "Help me write an essay about silicon valley",
  "What is the weather in San Francisco?"
];

export default function WelcomeScreen({ animationKey, onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="lg:absolute inset-0 flex flex-col items-center justify-center px-4 pb-32" style={{
      paddingTop: 'calc(var(--header-height) * 2)'
    }}>
      <div key={`title-${animationKey}`} className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 animate-title-delayed">Hello there!</h1>
        <p className="text-xl text-muted-foreground animate-subtitle-delayed">How can I help you today?</p>
      </div>

      <div key={`cards-${animationKey}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 lg:gap-4 max-w-4xl lg:max-w-4xl w-full mb-8">
        {suggestionCards.map((suggestion, index) => (
          <Card
            key={index}
            className={`p-3 lg:p-6 bg-card border border-border hover:bg-accent cursor-pointer transition-all duration-200 hover:scale-[1.02] animate-fade-in ${
              index === 0 ? 'animate-fade-in-delay-1' :
              index === 1 ? 'animate-fade-in-delay-2' :
              index === 2 ? 'animate-fade-in-delay-3' :
              'animate-fade-in-delay-4'
            }`}
            onClick={() => onSuggestionClick(suggestion)}
          >
            <p className="text-foreground font-medium leading-relaxed text-sm lg:text-base">{suggestion}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}