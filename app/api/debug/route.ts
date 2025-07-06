import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || undefined,
});

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        hasApiKey: false 
      });
    }

    if (!process.env.OPENAI_ASSISTANT_ID) {
      return NextResponse.json({ 
        error: 'OpenAI Assistant ID not configured',
        hasAssistantId: false 
      });
    }

    // Test API key by listing assistants
    try {
      // First, try to retrieve the specific assistant
      let configuredAssistant = null;
      let assistantError = null;
      
      if (process.env.OPENAI_ASSISTANT_ID) {
        try {
          configuredAssistant = await openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_ID);
        } catch (error: any) {
          assistantError = error.message;
        }
      }

      const assistants = await openai.beta.assistants.list({ limit: 10 });
      
      // Also check in the list (backup verification)
      const assistantInList = assistants.data.find(
        assistant => assistant.id === process.env.OPENAI_ASSISTANT_ID
      );

      return NextResponse.json({
        hasApiKey: true,
        hasAssistantId: true,
        configuredAssistantId: process.env.OPENAI_ASSISTANT_ID,
        assistantExists: !!configuredAssistant,
        assistantInList: !!assistantInList,
        assistantError,
        assistantDetails: configuredAssistant || null,
        availableAssistants: assistants.data.map(assistant => ({
          id: assistant.id,
          name: assistant.name,
          model: assistant.model,
          created_at: assistant.created_at,
          tools: assistant.tools?.map(tool => tool.type) || []
        }))
      });
    } catch (apiError: any) {
      return NextResponse.json({
        hasApiKey: true,
        hasAssistantId: true,
        error: 'API Error',
        details: apiError.message,
        status: apiError.status
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error.message
    });
  }
}