import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // 1. Create the LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
    
    // 2. Build a CoT prompt
    const prompt = PromptTemplate.fromTemplate(`You are a reasoning assistant. Think step by step.
Question: {input}

Let's think step by step:
1. First, I'll analyze the question
2. Then, I'll break down the problem
3. Finally, I'll provide a clear answer

Please provide your reasoning step by step.`);
    
    // 3. Format the prompt and call the LLM
    const formattedPrompt = await prompt.format({ input: question });
    const result = await llm.invoke(formattedPrompt);
     
    // 4. Parse the response into steps
    const reasoning = result.content.toString();
    const steps = reasoning.split(/\n/).filter(line => 
      line.trim().length > 0 && 
      (line.includes('Step') || line.match(/^\d+\./) || line.includes('First') || line.includes('Then') || line.includes('Finally'))
    );

    return NextResponse.json({
      success: true,
      reasoning,
      steps,
      model: 'langchain-cot',
      question,
    });

  } catch (error: any) {
    console.error('LangChain error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Failed to process with LangChain',
    }, { status: 500 });
  }
} 