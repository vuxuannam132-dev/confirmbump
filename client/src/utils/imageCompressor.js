/**
 * Client-side image compression utility using HTML5 Canvas.
 * Dramatically reduces file size (e.g. 5MB -> 80KB-120KB) while preserving sharp readability
 * of screenshots, text, icons, and timestamps.
 * 
 * Benefits:
 * 1. Overcomes Vercel's 4.5MB serverless payload limit.
 * 2. Speeds up upload on mobile 4G/Wifi by 10x - 20x.
 * 3. Saves massive PostgreSQL Neon database space.
 */

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1440,
    maxHeight = 1440,
    quality = 0.8,
    outputType = 'image/jpeg'
  } = options;

  // If not an image or is SVG/GIF (preserve animation), return as is
  if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file); // Fallback to original on error
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let { width, height } = img;

        // Downscale while preserving aspect ratio if dimensions exceed limits
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Fill white background for transparent PNG converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compressed blob is somehow not smaller, keep original file
              resolve(file);
              return;
            }

            const newFileName = file.name.replace(/\.[^/.]+$/, "") + '.jpg';
            const compressedFile = new File([blob], newFileName, {
              type: outputType,
              lastModified: Date.now()
            });

            // Attach original size for reporting to user
            compressedFile._originalSize = file.size;
            compressedFile._compressedSize = blob.size;

            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human readable format (e.g. 1.2 MB or 95 KB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
