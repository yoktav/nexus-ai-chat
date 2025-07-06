'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Square, Paperclip, X, FileText, Image, ArrowUp } from 'lucide-react';
import { UploadedFile, FileUpload } from '@/hooks/use-chat';
import NextImage from 'next/image';

interface ChatInputProps {
  onSubmit: (message: string, files: UploadedFile[]) => void;
  isLoading: boolean;
  onStop: () => void;
  uploadedFiles: UploadedFile[];
  fileUploads: FileUpload[];
  supportedMimeTypes: string[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (fileId: string) => void;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image className="h-4 w-4" />;
  }
  return <FileText className="h-4 w-4" />;
};

export default function ChatInput({
  onSubmit,
  isLoading,
  onStop,
  uploadedFiles,
  fileUploads,
  supportedMimeTypes,
  fileInputRef,
  onFileSelect,
  onRemoveFile
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if ((!inputValue.trim() && uploadedFiles.length === 0) || isLoading) return;

    onSubmit(inputValue, uploadedFiles);
    setInputValue('');
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6 border-border">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            {/* File Upload Progress */}
            {fileUploads.map((upload, index) => (
              <div key={index} className="mb-3 flex items-center gap-2 p-3 bg-muted rounded-xl relative overflow-hidden">
                {getFileIcon(upload.file.type)}
                <span className="text-sm text-muted-foreground">
                  Uploading {upload.file.name}...
                </span>
                <div className="absolute bottom-0 left-0 h-1 bg-background rounded-full overflow-hidden w-full">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ))}

            {/* Uploaded Files */}
            {uploadedFiles.map((file) => (
              <div key={file.id} className="mb-3 flex items-center gap-2 p-3 bg-muted rounded-xl">
                {file.url ? (
                  <NextImage
                    src={file.url}
                    alt={file.name}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded object-cover"
                  />
                ) : (
                  getFileIcon(file.type)
                )}
                <span className="text-sm text-muted-foreground flex-1 truncate">
                  {file.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(file.id)}
                  className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="relative bg-muted rounded-3xl border border-border focus-within:border-ring transition-colors">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Send a message..."
                className="min-h-[60px] max-h-[200px] resize-none bg-transparent border-none focus:ring-0 text-foreground placeholder-muted-foreground pr-16 pl-14 py-4 rounded-3xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept={supportedMimeTypes.length > 0 ? supportedMimeTypes.join(',') : undefined}
                onChange={onFileSelect}
                multiple
                className="hidden"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-3 top-3 text-muted-foreground hover:text-foreground h-8 w-8"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Button
                type={isLoading ? "button" : "submit"}
                size="icon"
                onClick={isLoading ? onStop : undefined}
                disabled={!isLoading && (!inputValue.trim() && uploadedFiles.length === 0)}
                className="absolute right-3 top-3 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 h-8 w-8 rounded-full"
              >

                {isLoading ? (
                  <Square className="h-4 w-4" fill="currentColor" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}