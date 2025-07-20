import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, TrendingUp, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalItems: number;
  recentlyAdded: number;
  lowConditionItems: number;
  totalLocations: number;
  categoryStats: { category: string; count: number }[];
  conditionStats: { condition: string; count: number }[];
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    recentlyAdded: 0,
    lowConditionItems: 0,
    totalLocations: 0,
    categoryStats: [],
    conditionStats: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get total items
      const { count: totalItems } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true });

      // Get recently added items (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentlyAdded } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Get low condition items (poor, damaged)
      const { count: lowConditionItems } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .in('condition', ['poor', 'damaged']);

      // Get total locations
      const { count: totalLocations } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true });

      // Get category statistics
      const { data: categoryData } = await supabase
        .from('inventory_items')
        .select('category')
        .order('category');

      const categoryStats = categoryData?.reduce((acc: any[], item) => {
        const existing = acc.find(stat => stat.category === item.category);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ category: item.category, count: 1 });
        }
        return acc;
      }, []) || [];

      // Get condition statistics
      const { data: conditionData } = await supabase
        .from('inventory_items')
        .select('condition')
        .order('condition');

      const conditionStats = conditionData?.reduce((acc: any[], item) => {
        const existing = acc.find(stat => stat.condition === item.condition);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ condition: item.condition, count: 1 });
        }
        return acc;
      }, []) || [];

      setStats({
        totalItems: totalItems || 0,
        recentlyAdded: recentlyAdded || 0,
        lowConditionItems: lowConditionItems || 0,
        totalLocations: totalLocations || 0,
        categoryStats,
        conditionStats,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
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
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatConditionName = (condition: string) => {
    return condition.charAt(0).toUpperCase() + condition.slice(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your inventory management system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Total inventory items
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recently Added</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.recentlyAdded}</div>
            <p className="text-xs text-muted-foreground">
              Added in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.lowConditionItems}</div>
            <p className="text-xs text-muted-foreground">
              Poor or damaged condition
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.totalLocations}</div>
            <p className="text-xs text-muted-foreground">
              Active storage locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category and Condition Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Items by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.categoryStats.map((stat) => (
                <div key={stat.category} className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatCategoryName(stat.category)}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {stat.count}
                  </Badge>
                </div>
              ))}
              {stats.categoryStats.length === 0 && (
                <p className="text-sm text-muted-foreground">No items found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Condition Breakdown */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Items by Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.conditionStats.map((stat) => (
                <div key={stat.condition} className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatConditionName(stat.condition)}
                  </span>
                  <Badge 
                    variant={getConditionBadgeVariant(stat.condition)}
                    className="ml-2"
                  >
                    {stat.count}
                  </Badge>
                </div>
              ))}
              {stats.conditionStats.length === 0 && (
                <p className="text-sm text-muted-foreground">No items found</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;