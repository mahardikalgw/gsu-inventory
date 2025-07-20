import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar,
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface InventoryItem {
  id: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  condition: string;
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
  locations?: {
    name: string;
  } | null;
}

interface ReportData {
  totalItems: number;
  totalValue: number;
  categoryStats: { category: string; count: number; value: number }[];
  conditionStats: { condition: string; count: number }[];
  locationStats: { location: string; count: number }[];
  recentItems: InventoryItem[];
  lowConditionItems: InventoryItem[];
}

const ReportsPage = () => {
  const { profile } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    condition: '',
    location: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      // Get all inventory items first
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Fetch locations separately
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, name');

      if (locationsError) {
        console.error('Error fetching locations:', locationsError);
        // Continue without locations data
      }

      // Combine the data
      const itemsWithLocations = items?.map(item => ({
        ...item,
        locations: locationsData?.find(loc => loc.id === item.location_id) || null
      })) || [];

      // Calculate statistics
      const totalItems = itemsWithLocations.length;
      const totalValue = itemsWithLocations.reduce((sum, item) => sum + (item.purchase_price || 0), 0);

      // Category statistics
      const categoryStats = itemsWithLocations.reduce((acc, item) => {
        const existing = acc.find(stat => stat.category === item.category);
        if (existing) {
          existing.count++;
          existing.value += item.purchase_price || 0;
        } else {
          acc.push({ 
            category: item.category, 
            count: 1, 
            value: item.purchase_price || 0 
          });
        }
        return acc;
      }, [] as { category: string; count: number; value: number }[]);

      // Condition statistics
      const conditionStats = itemsWithLocations.reduce((acc, item) => {
        const existing = acc.find(stat => stat.condition === item.condition);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ condition: item.condition, count: 1 });
        }
        return acc;
      }, [] as { condition: string; count: number }[]);

      // Location statistics
      const locationStats = itemsWithLocations.reduce((acc, item) => {
        const locationName = item.locations?.name || 'Unassigned';
        const existing = acc.find(stat => stat.location === locationName);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ location: locationName, count: 1 });
        }
        return acc;
      }, [] as { location: string; count: number }[]) || [];

      // Recent items (last 10)
      const recentItems = itemsWithLocations.slice(0, 10) || [];

      // Low condition items
      const lowConditionItems = itemsWithLocations.filter(item => 
        ['poor', 'damaged'].includes(item.condition)
      ) || [];

      setReportData({
        totalItems,
        totalValue,
        categoryStats,
        conditionStats,
        locationStats,
        recentItems,
        lowConditionItems
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const generatePDFReport = async () => {
    setGeneratingReport(true);
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a simple text report
      const reportContent = `
INVENTORY REPORT - Kelurahan Gunung Sari Ulu
Generated: ${new Date().toLocaleDateString('id-ID')}

SUMMARY:
- Total Items: ${reportData?.totalItems}
- Total Value: ${formatPrice(reportData?.totalValue || 0)}

CATEGORY BREAKDOWN:
${reportData?.categoryStats.map(stat => 
  `- ${formatCategoryName(stat.category)}: ${stat.count} items (${formatPrice(stat.value)})`
).join('\n')}

CONDITION BREAKDOWN:
${reportData?.conditionStats.map(stat => 
  `- ${stat.condition.charAt(0).toUpperCase() + stat.condition.slice(1)}: ${stat.count} items`
).join('\n')}

LOCATION BREAKDOWN:
${reportData?.locationStats.map(stat => 
  `- ${stat.location}: ${stat.count} items`
).join('\n')}

RECENT ITEMS:
${reportData?.recentItems.map(item => 
  `- ${item.name} (${item.barcode}) - ${item.category}`
).join('\n')}

ITEMS NEEDING ATTENTION:
${reportData?.lowConditionItems.map(item => 
  `- ${item.name} (${item.barcode}) - ${item.condition} condition`
).join('\n')}
      `;

      // Create and download file
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const generateExcelReport = async () => {
    setGeneratingReport(true);
    try {
      // Simulate Excel generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create CSV content (simplified Excel export)
      const csvContent = [
        ['Barcode', 'Name', 'Category', 'Condition', 'Location', 'Brand', 'Model', 'Purchase Date', 'Purchase Price', 'Notes'],
        ...(reportData?.recentItems.map(item => [
          item.barcode,
          item.name,
          item.category,
          item.condition,
          item.locations?.name || 'Unassigned',
          item.brand || '',
          item.model || '',
          item.purchase_date || '',
          item.purchase_price || '',
          item.notes || ''
        ]) || [])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Excel report generated successfully');
    } catch (error) {
      console.error('Error generating Excel report:', error);
      toast.error('Failed to generate Excel report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (profile && (profile.role as string) !== 'admin' && (profile.role as string) !== 'kepala') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only administrators can access reports.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export inventory reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={generatePDFReport}
            disabled={generatingReport}
            className="bg-gradient-primary hover:bg-primary-hover"
          >
            <Download className="w-4 h-4 mr-2" />
            {generatingReport ? 'Generating...' : 'Export PDF'}
          </Button>
          <Button 
            onClick={generateExcelReport}
            disabled={generatingReport}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            {generatingReport ? 'Generating...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{reportData?.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Total inventory items
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatPrice(reportData?.totalValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined asset value
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{reportData?.recentItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Added recently
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{reportData?.lowConditionItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Poor or damaged condition
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData?.categoryStats.map((stat) => (
                <div key={stat.category} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {formatCategoryName(stat.category)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{stat.count} items</div>
                    <div className="text-sm text-muted-foreground">
                      {formatPrice(stat.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Condition Breakdown */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Condition Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData?.conditionStats.map((stat) => (
                <div key={stat.condition} className="flex justify-between items-center">
                  <Badge variant="outline">
                    {stat.condition.charAt(0).toUpperCase() + stat.condition.slice(1)}
                  </Badge>
                  <span className="font-medium">{stat.count} items</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Breakdown */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportData?.locationStats.map((stat) => (
              <div key={stat.location} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <span className="font-medium">{stat.location}</span>
                <Badge variant="secondary">{stat.count} items</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Items */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Recent Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reportData?.recentItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">{item.barcode}</div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                    {formatCategoryName(item.category)}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">
                    {new Date(item.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Items Needing Attention */}
      {reportData?.lowConditionItems.length > 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              Items Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportData.lowConditionItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.barcode}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="text-xs">
                      {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.locations?.name || 'Unassigned'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsPage; 