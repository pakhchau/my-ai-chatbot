'use client';

import { useState } from 'react';
import { ChevronDownIcon } from './icons';
import { cn } from '@/lib/utils';

interface ChainOfThoughtProps {
  reasoning: string;
  steps: string[];
  isLoading?: boolean;
}

export function ChainOfThought({ reasoning, steps, isLoading = false }: ChainOfThoughtProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium">Thinking step by step...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-left hover:bg-muted/70 p-2 rounded transition-colors"
      >
        <div className={cn("transition-transform", isExpanded ? "rotate-0" : "-rotate-90")}>
          <ChevronDownIcon size={16} />
        </div>
        <span className="text-sm font-medium">
          Chain of Thought Reasoning ({steps.length} steps)
        </span>
      </button>
      
      {isExpanded && (
        <div className="space-y-3 mt-2">
          <div className="text-sm text-muted-foreground">
            <strong>Full Reasoning:</strong>
          </div>
          <div className="text-sm whitespace-pre-wrap bg-background p-3 rounded border">
            {reasoning}
          </div>
          
          {steps.length > 0 && (
            <>
              <div className="text-sm text-muted-foreground">
                <strong>Reasoning Steps:</strong>
              </div>
              <ol className="space-y-2">
                {steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}
