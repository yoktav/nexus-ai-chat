import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || undefined,
});

export async function GET(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return new NextResponse('OpenAI API key not configured', { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');

    if (!threadId) {
      return new NextResponse('Thread ID is required', { status: 400 });
    }

    try {
      // Get messages from the thread
      const messages = await openai.beta.threads.messages.list(threadId, {
        order: 'asc'
      });

      // Transform OpenAI messages to our format
      const transformedMessages = messages.data.map((message, index) => {
        const content = message.content[0];
        let messageContent = '';
        let files: any[] = [];

        if (content.type === 'text') {
          messageContent = content.text.value;
        } else if (content.type === 'image_file') {
          // Handle image files
          messageContent = '[Image]';
          files.push({
            id: content.image_file.file_id,
            name: 'Image',
            type: 'image/*',
            size: 0
          });
        }

        // Handle file attachments if any
        if (message.attachments && message.attachments.length > 0) {
          const attachmentFiles = message.attachments.map(attachment => ({
            id: attachment.file_id,
            name: `Document`,
            type: 'application/octet-stream',
            size: 0
          }));
          files = [...files, ...attachmentFiles];
        }

        return {
          id: message.id,
          role: message.role,
          content: messageContent,
          timestamp: new Date(message.created_at * 1000),
          files: files.length > 0 ? files : undefined
        };
      });

      return NextResponse.json({
        messages: transformedMessages,
        threadId
      });
    } catch (error: any) {
      if (error.status === 404) {
        return new NextResponse('Thread not found', { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    return new NextResponse('Failed to fetch messages', { status: 500 });
  }
}