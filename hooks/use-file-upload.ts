import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UploadedFile, FileUpload } from '@/hooks/use-chat';

export function useFileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const [supportedMimeTypes, setSupportedMimeTypes] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const uploadFileToOpenAI = async (file: File): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'File upload failed');
    }

    const result = await response.json();
    
    let previewUrl;
    if (file.type.startsWith('image/')) {
      previewUrl = await createImagePreview(file);
    }

    return {
      id: result.id,
      name: file.name,
      type: file.type,
      size: file.size,
      url: previewUrl,
    };
  };

  const simulateFileUpload = async (file: File) => {
    const uploadItem: FileUpload = {
      file,
      progress: 0,
      isUploading: true
    };

    setFileUploads(prev => [...prev, uploadItem]);

    try {
      const progressInterval = setInterval(() => {
        setFileUploads(prev => prev.map(item => 
          item.file === file && item.progress < 90
            ? { ...item, progress: item.progress + Math.random() * 20 }
            : item
        ));
      }, 200);

      const uploadedFile = await uploadFileToOpenAI(file);

      clearInterval(progressInterval);

      setFileUploads(prev => prev.map(item => 
        item.file === file
          ? { ...item, progress: 100, isUploading: false }
          : item
      ));

      setTimeout(() => {
        setUploadedFiles(prev => [...prev, uploadedFile]);
        setFileUploads(prev => prev.filter(item => item.file !== file));
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload file"
      });
      setFileUploads(prev => prev.filter(item => item.file !== file));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxFileSizeMB = 15;
    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
    
    files.forEach(file => {
      if (supportedMimeTypes.length > 0 && !supportedMimeTypes.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Unsupported File Type",
          description: `File "${file.name}" has an unsupported type: ${file.type}`
        });
        return;
      }
      
      if (file.size > maxFileSizeBytes) {
        toast({
          variant: "destructive",
          title: "File Too Large",
          description: `File "${file.name}" exceeds the maximum size limit of ${maxFileSizeMB}MB`
        });
        return;
      }
      
      simulateFileUpload(file);
    });
  };

  const removeUploadedFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const clearFiles = () => {
    setUploadedFiles([]);
    setFileUploads([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    uploadedFiles,
    fileUploads,
    supportedMimeTypes,
    fileInputRef,
    setSupportedMimeTypes,
    handleFileSelect,
    removeUploadedFile,
    clearFiles
  };
}