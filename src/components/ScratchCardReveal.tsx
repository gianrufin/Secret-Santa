import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, Gift, Wand2 } from 'lucide-react';
import { playScratchSound, playChimeSound } from '../utils/audio';
import { fireUnwrapConfetti } from '../utils/confetti';

interface ScratchCardRevealProps {
  recipientName: string;
  onRevealed: () => void;
}

export const ScratchCardReveal: React.FC<ScratchCardRevealProps> = ({
  recipientName,
  onRevealed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw festive gold foil on canvas
    const width = canvas.width;
    const height = canvas.height;

    // Rich gold holiday foil gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#d97706'); // amber-600
    gradient.addColorStop(0.3, '#f59e0b'); // amber-500
    gradient.addColorStop(0.5, '#fef3c7'); // gold highlight
    gradient.addColorStop(0.7, '#d97706');
    gradient.addColorStop(1, '#b45309');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle holiday texture pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < width; i += 20) {
      for (let j = 0; j < height; j += 20) {
        if ((i + j) % 40 === 0) {
          ctx.beginPath();
          ctx.arc(i + 10, j + 10, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Text on foil
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#78350f';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Scratch here with your mouse/touch ✨', width / 2, height / 2 - 10);
    ctx.font = '11px sans-serif';
    ctx.fillText('to reveal your Secret Santa recipient', width / 2, height / 2 + 14);
  }, []);

  const handleScratch = (clientX: number, clientY: number) => {
    if (isComplete) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    playScratchSound();

    // Check completion threshold periodically
    if (Math.random() < 0.25) {
      checkCompletion();
    }
  };

  const checkCompletion = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let transparentPixels = 0;
    const totalPixels = data.length / 4;

    for (let i = 3; i < data.length; i += 16) {
      if (data[i] === 0) {
        transparentPixels++;
      }
    }

    const percent = Math.round((transparentPixels / (totalPixels / 4)) * 100);
    setScratchPercent(percent);

    if (percent > 45 && !isComplete) {
      triggerRevealComplete();
    }
  };

  const triggerRevealComplete = () => {
    setIsComplete(true);
    playChimeSound();
    fireUnwrapConfetti();
    setTimeout(() => {
      onRevealed();
    }, 400);
  };

  return (
    <div className="max-w-md mx-auto text-center space-y-4">
      <div className="relative w-full max-w-sm mx-auto h-48 rounded-xl overflow-hidden border-2 border-amber-300 dark:border-amber-700 shadow-md bg-white dark:bg-zinc-900 select-none">
        {/* Recipient underneath */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-50 to-amber-50 dark:from-zinc-900 dark:to-zinc-800">
          <span className="text-[11px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
            Your Secret Match
          </span>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">
            {recipientName}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Keep it a secret until exchange day!
          </p>
        </div>

        {/* Scratchable Canvas */}
        <canvas
          ref={canvasRef}
          width={380}
          height={192}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          onMouseDown={() => setIsScratching(true)}
          onMouseUp={() => setIsScratching(false)}
          onMouseLeave={() => setIsScratching(false)}
          onMouseMove={(e) => {
            if (isScratching) {
              handleScratch(e.clientX, e.clientY);
            }
          }}
          onTouchStart={() => setIsScratching(true)}
          onTouchEnd={() => setIsScratching(false)}
          onTouchMove={(e) => {
            if (e.touches[0]) {
              handleScratch(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
        />
      </div>

      {/* Instant reveal fallback button */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={triggerRevealComplete}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-colors cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Reveal</span>
        </button>
      </div>
    </div>
  );
};
