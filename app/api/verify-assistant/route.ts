import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || undefined,
});

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_ASSISTANT_ID) {
      return NextResponse.json({ 
        error: 'Missing configuration',
        hasApiKey: !!process.env.OPENAI_API_KEY,
        hasAssistantId: !!process.env.OPENAI_ASSISTANT_ID
      });
    }

    // Get assistant details
    const assistant = await openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_ID);
    
    // Check if file_search tool is enabled
    const hasFileSearch = assistant.tools?.some(tool => tool.type === 'file_search') || false;
    
    return NextResponse.json({
      success: true,
      assistant: {
        id: assistant.id,
        name: assistant.name,
        model: assistant.model,
        instructions: assistant.instructions?.substring(0, 200) + '...',
        tools: assistant.tools?.map(tool => tool.type) || [],
        hasFileSearch,
        created_at: assistant.created_at,
        metadata: assistant.metadata
      },
      recommendations: !hasFileSearch ? [
        'Your assistant does not have the file_search tool enabled.',
        'To enable file search, go to https://platform.openai.com/assistants',
        'Edit your assistant and add the "File search" tool.',
        'This is required for the assistant to read and analyze uploaded documents.'
      ] : []
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to verify assistant',
      details: error.message,
      status: error.status
    });
  }
}