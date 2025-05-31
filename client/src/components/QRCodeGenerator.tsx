import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  data: {
    flupsyId: number;
    flupsyName: string;
    row: string;
    position: number;
  };
  size?: number;
  className?: string;
}

export default function QRCodeGenerator({ data, size = 60, className = "" }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const qrData = JSON.stringify({
        flupsyId: data.flupsyId,
        flupsyName: data.flupsyName,
        row: data.row,
        position: data.position
      });

      QRCode.toCanvas(canvasRef.current, qrData, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch(err => {
        console.error('Errore generazione QR code:', err);
      });
    }
  }, [data, size]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`${className}`}
      style={{ maxWidth: size, maxHeight: size }}
    />
  );
}