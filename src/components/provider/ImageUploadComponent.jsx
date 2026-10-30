import React, { useState, useRef } from 'react';
import { Upload, Camera, FileCheck, CheckCircle } from 'lucide-react';

const ImageUploadComponent = ({
  label,
  value,
  onChange,
  accept = 'image/*',
  type = 'image', // 'image' or 'document'
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    if (!file) return;

    if (type === 'image') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
      if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
        alert('Please select a valid image format (JPG, PNG, WEBP, or GIF).');
        return;
      }
      if (file.size && file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => {
        alert('Failed to read image file.');
      };
      reader.onloadend = () => {
        if (reader.result) {
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      onChange(file.name);
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm font-semibold text-slate-400 block">{label}</label>}
      
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3 text-center ${
          dragActive
            ? 'border-blue-500 bg-blue-500/5'
            : value
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/30 hover:bg-slate-900/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {value ? (
          <>
            {type === 'image' ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-green-500">
                <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-500/10 rounded-2xl text-green-400">
                <FileCheck className="w-8 h-8" />
              </div>
            )}
            <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
              <CheckCircle className="w-4 h-4" />
              {type === 'image' ? 'Image uploaded!' : value}
            </div>
            <p className="text-xs text-slate-500">Click or drag new file to change</p>
          </>
        ) : (
          <>
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 text-slate-400">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {type === 'image' ? 'JPG, PNG or GIF (max 5MB)' : 'PDF, DOCX or image (max 10MB)'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUploadComponent;
