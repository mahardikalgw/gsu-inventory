import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface QRCodeGeneratorProps {
  barcode: string;
  itemName: string;
  size?: number;
  showDownload?: boolean;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  barcode,
  itemName,
  size = 200,
  showDownload = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && barcode) {
      generateQRCode();
    }
  }, [barcode, size]);

  const generateQRCode = async () => {
    if (!canvasRef.current || !barcode) return;

    try {
      await QRCode.toCanvas(canvasRef.current, barcode, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadQRCode = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `QR-${itemName.replace(/[^a-zA-Z0-9]/g, '_')}-${barcode}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <canvas
          ref={canvasRef}
          className="block"
          width={size}
          height={size}
        />
      </div>
      
      {showDownload && (
        <Button
          onClick={downloadQRCode}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Unduh QR Code
        </Button>
      )}
      
      <div className="text-center">
        <p className="text-sm font-mono text-gray-600">{barcode}</p>
        <p className="text-xs text-gray-500">{itemName}</p>
      </div>
    </div>
  );
};

export default QRCodeGenerator; 