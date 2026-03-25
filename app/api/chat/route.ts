import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { messages, systemPrompt } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Groq API Key not configured on server' },
        { status: 500 }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: systemPrompt || "Você é Omega, um assistente amigável."
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || "";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('Groq API Error:', error);
    
    // Handle Rate Limits (Groq 429)
    if (error.status === 429) {
        return NextResponse.json(
            { error: 'Rate limit exceeded', code: 'rate_limit_exceeded' },
            { status: 429 }
        );
    }

    return NextResponse.json(
      { error: 'Failed to fetch from Groq' },
      { status: 500 }
    );
  }
}
