'use client';

import { useState } from 'react';
import { ChainOfThought } from '@/components/message-reasoning';

interface CoTResult {
  success: boolean;
  reasoning: string;
  steps: string[];
  model: string;
  question: string;
  error?: string;
  details?: string;
}

export default function TestCoTPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<CoTResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-langchain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        reasoning: '',
        steps: [],
        model: '',
        question,
        error: 'Failed to fetch',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">LangChain Chain-of-Thought Test</h1>
        
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col gap-4">
            <label htmlFor="question" className="text-sm font-medium">
              Ask a question that requires reasoning:
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., If I have 3 apples and buy 2 more, then give away 1, how many do I have?"
              className="w-full p-3 border rounded-lg resize-none h-24"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Thinking...' : 'Ask Question'}
            </button>
          </div>
        </form>

        {isLoading && (
          <ChainOfThought
            reasoning=""
            steps={[]}
            isLoading={true}
          />
        )}

        {result && !isLoading && (
          <div className="space-y-4">
            {result.success ? (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-800">Question:</h3>
                  <p className="text-green-700">{result.question}</p>
                </div>
                
                <ChainOfThought
                  reasoning={result.reasoning}
                  steps={result.steps}
                  isLoading={false}
                />
              </>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-medium text-red-800">Error:</h3>
                <p className="text-red-700">{result.error}</p>
                {result.details && (
                  <p className="text-red-600 text-sm mt-2">{result.details}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">About This Test</h2>
          <p className="text-muted-foreground mb-4">
            This page demonstrates the LangChain chain-of-thought integration. It uses:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><strong>LangChain:</strong> For orchestrating the reasoning chain</li>
            <li><strong>OpenAI GPT-4o-mini:</strong> As the underlying language model</li>
            <li><strong>Chain-of-Thought prompting:</strong> To encourage step-by-step reasoning</li>
            <li><strong>Custom UI component:</strong> To display reasoning steps in an expandable format</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 