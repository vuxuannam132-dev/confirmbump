import React, { useState, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  ExternalLink,
  Maximize2
} from 'lucide-react';

/**
 * Safely open any image (including data:image/... base64) in a new browser tab
 * without Chrome blocking top-frame navigation.
 */
export function openImageInNewTab(imageUrl) {
  if (!imageUrl) return;

  try {
    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const newWin = window.open(blobUrl, '_blank');
      if (!newWin) {
        window.location.href = blobUrl;
      }
      return;
    }
  } catch (err) {
    console.error('Failed to create Blob URL for image:', err);
  }

  window.open(imageUrl, '_blank');
}

/**
 * Download image to local file system
 */
export function downloadImage(imageUrl, filename = 'minh-chung-bump.jpg') {
  if (!imageUrl) return;

  try {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Download error:', err);
    openImageInNewTab(imageUrl);
  }
}

export default function ImageLightboxModal({ isOpen, imageUrl, title = 'Minh chứng hình ảnh', onClose }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.25, 4));
      if (e.key === '-') setScale(s => Math.max(s - 0.25, 0.5));
      if (e.key === 'r' || e.key === 'R') setRotation(r => (r + 90) % 360);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setScale(s => Math.min(s + 0.25, 4));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setScale(s => Math.max(s - 0.25, 0.5));
  };

  const handleResetZoom = (e) => {
    e.stopPropagation();
    setScale(1);
    setRotation(0);
  };

  const handleRotate = (e) => {
    e.stopPropagation();
    setRotation(r => (r + 90) % 360);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadImage(imageUrl, `minh-chung-${Date.now()}.jpg`);
  };

  const handleOpenTab = (e) => {
    e.stopPropagation();
    openImageInNewTab(imageUrl);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div 
        className="px-4 py-3 sm:px-6 flex items-center justify-between bg-black/50 border-b border-white/10 text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-2">
          <Maximize2 className="w-4 h-4 text-yellow-400" />
          <span className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-md">
            {title}
          </span>
          <span className="hidden sm:inline-block text-[11px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleOpenTab}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            title="Mở ảnh ở tab mới (Hỗ trợ chống lỗi trắng trang)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mở tab mới</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            title="Tải ảnh về máy"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tải về</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-red-600 text-white transition-colors"
            title="Đóng (Phím Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        <div 
          className="transition-transform duration-150 ease-out max-w-full max-h-full flex items-center justify-center"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt="Proof preview"
            className="max-h-[82vh] max-w-[92vw] object-contain rounded-lg shadow-2xl border border-white/10 pointer-events-auto"
            draggable={false}
          />
        </div>
      </div>

      {/* Floating Bottom Toolbar */}
      <div 
        className="pb-4 pt-2 flex items-center justify-center z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-900/90 border border-white/15 px-3 sm:px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md text-white text-xs">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-xl hover:bg-white/15 transition-colors"
            title="Thu nhỏ (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2.5 py-1 rounded-xl hover:bg-white/15 text-[11px] font-bold transition-colors"
            title="Kích thước gốc (100%)"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-xl hover:bg-white/15 transition-colors"
            title="Phóng to (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/20 mx-1" />

          <button
            type="button"
            onClick={handleRotate}
            className="p-2 rounded-xl hover:bg-white/15 transition-colors"
            title="Xoay 90 độ (Phím R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
