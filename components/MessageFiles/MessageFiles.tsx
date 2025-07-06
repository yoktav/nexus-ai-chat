'use client';

import { UploadedFile } from '@/hooks/use-chat';
import { FileText, Image } from 'lucide-react';
import NextImage from 'next/image';

interface MessageFilesProps {
  files?: UploadedFile[];
}

interface FileIconProps {
  type: string;
  /**
   * Utility class names to size the icon. Defaults to `h-4 w-4`.
   */
  className?: string;
}

function FileIcon({ type, className = 'h-4 w-4' }: FileIconProps) {
  if (type.startsWith('image/')) {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image className={className} />;
  }
  return <FileText className={className} />;
}

export default function MessageFiles({ files }: MessageFilesProps) {
  if (!files || files.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 bg-background/20 rounded-lg p-2 text-xs"
        >
          {file.url ? (
            <NextImage
              src={file.url}
              alt={file.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded object-cover"
            />
          ) : (
            <FileIcon type={file.type} />
          )}
          <span className="truncate max-w-[100px]">{file.name}</span>
        </div>
      ))}
    </div>
  );
}