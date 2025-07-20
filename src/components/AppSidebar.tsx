import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  QrCode, 
  MapPin, 
  FileText, 
  Users, 
  Settings,
  LogOut 
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const menuItems = [
  { 
    title: 'Dashboard', 
    url: '/dashboard', 
    icon: LayoutDashboard,
    roles: ['admin', 'staff']
  },
  { 
    title: 'Inventaris', 
    url: '/inventory', 
    icon: Package,
    roles: ['admin', 'staff']
  },
  { 
    title: 'Pemindai Barcode', 
    url: '/scanner', 
    icon: QrCode,
    roles: ['admin', 'staff']
  },
  { 
    title: 'Lokasi', 
    url: '/locations', 
    icon: MapPin,
    roles: ['admin']
  },
  { 
    title: 'Laporan', 
    url: '/reports', 
    icon: FileText,
    roles: ['admin', 'kepala']
  },
  { 
    title: 'Pengguna', 
    url: '/users', 
    icon: Users,
    roles: ['admin']
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-blue-600 text-black font-medium shadow-md' 
      : 'text-gray-500 hover:bg-gray-100 hover:text-black transition-colors';

  const filteredItems = menuItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  const handleSignOut = async () => {
    try {
      // Sign out immediately
      await signOut();
      
      // Show success and redirect
      toast.success('Berhasil keluar');
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Gagal keluar');
    }
  };

  return (
    <Sidebar className="bg-white border-r border-gray-200 shadow-sm">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">GSU Inventory</h2>
              <p className="text-sm text-gray-600">Kelurahan Gunung Sari</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        {profile && (
          <div className="p-4 bg-blue-50 rounded-lg mx-4 mt-4 border border-blue-200">
            <p className="font-medium text-gray-900">{profile.full_name}</p>
            <p className="text-sm text-gray-600 capitalize">
              {profile.role && ((profile.role as string) === 'admin' ? 'Administrator' : (profile.role as string) === 'kepala' ? 'Kepala' : 'Staf')}
            </p>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Navigasi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-gray-500 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="w-5 h-5" />
          <span className="ml-2 font-medium">Keluar</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}