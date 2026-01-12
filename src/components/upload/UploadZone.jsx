import React, { useCallback, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function UploadZone({ onUpload, isUploading }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        onUpload(file);
      }
    }
  }, [onUpload]);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <label
        htmlFor="resume-upload"
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-64 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group",
          isDragging
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 hover:bg-zinc-800/50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          id="resume-upload"
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
        />
        
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <p className="text-zinc-400 text-sm">Analyzing resume...</p>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <div className={cn(
                "p-4 rounded-2xl mb-4 transition-all duration-300",
                isDragging ? "bg-emerald-500/20" : "bg-zinc-800 group-hover:bg-zinc-700"
              )}>
                {isDragging ? (
                  <FileText className="w-10 h-10 text-emerald-500" />
                ) : (
                  <Upload className="w-10 h-10 text-zinc-400 group-hover:text-zinc-300" />
                )}
              </div>
              <p className="text-zinc-300 font-medium mb-1">
                {isDragging ? "Drop your resume here" : "Upload Resume PDF"}
              </p>
              <p className="text-zinc-500 text-sm">
                Drag & drop or click to browse
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none",
          isDragging ? "opacity-100" : "opacity-0",
          "bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10"
        )} />
      </label>
    </motion.div>
  );
}