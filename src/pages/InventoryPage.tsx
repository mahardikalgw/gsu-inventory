import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Edit, Trash2, Package, QrCode, Image as ImageIcon, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import InventoryItemModal from '@/components/InventoryItemModal';
import QRCodeGenerator from '@/components/QRCodeGenerator';

interface InventoryItem {
  id: string;
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
  created_at: string;
  updated_at: string;
  locations?: {
    name: string;
  };
}

const InventoryPage = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Reset filters and search
  const resetFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterCondition('');
  };

  useEffect(() => {
    fetchInventoryItems();
    
    // Reset filters when component unmounts
    return () => {
      resetFilters();
    };
  }, []);

  const fetchInventoryItems = async (retryCount = 0) => {
    try {
      setLoading(true);
      
      // Fetch inventory items first
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.error('Supabase fetch error:', itemsError);
        throw itemsError;
      }

      // Fetch locations separately
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, name');

      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
        // Continue without locations data
      }

      // Combine the data
      const combinedItems = itemsData?.map(item => ({
        ...item,
        locations: locationsData?.find(loc => loc.id === item.location_id) || null
      })) || [];

      setItems(combinedItems);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      
      // Retry logic for network errors
      if (retryCount < 2 && (error instanceof Error && 
          (error.message.includes('network') || error.message.includes('timeout')))) {
        console.log(`Retrying fetch... Attempt ${retryCount + 1}`);
        setTimeout(() => fetchInventoryItems(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      // Show specific error messages
      if (error instanceof Error) {
        if (error.message.includes('JWT')) {
          toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        } else if (error.message.includes('permission')) {
          toast.error('Anda tidak memiliki izin untuk mengakses data ini.');
        } else {
          toast.error(`Gagal memuat item inventaris: ${error.message}`);
        }
      } else {
        toast.error('Gagal memuat item inventaris. Silakan coba lagi.');
      }
      
      // Set empty array to prevent UI issues
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    console.log('Attempting to delete item with ID:', id);
    console.log('Current profile:', profile);
    console.log('Profile role:', profile?.role);
    console.log('Is admin?', profile?.role === 'admin');
    
    if (!profile || profile.role !== 'admin') {
      toast.error('Hanya administrator yang dapat menghapus item');
      return;
    }

    if (!id) {
      toast.error('ID item tidak valid');
      return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      console.log('Checking if item exists...');
      
      // First check if item exists
      const { data: existingItem, error: checkError } = await supabase
        .from('inventory_items')
        .select('id, name')
        .eq('id', id)
        .single();

      if (checkError) {
        console.error('Error checking item existence:', checkError);
        if (checkError.code === 'PGRST116') {
          throw new Error('Item tidak ditemukan');
        }
        throw new Error(checkError.message || 'Gagal memeriksa item');
      }

      if (!existingItem) {
        throw new Error('Item tidak ditemukan');
      }

      console.log('Item found:', existingItem);
      console.log('Proceeding with deletion...');

      // Delete the item directly
      const { error: deleteError } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        console.error('Delete error details:', {
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint
        });
        
        // Log the full error object for debugging
        console.error('Full error object:', JSON.stringify(deleteError, null, 2));
        
        // Check for specific error types
        if (deleteError.code === '42501') {
          throw new Error('Anda tidak memiliki izin untuk menghapus item ini (RLS Policy)');
        } else if (deleteError.code === '23503') {
          throw new Error('Item tidak dapat dihapus karena masih terkait dengan data lain.');
        } else if (deleteError.message.includes('JWT')) {
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
        } else {
          throw new Error(deleteError.message || 'Gagal menghapus item');
        }
      }

      console.log('Item deleted successfully from database');
      console.log('Current items count before update:', items.length);

      // Update local state
      const updatedItems = items.filter(item => item.id !== id);
      console.log('Items count after filter:', updatedItems.length);
      
      setItems(updatedItems);
      
      console.log('Local state updated successfully');
      toast.success(`Item "${existingItem.name}" berhasil dihapus`);
      
      // Tidak perlu refresh, cukup update state lokal
      
    } catch (error) {
      console.error('Error deleting item:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('foreign key')) {
          toast.error('Item tidak dapat dihapus karena masih terkait dengan data lain.');
        } else if (error.message.includes('permission')) {
          toast.error('Anda tidak memiliki izin untuk menghapus item ini.');
        } else if (error.message.includes('JWT')) {
          toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        } else if (error.message.includes('RLS Policy')) {
          toast.error('Masalah izin database. Silakan hubungi administrator.');
        } else {
          toast.error(`Gagal menghapus item: ${error.message}`);
        }
      } else {
        toast.error('Gagal menghapus item. Silakan coba lagi.');
      }
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  // Update local state after add/edit
  const handleModalSave = (savedItem: InventoryItem) => {
    setItems(prevItems => {
      const idx = prevItems.findIndex(item => item.id === savedItem.id);
      if (idx !== -1) {
        // Edit: replace item
        const updated = [...prevItems];
        updated[idx] = { ...prevItems[idx], ...savedItem };
        return updated;
      } else {
        // Add: push new item
        return [savedItem, ...prevItems];
      }
    });
  };

  const handleShowQRCode = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowQRModal(true);
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

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !filterCategory || item.category === filterCategory;
    const matchesCondition = !filterCondition || item.condition === filterCondition;

    return matchesSearch && matchesCategory && matchesCondition;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventaris</h1>
          <p className="text-gray-600">
            Kelola item inventaris dan lacak aset
          </p>
        </div>
        <Button 
          onClick={handleAddItem}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Item
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari item, barcode, merek..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Semua Kategori</option>
                <option value="office_equipment">Peralatan Kantor</option>
                <option value="furniture">Furnitur</option>
                <option value="it_devices">Perangkat IT</option>
                <option value="vehicle">Kendaraan</option>
                <option value="tools">Peralatan</option>
                <option value="other">Lainnya</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
              >
                <option value="">Semua Kondisi</option>
                <option value="excellent">Sangat Baik</option>
                <option value="good">Baik</option>
                <option value="fair">Cukup</option>
                <option value="poor">Buruk</option>
                <option value="damaged">Rusak</option>
              </select>
              {(searchTerm || filterCategory || filterCondition) && (
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow bg-white border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                    {item.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mb-2">
                    {item.brand} {item.model}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getConditionBadgeVariant(item.condition)}>
                      {formatConditionName(item.condition)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {formatCategoryName(item.category)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShowQRCode(item)}
                    className="text-blue-600 hover:text-blue-700"
                    title="Unduh QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditItem(item)}
                    className="text-gray-600 hover:text-gray-900"
                    title="Edit Item"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {profile?.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Hapus Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.image_url && (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Barcode:</span>
                  <span className="font-mono text-gray-900">{item.barcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lokasi:</span>
                  <span className="text-gray-900">{item.locations?.name || 'Tidak Diketahui'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Harga:</span>
                  <span className="text-gray-900">{formatPrice(item.purchase_price || 0)}</span>
                </div>
                {item.description && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-gray-600 text-xs line-clamp-2">{item.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada item ditemukan</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterCategory || filterCondition 
              ? 'Coba sesuaikan pencarian atau filter Anda'
              : 'Mulai dengan menambahkan item inventaris pertama Anda'
            }
          </p>
          {!searchTerm && !filterCategory && !filterCondition && (
            <Button onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Item Pertama
            </Button>
          )}
        </div>
      )}

      {/* Inventory Modal */}
      <InventoryItemModal
        open={showModal}
        onOpenChange={setShowModal}
        onSave={handleModalSave}
        item={editingItem}
      />

      {/* QR Code Modal */}
      {selectedItem && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${showQRModal ? 'block' : 'hidden'}`}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">QR Code untuk {selectedItem.name}</h3>
              
              <QRCodeGenerator
                barcode={selectedItem.barcode}
                itemName={selectedItem.name}
                size={250}
                showDownload={true}
              />
              
              <div className="flex gap-2 justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowQRModal(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;