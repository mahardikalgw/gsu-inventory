import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import FileUpload from './FileUpload';
import QRCodeGenerator from './QRCodeGenerator';

interface Location {
  id: string;
  name: string;
}

interface InventoryItem {
  id?: string;
  barcode: string;
  name: string;
  description: string | null;
  category: 'office_equipment' | 'furniture' | 'it_devices' | 'vehicle' | 'tools' | 'other';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  location_id: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number;
  warranty_expiry: string | null;
  supplier: string | null;
  notes: string | null;
  image_url: string | null;
}

interface FormData {
  barcode: string;
  name: string;
  description: string;
  category: 'office_equipment' | 'furniture' | 'it_devices' | 'vehicle' | 'tools' | 'other';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  location_id: string;
  brand: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_price: number;
  warranty_expiry: string;
  supplier: string;
  notes: string;
  image_url: string;
}

interface InventoryItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  onSave: (item: InventoryItem) => void;
}

const InventoryItemModal: React.FC<InventoryItemModalProps> = ({
  open,
  onOpenChange,
  item,
  onSave
}) => {
  const [loading, setLoading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [createdItem, setCreatedItem] = useState<InventoryItem | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState<FormData>({
    barcode: '',
    name: '',
    description: '',
    category: 'office_equipment',
    condition: 'good',
    location_id: '',
    brand: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: 0,
    warranty_expiry: '',
    supplier: '',
    notes: '',
    image_url: ''
  });

  // Reset form data
  const resetFormData = () => {
    setFormData({
      barcode: '',
      name: '',
      description: '',
      category: 'office_equipment',
      condition: 'good',
      location_id: '',
      brand: '',
      model: '',
      serial_number: '',
      purchase_date: '',
      purchase_price: 0,
      warranty_expiry: '',
      supplier: '',
      notes: '',
      image_url: ''
    });
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (item) {
      setFormData({
        barcode: item.barcode,
        name: item.name,
        description: item.description || '',
        category: item.category,
        condition: item.condition,
        location_id: item.location_id || '',
        brand: item.brand || '',
        model: item.model || '',
        serial_number: item.serial_number || '',
        purchase_date: item.purchase_date || '',
        purchase_price: item.purchase_price,
        warranty_expiry: item.warranty_expiry || '',
        supplier: item.supplier || '',
        notes: item.notes || '',
        image_url: item.image_url || ''
      });
      setShowQRCode(false);
      setCreatedItem(null);
    } else {
      // Generate new barcode for new items
      generateBarcode();
      setShowQRCode(false);
      setCreatedItem(null);
    }
  }, [item, open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      resetFormData();
      setShowQRCode(false);
      setCreatedItem(null);
    }
  }, [open]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const barcode = `GSU-${timestamp.slice(-8)}-${random}`;
    setFormData(prev => ({ ...prev, barcode }));
  };

  const checkBarcodeExists = async (barcode: string, excludeId?: string): Promise<boolean> => {
    try {
      let query = supabase
        .from('inventory_items')
        .select('id')
        .eq('barcode', barcode);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code === 'PGRST116') {
        // No rows returned - barcode doesn't exist
        return false;
      }

      if (error) {
        console.error('Error checking barcode:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Exception checking barcode:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name?.trim()) {
      toast.error('Nama item wajib diisi');
      return;
    }

    if (!formData.barcode?.trim()) {
      toast.error('Barcode wajib diisi');
      return;
    }

    // Validate barcode format
    if (!formData.barcode.match(/^GSU-\d{8}-\d{4}$/)) {
      toast.error('Format barcode tidak valid. Format yang benar: GSU-XXXXXXXX-XXXX');
      return;
    }

    // Validate purchase price
    if (formData.purchase_price < 0) {
      toast.error('Harga pembelian tidak boleh negatif');
      return;
    }

    // Validate dates
    if (formData.purchase_date && formData.warranty_expiry) {
      const purchaseDate = new Date(formData.purchase_date);
      const warrantyDate = new Date(formData.warranty_expiry);
      
      if (warrantyDate < purchaseDate) {
        toast.error('Tanggal berakhirnya garansi tidak boleh lebih awal dari tanggal pembelian');
        return;
      }
    }

    setLoading(true);
    try {
      // Check for duplicate barcode
      const barcodeExists = await checkBarcodeExists(formData.barcode, item?.id);
      if (barcodeExists) {
        toast.error('Barcode sudah digunakan. Silakan gunakan barcode yang berbeda.');
        setLoading(false);
        return;
      }

      // Prepare data for submission - clean up empty strings and handle null values
      const submissionData = {
        ...formData,
        name: formData.name?.trim() || '',
        barcode: formData.barcode?.trim() || '',
        description: formData.description?.trim() || null,
        brand: formData.brand?.trim() || null,
        model: formData.model?.trim() || null,
        serial_number: formData.serial_number?.trim() || null,
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price || 0,
        warranty_expiry: formData.warranty_expiry || null,
        supplier: formData.supplier?.trim() || null,
        notes: formData.notes?.trim() || null,
        image_url: formData.image_url?.trim() || null,
        location_id: formData.location_id || null,
      };

      // Remove undefined values
      Object.keys(submissionData).forEach(key => {
        if (submissionData[key as keyof typeof submissionData] === undefined) {
          delete submissionData[key as keyof typeof submissionData];
        }
      });

      if (item?.id) {
        // Update existing item
        console.log('Updating item with data:', submissionData);
        console.log('Item ID:', item.id);
        
        const { error } = await supabase
          .from('inventory_items')
          .update(submissionData)
          .eq('id', item.id);

        if (error) {
          console.error('Supabase update error:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw new Error(error.message || 'Gagal memperbarui item');
        }

        console.log('Update successful');
        toast.success('Item berhasil diperbarui');
        onSave({ ...item, ...submissionData });
        onOpenChange(false);
      } else {
        // Create new item
        console.log('Creating new item with data:', submissionData);
        
        const { data, error } = await supabase
          .from('inventory_items')
          .insert(submissionData)
          .select()
          .single();

        if (error) {
          console.error('Supabase insert error:', error);
          throw new Error(error.message || 'Gagal membuat item');
        }

        if (!data) {
          throw new Error('Gagal membuat item - tidak ada data yang dikembalikan');
        }
        
        toast.success('Item berhasil dibuat');
        setCreatedItem(data);
        setShowQRCode(true);
        onSave(data);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      
      // Show more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          toast.error('Barcode sudah digunakan. Silakan gunakan barcode yang berbeda.');
        } else if (error.message.includes('foreign key')) {
          toast.error('Lokasi yang dipilih tidak valid.');
        } else if (error.message.includes('not null')) {
          toast.error('Beberapa field wajib diisi.');
        } else if (error.message.includes('check constraint')) {
          toast.error('Data yang dimasukkan tidak memenuhi persyaratan.');
        } else {
          toast.error(`Gagal menyimpan item: ${error.message}`);
        }
      } else {
        toast.error('Gagal menyimpan item. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
  };

  const handleClose = () => {
    setShowQRCode(false);
    setCreatedItem(null);
    onOpenChange(false);
  };

  const handleContinue = () => {
    setShowQRCode(false);
    setCreatedItem(null);
    if (createdItem) onSave(createdItem);
    onOpenChange(false);
  };

  // Show QR code after creating new item
  if (showQRCode && createdItem) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code Dibuat</DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Item Anda telah berhasil dibuat! Berikut adalah QR code untuk "{createdItem.name}":
            </p>
            
            <QRCodeGenerator
              barcode={createdItem.barcode}
              itemName={createdItem.name}
              size={250}
              showDownload={true}
            />
            
            <div className="flex gap-2 justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Tutup
              </Button>
              <Button
                onClick={handleContinue}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Lanjutkan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Item Inventaris' : 'Tambah Item Inventaris Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Barcode dibuat otomatis"
                  required
                />
              </div>

              <div>
                <Label htmlFor="name">Nama Item *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan nama item"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Masukkan deskripsi item"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Kategori</Label>
                  <select
                    id="category"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as InventoryItem['category'] })}
                  >
                    <option value="office_equipment">Peralatan Kantor</option>
                    <option value="furniture">Furnitur</option>
                    <option value="it_devices">Perangkat IT</option>
                    <option value="vehicle">Kendaraan</option>
                    <option value="tools">Peralatan</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="condition">Kondisi</Label>
                  <select
                    id="condition"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as InventoryItem['condition'] })}
                  >
                    <option value="excellent">Sangat Baik</option>
                    <option value="good">Baik</option>
                    <option value="fair">Cukup</option>
                    <option value="poor">Buruk</option>
                    <option value="damaged">Rusak</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="location">Lokasi</Label>
                <select
                  id="location"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                >
                  <option value="">Pilih Lokasi</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column - Details & Image */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Merek</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Masukkan merek"
                  />
                </div>

                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Masukkan model"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="serial_number">Nomor Seri</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Masukkan nomor seri"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchase_date">Tanggal Pembelian</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="purchase_price">Harga Pembelian (IDR)</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="warranty_expiry">Berakhirnya Garansi</Label>
                  <Input
                    id="warranty_expiry"
                    type="date"
                    value={formData.warranty_expiry}
                    onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="supplier">Pemasok</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Masukkan pemasok"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan"
                  rows={3}
                />
              </div>

              {/* Image Upload */}
              <div>
                <Label>Gambar Item</Label>
                <FileUpload
                  onUploadComplete={handleImageUpload}
                  currentImageUrl={formData.image_url}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary hover:bg-primary-hover"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : (item ? 'Perbarui Item' : 'Buat Item')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryItemModal; 