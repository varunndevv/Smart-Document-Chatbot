import { google } from '@ai-sdk/google';
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

export const maxDuration = 30;

// Input validation schema
const chatSchema = z.object({
  messages: z.array(z.any()),
  pdfText: z.string().max(500000).optional(), // Limit PDF text to ~500k chars to prevent DoS
});

export async function POST(req: NextRequest) {
  // 1. Rate Limiting
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.success) {
    return new Response('Too Many Requests', { status: 429 });
  }

  try {
    // 2. Parse Body & Validate
    const body = await req.json();
    const validation = chatSchema.safeParse(body);

    if (!validation.success) {
      return new Response('Invalid request body', { status: 400 });
    }

    const { messages, pdfText } = validation.data;

    // 3. Sanitization / Truncation
    const sanitizedPdfText = pdfText ? pdfText.slice(0, 200000) : '';

    console.log('[API /chat] pdfText length:', sanitizedPdfText.length, '| messages:', messages.length);

    const systemPrompt = sanitizedPdfText
      ? `You are a helpful document assistant. The user has uploaded a document. Answer their questions based on the following document content. If the answer is not in the document, say so clearly.\n\nDocument content:\n${sanitizedPdfText}`
      : 'You are a helpful assistant.';

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages as UIMessage[]),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    // 4. Secure Error Handling
    console.error('[API /chat] Internal Error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

