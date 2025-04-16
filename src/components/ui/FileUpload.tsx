import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  description?: string;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  accept = '.pdf,.doc,.docx,.txt',
  maxSize = 10 * 1024 * 1024, // 10MB
  label = 'Upload File',
  description = 'Drag and drop your file here or click to browse',
  className
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleFile = (file: File) => {
    setError(null);

    // Validate file type
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = accept.split(',').map(type => 
      type.trim().replace('.', '').toLowerCase()
    );
    
    if (!acceptedTypes.includes(fileType || '')) {
      setError(`Invalid file type. Please upload ${accept} files only.`);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
      return;
    }

    setFile(file);
    onFileSelect(file);
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        className={cn(
          "group relative overflow-hidden rounded-lg border-2 transition-all duration-300",
          isDragging ? "border-primary-500 bg-primary-500/5" : "border-dark-700 hover:border-dark-600",
          error ? "border-red-500 bg-red-500/5" : "",
          file ? "bg-dark-800/50" : "bg-dark-800/30"
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleFileSelect}
        />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-dark-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <button
                    onClick={removeFile}
                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-dark-700 transition-colors"
                  >
                    <X className="h-4 w-4 text-dark-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center p-4 sm:p-6"
              onClick={() => inputRef.current?.click()}
            >
              <motion.div
                className="h-12 w-12 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-lg flex items-center justify-center"
                animate={{
                  scale: isDragging ? 1.1 : 1,
                  rotate: isDragging ? [0, -10, 10, -10, 0] : 0,
                }}
                transition={{ duration: 0.4 }}
              >
                <Upload className="h-6 w-6 text-primary-500" />
              </motion.div>
              <div className="mt-3 text-center">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="mt-1 text-xs text-dark-400">{description}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="mt-2 text-xs text-dark-400">
        Supported formats: PDF, DOC, DOCX, TXT (max {maxSize / (1024 * 1024)}MB)
      </p>
    </div>
  );
}