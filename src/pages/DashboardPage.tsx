import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  MapPin, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DashboardStats {
  totalItems: number;
  totalLocations: number;
  totalUsers: number;
  lowValueItems: number;
  goodConditionItems: number;
  poorConditionItems: number;
}

const DashboardPage = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalLocations: 0,
    totalUsers: 0,
    lowValueItems: 0,
    goodConditionItems: 0,
    poorConditionItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState<any[]>([]);

  // Reset dashboard data
  const resetDashboardData = () => {
    setStats({
      totalItems: 0,
      totalLocations: 0,
      totalUsers: 0,
      lowValueItems: 0,
      goodConditionItems: 0,
      poorConditionItems: 0,
    });
    setRecentItems([]);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      resetDashboardData(); // Clear data before fetching new data

      // Fetch inventory stats
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*');

      if (itemsError) {
        console.error('Error fetching inventory items:', itemsError);
        toast.error('Gagal memuat data inventaris');
        return;
      }

      // Fetch locations count
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*');

      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
      }

      // Fetch users count
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Calculate stats based on actual database schema
      const totalItems = itemsData?.length || 0;
      const lowValueItems = itemsData?.filter(item => (item.purchase_price || 0) < 1000000).length || 0;
      const goodConditionItems = itemsData?.filter(item => item.condition === 'excellent' || item.condition === 'good').length || 0;
      const poorConditionItems = itemsData?.filter(item => item.condition === 'poor' || item.condition === 'damaged').length || 0;

      setStats({
        totalItems,
        totalLocations: locationsData?.length || 0,
        totalUsers: usersData?.length || 0,
        lowValueItems,
        goodConditionItems,
        poorConditionItems,
      });

      // Fetch recent items
      const { data: recentData, error: recentError } = await supabase
        .from('inventory_items')
        .select(`
          *,
          locations(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent items:', recentError);
      } else {
        setRecentItems(recentData || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Reset data when component unmounts
    return () => {
      resetDashboardData();
    };
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'blue',
    description 
  }: {
    title: string;
    value: number;
    icon: any;
    color?: string;
    description?: string;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Selamat datang kembali, {profile?.full_name}! Berikut adalah ringkasan inventaris Anda.
          </p>
        </div>
        <Button 
          onClick={fetchDashboardData}
          variant="outline"
          className="text-gray-600 hover:text-gray-900"
        >
          Segarkan
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Item"
          value={stats.totalItems}
          icon={Package}
          color="blue"
          description="Semua item inventaris"
        />
        <StatCard
          title="Lokasi"
          value={stats.totalLocations}
          icon={MapPin}
          color="green"
          description="Lokasi penyimpanan"
        />
        <StatCard
          title="Pengguna"
          value={stats.totalUsers}
          icon={Users}
          color="purple"
          description="Pengguna sistem"
        />
        <StatCard
          title="Kondisi Baik"
          value={stats.goodConditionItems}
          icon={CheckCircle}
          color="green"
          description="Item sangat baik/baik"
        />
      </div>

      {/* Alerts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Item Nilai Rendah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">{stats.lowValueItems}</div>
            <p className="text-xs text-yellow-600 mt-1">
              Item di bawah Rp 1.000.000
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Kondisi Buruk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">{stats.poorConditionItems}</div>
            <p className="text-xs text-orange-600 mt-1">
              Item dalam kondisi buruk/rusak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Item Inventaris Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentItems.length > 0 ? (
            <div className="space-y-3">
              {recentItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      {formatCategoryName(item.category)} • {item.brand} {item.model}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.condition === 'excellent' || item.condition === 'good' ? 'bg-green-100 text-green-800' :
                      item.condition === 'poor' || item.condition === 'damaged' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {formatConditionName(item.condition)}
                    </span>
                    {item.locations?.name && (
                      <p className="text-xs text-gray-500 mt-1">{item.locations.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Tidak ada item inventaris ditemukan</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage; 