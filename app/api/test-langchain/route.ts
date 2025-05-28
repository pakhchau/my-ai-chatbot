import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // 1. Build a CoT prompt
    const prompt = PromptTemplate.fromTemplate(`You are a reasoning assistant. Think step by step.
Question: {input}
Let's think step by step.`);
    
    // 2. Create a chain
    const chain = new LLMChain({
      llm: new ChatOpenAI({
        modelName: "gpt-4o-mini",
        openAIApiKey: process.env.OPENAI_API_KEY,
      }),
      prompt,
    });
    
    // 3. Call the chain
    const chainResult = await chain.call({ input: question });
    
    // 4. Return the reasoning steps as a response
    return NextResponse.json({
      success: true,
      reasoning: chainResult.text,
      steps: chainResult.text.split(/\n|\r/).filter(Boolean),
      model: 'langchain-cot',
      question,
    });
  } catch (error) {
    console.error('LangChain test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process chain-of-thought reasoning',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 