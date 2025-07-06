import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const isDebug = false; // Set to false to disable console logs

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || undefined,
});

// Get max file size from environment variable (default to 15MB)
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '15');
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Node < 20 lacks a global File constructor which OpenAI SDK expects.
// Provide a minimal polyfill when running on such environments.
if (typeof (globalThis as any).File === 'undefined') {
  class FilePolyfill extends Blob {
    name: string;
    lastModified: number;

    constructor(fileBits: BlobPart[], fileName: string, options: any = {}) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options.lastModified ?? Date.now();
    }
  }
  // @ts-ignore — we are intentionally attaching to global scope
  globalThis.File = FilePolyfill;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return new NextResponse('OpenAI API key not configured', { status: 500 });
    }

    // Get supported image types from environment variable
    const supportedImageTypes = process.env.SUPPORTED_IMAGE_TYPES?.split(',').map(type => type.trim()) || ['image/jpeg', 'image/png'];

    // Get supported document types from environment variable
    const supportedDocTypes = process.env.SUPPORTED_DOCUMENT_TYPES?.split(',').map(type => type.trim()) || ['application/pdf', 'text/plain', 'text/markdown'];

    const allSupportedTypes = [...supportedImageTypes, ...supportedDocTypes];

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new NextResponse('No file provided', { status: 400 });
    }

    // Validate file type against supported types
    if (allSupportedTypes.length > 0 && !allSupportedTypes.includes(file.type)) {
      return new NextResponse(
        `File type "${file.type}" is not supported. Supported types: ${allSupportedTypes.join(', ')}`,
        { status: 415 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return new NextResponse(`File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB`, { status: 413 });
    }

    // Convert the uploaded file to a Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Use OpenAI helper to wrap the buffer with filename metadata
    const openaiUploadFile = await OpenAI.toFile(fileBuffer, file.name);

    // Upload file to OpenAI
    if (isDebug) {
      console.log('Uploading file to OpenAI:', {
        filename: file.name,
        type: file.type,
        size: file.size
      });
    }

    const uploadedFile = await openai.files.create({
      // Provide the correctly packaged file
      file: openaiUploadFile,
      purpose: 'assistants',
    });

    if (isDebug) {
      console.log('File uploaded successfully:', {
        id: uploadedFile.id,
        filename: uploadedFile.filename,
        purpose: uploadedFile.purpose,
        status: uploadedFile.status,
        bytes: uploadedFile.bytes
      });
    }

    // For document files, wait a bit for processing and then check status
    if (file.type.startsWith('application/') || file.type.startsWith('text/')) {
      if (isDebug) {
        console.log('Document file detected, checking processing status...');
      }

      // Wait a moment for initial processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        const fileStatus = await openai.files.retrieve(uploadedFile.id);
        if (isDebug) {
          console.log('File processing status:', {
            id: fileStatus.id,
            status: fileStatus.status,
            status_details: fileStatus.status_details
          });
        }
      } catch (statusError) {
        if (isDebug) {
          console.error('Failed to check file status:', statusError);
        }
      }
    }

    return NextResponse.json({
      id: uploadedFile.id,
      filename: uploadedFile.filename,
      bytes: uploadedFile.bytes,
      purpose: uploadedFile.purpose,
    });
  } catch (error) {
    if (isDebug) {
      console.error('File upload error:', error);
    }

    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Incorrect API key')) {
        return new NextResponse('Invalid OpenAI API key', { status: 401 });
      }
      if (error.message.includes('quota')) {
        return new NextResponse('OpenAI API quota exceeded', { status: 429 });
      }
      if (error.message.includes('413') || error.message.includes('File size')) {
        return new NextResponse(`File size exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB`, { status: 413 });
      }
    }

    return new NextResponse('File upload failed', { status: 500 });
  }
}