import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { QrCode, Camera, Search, Package, MapPin, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera as ReactCamera } from 'react-camera-pro';

interface ScannedItem {
  id: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  brand: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_price: number;
  warranty_expiry: string;
  supplier: string;
  notes: string;
  image_url: string;
  created_at: string;
  locations?: {
    name: string;
  };
}

const BarcodeScannerPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const cameraRef = useRef<{ video: HTMLVideoElement } | null>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  // Reset search data
  const resetSearchData = () => {
    setScannedItem(null);
    setManualBarcode('');
    setScannedCode('');
  };

  const startScanning = () => {
    setIsScanning(true);
    // Start ZXing scanner
    if (cameraRef.current) {
      codeReader.current = new BrowserMultiFormatReader();
      codeReader.current.decodeFromVideoDevice(undefined, cameraRef.current.video, (result, err) => {
        if (result && isScanning) {
          const code = result.getText();
          setScannedCode(code);
          setIsScanning(false);
          stopScanning();
          searchByBarcode(code);
        }
        // ignore NotFoundException, just keep scanning
      });
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (codeReader.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (codeReader.current as any).reset();
      } catch (e) {
        // ignore reset errors
      }
      codeReader.current = null;
    }
  };

  const searchByBarcode = async (barcode: string) => {
    if (!barcode.trim()) return;

    setLoading(true);
    try {
      // Fetch item first
      const { data: itemData, error: itemError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('barcode', barcode.trim())
        .single();

      if (itemError) {
        if (itemError.code === 'PGRST116') {
          toast.error('Item tidak ditemukan dengan barcode ini');
          setScannedItem(null);
        } else {
          throw itemError;
        }
      } else {
        // Fetch location separately if item has location_id
        let locationData = null;
        if (itemData.location_id) {
          const { data: locData, error: locError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', itemData.location_id)
            .single();
          
          if (!locError) {
            locationData = locData;
          }
        }

        // Combine the data
        const combinedItem = {
          ...itemData,
          locations: locationData
        };

        setScannedItem(combinedItem);
        toast.success('Item ditemukan!');
      }
    } catch (error) {
      console.error('Error searching item:', error);
      toast.error('Gagal mencari item');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = () => {
    searchByBarcode(manualBarcode);
  };

  // Clear search results
  const clearSearch = () => {
    resetSearchData();
  };

  const getConditionBadgeVariant = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'fair': return 'outline';
      case 'poor': return 'destructive';
      case 'damaged': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatCategoryName = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'office_equipment': 'Peralatan Kantor',
      'furniture': 'Furnitur',
      'it_devices': 'Perangkat IT',
      'vehicle': 'Kendaraan',
      'tools': 'Peralatan',
      'other': 'Lainnya'
    };
    return categoryMap[category] || category;
  };

  const formatConditionName = (condition: string) => {
    const conditionMap: { [key: string]: string } = {
      'excellent': 'Sangat Baik',
      'good': 'Baik',
      'fair': 'Cukup',
      'poor': 'Buruk',
      'damaged': 'Rusak'
    };
    return conditionMap[condition] || condition;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  useEffect(() => {
    return () => {
      stopScanning();
      resetSearchData();
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Pemindai Barcode</h1>
        <p className="text-muted-foreground">
          Pindai barcode untuk menemukan item inventaris dengan cepat
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Pemindai Barcode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera Scanner */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  onClick={isScanning ? stopScanning : startScanning}
                  className="bg-gradient-primary hover:bg-primary-hover"
                >
                  {isScanning ? (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Hentikan Pemindai
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Mulai Pemindai
                    </>
                  )}
                </Button>
              </div>

              {isScanning ? (
                <div className="relative">
                  <ReactCamera
                    ref={cameraRef}
                    facingMode="environment"
                    aspectRatio={4/3}
                    errorMessages={{
                      noCameraAccessible: 'Tidak dapat mengakses kamera',
                      permissionDenied: 'Izin kamera ditolak',
                      switchCamera: 'Ganti kamera',
                      canvas: 'Canvas tidak tersedia'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-white/50 rounded-lg p-4">
                      <div className="w-48 h-32 border-2 border-white rounded"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Klik "Mulai Pemindai" untuk memulai</p>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Search */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">Pencarian Manual</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Masukkan barcode secara manual"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                />
                <Button 
                  onClick={handleManualSearch}
                  disabled={loading || !manualBarcode.trim()}
                  className="bg-gradient-primary hover:bg-primary-hover"
                >
                  {loading ? 'Mencari...' : 'Cari'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Hasil Pencarian
              </div>
              {scannedItem && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSearch}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Bersihkan
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Mencari item...</p>
              </div>
            ) : scannedItem ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{scannedItem.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {scannedItem.brand} {scannedItem.model}
                    </p>
                  </div>
                  <Badge variant={getConditionBadgeVariant(scannedItem.condition)}>
                    {formatConditionName(scannedItem.condition)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Kategori:</span>
                      <span className="font-medium">{formatCategoryName(scannedItem.category)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Lokasi:</span>
                      <span className="font-medium">{scannedItem.locations?.name || 'Tidak Diketahui'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tanggal Pembelian:</span>
                      <span className="font-medium">
                        {scannedItem.purchase_date ? new Date(scannedItem.purchase_date).toLocaleDateString('id-ID') : 'Tidak Diketahui'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Harga:</span>
                      <span className="font-medium">{formatPrice(scannedItem.purchase_price || 0)}</span>
                    </div>
                    {scannedItem.serial_number && (
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Nomor Seri:</span>
                        <span className="font-medium">{scannedItem.serial_number}</span>
                      </div>
                    )}
                    {scannedItem.warranty_expiry && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Garansi Berakhir:</span>
                        <span className="font-medium">
                          {new Date(scannedItem.warranty_expiry).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {scannedItem.description && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium text-foreground mb-2">Deskripsi</h4>
                    <p className="text-sm text-muted-foreground">{scannedItem.description}</p>
                  </div>
                )}

                {scannedItem.notes && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium text-foreground mb-2">Catatan</h4>
                    <p className="text-sm text-muted-foreground">{scannedItem.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Pindai barcode atau masukkan secara manual untuk mencari item</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BarcodeScannerPage; 