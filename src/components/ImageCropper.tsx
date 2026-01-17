'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
  circularCrop?: boolean;
  minDimension?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  circularCrop = true,
  minDimension = 150,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const newCrop = centerAspectCrop(width, height, aspectRatio);
      setCrop(newCrop);
    },
    [aspectRatio]
  );

  const getCroppedImage = useCallback(async () => {
    const image = imgRef.current;
    const canvas = canvasRef.current;

    if (!image || !canvas || !completedCrop) {
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;

    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;
    const outputSize = Math.max(cropWidth, cropHeight, minDimension);

    canvas.width = outputSize * pixelRatio;
    canvas.height = outputSize * pixelRatio;

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;

    const rotateRads = (rotate * Math.PI) / 180;
    const centerX = outputSize / 2;
    const centerY = outputSize / 2;

    ctx.save();

    if (circularCrop) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, outputSize / 2, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
    }

    ctx.translate(centerX, centerY);
    ctx.rotate(rotateRads);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    const drawX = (outputSize - cropWidth) / 2;
    const drawY = (outputSize - cropHeight) / 2;

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      drawX,
      drawY,
      cropWidth,
      cropHeight
    );

    ctx.restore();

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    onCropComplete(base64);
  }, [completedCrop, scale, rotate, circularCrop, minDimension, onCropComplete]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleRotate = () => {
    setRotate((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotate(0);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">قص الصورة</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto bg-gray-900 flex items-center justify-center min-h-[300px]">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            circularCrop={circularCrop}
            className="max-w-full max-h-[60vh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              alt="Crop"
              src={imageSrc}
              style={{
                transform: `scale(${scale}) rotate(${rotate}deg)`,
                maxHeight: '60vh',
                maxWidth: '100%',
              }}
              onLoad={onImageLoad}
              className="block"
            />
          </ReactCrop>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                title="تصغير"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <div className="px-3 py-1 bg-white border rounded-lg text-sm font-medium min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </div>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                title="تكبير"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRotate}
                className="p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                title="تدوير"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                إعادة تعيين
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 text-center mb-4">
            اسحب لتحديد المنطقة المراد قصها • استخدم أزرار التكبير للتحكم في الحجم
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={getCroppedImage}
              disabled={!completedCrop}
              className="flex-1 py-3 px-4 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2d5a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              تأكيد القص
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
