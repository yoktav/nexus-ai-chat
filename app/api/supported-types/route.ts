import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get supported types from environment variables
    const supportedImageTypes = process.env.SUPPORTED_IMAGE_TYPES?.split(',').map(type => type.trim()) || ['image/jpeg', 'image/png'];
    const supportedDocTypes = process.env.SUPPORTED_DOCUMENT_TYPES?.split(',').map(type => type.trim()) || ['application/pdf', 'text/plain', 'text/markdown'];
    
    const allSupportedTypes = [...supportedImageTypes, ...supportedDocTypes];
    
    return NextResponse.json({
      supportedTypes: allSupportedTypes,
      imageTypes: supportedImageTypes,
      documentTypes: supportedDocTypes
    });
  } catch (error) {
    console.error('Error fetching supported types:', error);
    return NextResponse.json({ 
      supportedTypes: [],
      imageTypes: [],
      documentTypes: []
    });
  }
}