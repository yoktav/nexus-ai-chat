import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const isDebug = false; // Set to false to disable console logs

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || undefined,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new NextResponse('OpenAI API key not configured', { status: 500 });
    }

    const { fileId } = await request.json();

    if (!fileId) {
      return new NextResponse('File ID is required', { status: 400 });
    }

    // Get file details
    const file = await openai.files.retrieve(fileId);

    // Try to get file content (this might not work for all file types)
    let contentPreview = null;
    try {
      const content = await openai.files.content(fileId);
      const text = await content.text();
      contentPreview = text.substring(0, 500); // First 500 characters
    } catch (contentError) {
      if (isDebug) {
        console.log('Could not retrieve file content directly:', contentError);
      }
    }

    // Create a test thread and message to see how the assistant processes the file
    const testThread = await openai.beta.threads.create();

    // Verify thread was created successfully
    if (!testThread || !testThread.id) {
      return new NextResponse('Failed to create OpenAI thread', { status: 500 });
    }

    const testMessage = await openai.beta.threads.messages.create(testThread.id, {
      role: 'user',
      content: 'Please tell me what content you can see in the uploaded file. Just describe what text or information is visible to you.',
      attachments: [{
        file_id: fileId,
        tools: [{ type: 'file_search' }]
      }]
    });

    // Run the assistant to see what it can extract
    const run = await openai.beta.threads.runs.create(testThread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!
    });

    // Wait for completion (with timeout)
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: testThread.id });
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      if (attempts >= maxAttempts) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: testThread.id });
      attempts++;
    }

    let assistantResponse = null;
    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(testThread.id);
      const lastMessage = messages.data[0];
      if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
        assistantResponse = lastMessage.content[0].text.value;
      }
    }

    // Clean up test thread
    try {
      await openai.beta.threads.delete(testThread.id);
    } catch (cleanupError) {
      if (isDebug) {
        console.log('Failed to cleanup test thread:', cleanupError);
      }
    }

    return NextResponse.json({
      file: {
        id: file.id,
        filename: file.filename,
        purpose: file.purpose,
        status: file.status,
        status_details: file.status_details,
        bytes: file.bytes,
        created_at: file.created_at
      },
      contentPreview,
      assistantResponse,
      runStatus: runStatus.status,
      testCompleted: runStatus.status === 'completed'
    });

  } catch (error) {
    if (isDebug) {
      console.error('File verification error:', error);
    }
    return new NextResponse(
      error instanceof Error ? error.message : 'File verification failed',
      { status: 500 }
    );
  }
}