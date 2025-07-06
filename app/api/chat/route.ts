import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const isDebug = false; // Set to false to disable console logs

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || undefined,
});

// Get model from environment variable (default to gpt-4o)
const OPENAI_MODEL = process.env.OPENAI_API_MODEL || 'gpt-4o';

// Get supported image types from environment variable
const SUPPORTED_IMAGE_TYPES = process.env.SUPPORTED_IMAGE_TYPES?.split(',').map(type => type.trim()) || ['image/jpeg', 'image/png'];

// Store threads in memory (in production, use a database)
const threadStore = new Map<string, string>();

export async function POST(request: NextRequest) {
  if (isDebug) {
    console.log('=== CHAT API REQUEST START ===');
    console.log('Timestamp:', new Date().toISOString());
  }

  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const threadId = formData.get('threadId') as string;
    const fileIds = formData.get('fileIds') as string;

    if (isDebug) {
      console.log('Request data:', {
        messageLength: message?.length || 0,
        threadId: threadId || 'none',
        fileIds: fileIds || 'none',
        hasApiKey: !!process.env.OPENAI_API_KEY,
        hasAssistantId: !!process.env.OPENAI_ASSISTANT_ID
      });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      if (isDebug) {
        console.error('OpenAI API key not configured or using placeholder value');
      }
      return new NextResponse('OpenAI API key not configured. Please set a valid OPENAI_API_KEY in your .env.local file.', { status: 500 });
    }

    if (!process.env.OPENAI_ASSISTANT_ID) {
      if (isDebug) {
        console.error('OpenAI Assistant ID not configured');
      }
      return new NextResponse('OpenAI Assistant ID not configured. Please set OPENAI_ASSISTANT_ID in your .env.local file.', { status: 500 });
    }

    if (isDebug) {
      console.log('Using Assistant ID:', process.env.OPENAI_ASSISTANT_ID);
    }

    // Verify assistant exists before proceeding
    if (isDebug) {
      console.log('Verifying assistant exists...');
    }
    try {
      const assistant = await openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_ID);
      if (isDebug) {
        console.log('Assistant found:', assistant.name, 'Model:', assistant.model);
      }
    } catch (assistantError: any) {
      if (isDebug) {
        console.error('Assistant verification failed:', {
          error: assistantError.message,
          status: assistantError.status,
          code: assistantError.code,
          type: assistantError.type
        });
      }
      return new NextResponse(
        `Assistant verification failed: ${assistantError.message}. Please check your OPENAI_ASSISTANT_ID in .env.local`,
        { status: 404 }
      );
    }

    // Get or create thread
    let openaiThreadId: string | undefined;

    if (threadId) {
      // Check if threadId is already an OpenAI thread ID (starts with 'thread_' but not our custom format)
      if (threadId.startsWith('thread_') && threadId.length > 20) {
        // This looks like an OpenAI thread ID, use it directly
        openaiThreadId = threadId;
      } else {
        // This is our custom thread ID, look it up in the store
        openaiThreadId = threadStore.get(threadId);
      }
    }

    if (isDebug) {
      console.log('Thread management:', {
        requestThreadId: threadId,
        existingOpenaiThreadId: openaiThreadId,
        threadStoreSize: threadStore.size
      });
    }

    if (!openaiThreadId) {
      if (isDebug) {
        console.log('Creating new thread...');
      }
      const thread = await openai.beta.threads.create();
      openaiThreadId = thread.id;
      const newThreadId = threadId || `thread_${Date.now()}`;

      // Only store in threadStore if it's our custom format
      if (!threadId || !threadId.startsWith('thread_') || threadId.length <= 20) {
        threadStore.set(newThreadId, openaiThreadId);
      }

      if (isDebug) {
        console.log('New thread created:', {
          newThreadId,
          openaiThreadId
        });
      }
    }

    // Create message with attachments if any
    if (isDebug) {
      console.log('Preparing message data...');
    }
    let messageData: any;

    if (fileIds) {
      const parsedFileIds = JSON.parse(fileIds);
      if (isDebug) {
        console.log('File attachments:', parsedFileIds);
      }

      if (parsedFileIds.length > 0) {
        // Check if we have any files to determine the message format
        try {
          // Get file details to determine type
          const fileDetails = await Promise.all(
            parsedFileIds.map(async (fileId: string) => {
              try {
                const file = await openai.files.retrieve(fileId);
                if (isDebug) {
                  console.log('File details:', {
                    id: fileId,
                    filename: file.filename,
                    purpose: file.purpose,
                    status: file.status,
                    bytes: file.bytes,
                    created_at: file.created_at
                  });
                }
                return { id: fileId, filename: file.filename, purpose: file.purpose };
              } catch (error) {
                if (isDebug) {
                  console.error(`Failed to retrieve file ${fileId}:`, error);
                }
                return null;
              }
            })
          );

          const validFiles = fileDetails.filter(Boolean);
          if (isDebug) {
            console.log('Valid files:', validFiles);
          }

          // Check if any files are images based on filename extension
          const imageFiles = validFiles.filter(file => {
            const extension = file.filename.toLowerCase().split('.').pop();
            return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
          });

          const documentFiles = validFiles.filter(file => {
            const extension = file.filename.toLowerCase().split('.').pop();
            return !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
          });

          if (isDebug) {
            console.log('Image files:', imageFiles.length, 'Document files:', documentFiles.length);
          }

          // Wait a moment for file processing if we have document files
          if (documentFiles.length > 0) {
            if (isDebug) {
              console.log('Waiting for document processing...');
            }
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          }

          if (imageFiles.length > 0) {
            // Use content array format for images
            const contentArray: any[] = [
              {
                type: 'text',
                text: message
              }
            ];

            // Add image files
            imageFiles.forEach(file => {
              contentArray.push({
                type: 'image_file',
                image_file: {
                  file_id: file.id
                }
              });
            });

            messageData = {
              role: 'user',
              content: contentArray
            };

            // If we also have document files, add them as attachments
            if (documentFiles.length > 0) {
              messageData.attachments = documentFiles.map(file => ({
                file_id: file.id,
                tools: [{ type: 'file_search' }]
              }));
            }
          } else {
            // Only document files - use traditional attachment format
            // For document files, enhance the message to explicitly mention the uploaded files
            const fileNames = validFiles.map(file => file.filename).join(', ');
            const enhancedMessage = `${message}\n\n[I have uploaded the following document(s) for you to analyze: ${fileNames}. Please read and analyze the content of this file to answer my question.]`;

            messageData = {
              role: 'user',
              content: enhancedMessage,
              attachments: validFiles.map(file => ({
                file_id: file.id,
                tools: [{ type: 'file_search' }]
              }))
            };
          }
        } catch (error) {
          if (isDebug) {
            console.error('Error processing files:', error);
          }
          // Fallback to simple message
          messageData = {
            role: 'user',
            content: message
          };
        }
      } else {
        messageData = {
          role: 'user',
          content: message
        };
      }
    } else {
      messageData = {
        role: 'user',
        content: message
      };
    }

    if (isDebug) {
      console.log('Final message data structure:', {
        hasContent: !!messageData.content,
        contentType: Array.isArray(messageData.content) ? 'array' : 'string',
        messageContent: typeof messageData.content === 'string' ? messageData.content.substring(0, 200) + '...' : 'array content',
        hasAttachments: !!messageData.attachments,
        attachmentCount: messageData.attachments?.length || 0,
        attachmentDetails: messageData.attachments?.map((att: { file_id: string; tools: any[] }) => ({ file_id: att.file_id, tools: att.tools })) || []
      });
    }

    // Add message to thread
    if (isDebug) {
      console.log('Adding message to thread:', openaiThreadId);
    }
    await openai.beta.threads.messages.create(openaiThreadId, messageData);
    if (isDebug) {
      console.log('Message added successfully');
    }

    // Create and stream the run
    if (isDebug) {
      console.log('Starting streaming run...');
    }
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          if (isDebug) {
            console.log('Sending thread ID to client...');
          }
          // Send thread ID immediately
          const threadData = JSON.stringify({
            type: 'thread_id',
            thread_id: openaiThreadId, // Send the actual OpenAI thread ID
            openai_thread_id: openaiThreadId
          });
          controller.enqueue(encoder.encode(`data: ${threadData}\n\n`));

          // Create the run with streaming
          if (isDebug) {
            console.log('Creating run with assistant:', process.env.OPENAI_ASSISTANT_ID);
          }
          const run = openai.beta.threads.runs.stream(openaiThreadId!, {
            assistant_id: process.env.OPENAI_ASSISTANT_ID!,
          });
          if (isDebug) {
            console.log('Run stream created successfully');
          }

          // Handle different event types
          run.on('textCreated', (text) => {
            if (isDebug) {
              console.log('Event: textCreated');
            }
          });

          run.on('textDelta', (textDelta, snapshot) => {
            if (isDebug) {
              console.log('Event: textDelta, content length:', textDelta.value?.length || 0);
            }
            if (textDelta.value) {
              const chunk = {
                choices: [{
                  delta: { content: textDelta.value }
                }]
              };
              const data = JSON.stringify(chunk);
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));

              // Force flush the response
              try {
                (controller as any).flush?.();
              } catch (e) {
                // Flush not supported, continue
              }
            }
          });

          run.on('toolCallCreated', (toolCall) => {
            if (isDebug) {
              console.log('Event: toolCallCreated, type:', toolCall.type);
            }
          });

          run.on('toolCallDelta', (toolCallDelta, snapshot) => {
            if (isDebug) {
              console.log('Event: toolCallDelta');
            }
          });

          run.on('end', () => {
            if (isDebug) {
              console.log('Event: end - Run completed successfully');
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          });

          run.on('error', (error) => {
            if (isDebug) {
              console.error('Event: error - Run failed:', {
                message: error.message,
                stack: error.stack,
                name: error.name
              });
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          });


        } catch (error) {
          if (isDebug) {
            console.error('Streaming setup error:', {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
              name: error instanceof Error ? error.name : undefined
            });
          }

          // Fallback to regular chat completion if assistants fail
          try {
            if (isDebug) {
              console.log('Falling back to chat completions...');
            }
            const fallbackResponse = await openai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: [{ role: 'user', content: message }],
              stream: true,
              max_tokens: 1000,
              temperature: 0.7,
            });

            for await (const chunk of fallbackResponse) {
              const data = JSON.stringify(chunk);
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          } catch (fallbackError) {
            if (isDebug) {
              console.error('Fallback error:', {
                message: fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error',
                stack: fallbackError instanceof Error ? fallbackError.stack : undefined
              });
            }
          } finally {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    if (isDebug) {
      console.error('=== CHAT API ERROR ===');
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        timestamp: new Date().toISOString()
      });
    }

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
        return new NextResponse('Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local', { status: 401 });
      }
      if (error.message.includes('quota')) {
        return new NextResponse('OpenAI API quota exceeded. Please check your usage limits.', { status: 429 });
      }
      if (error.message.includes('assistant')) {
        return new NextResponse('Assistant not found. Please check your OPENAI_ASSISTANT_ID in .env.local', { status: 404 });
      }
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }

  if (isDebug) {
    console.log('=== CHAT API REQUEST END ===');
  }
}