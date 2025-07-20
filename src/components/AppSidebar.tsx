import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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

const menuItems = [
  { 
    title: 'Dashboard', 
    url: '/dashboard', 
    icon: LayoutDashboard,
    roles: ['admin', 'staff']
  },
  { 
    title: 'Inventory', 
    url: '/inventory', 
    icon: Package,
    roles: ['admin', 'staff']
  },
  { 
    title: 'Barcode Scanner', 
    url: '/scanner', 
    icon: QrCode,
    roles: ['admin', 'staff']
  },
  { 
    title: 'Locations', 
    url: '/locations', 
    icon: MapPin,
    roles: ['admin']
  },
  { 
    title: 'Reports', 
    url: '/reports', 
    icon: FileText,
    roles: ['admin']
  },
  { 
    title: 'Users', 
    url: '/users', 
    icon: Users,
    roles: ['admin']
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-primary text-primary-foreground font-medium shadow-soft' 
      : 'hover:bg-secondary transition-colors';

  const filteredItems = menuItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar className="bg-gradient-bg border-r">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">GSU Inventory</h2>
              <p className="text-sm text-muted-foreground">Kelurahan Gunung Sari</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        {profile && (
          <div className="p-4 bg-gradient-secondary rounded-lg mx-4 mt-4">
            <p className="font-medium text-foreground">{profile.full_name}</p>
            <p className="text-sm text-muted-foreground capitalize">{profile.role}</p>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel>
            Navigation
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
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 border-t">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          <span className="ml-2">Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}