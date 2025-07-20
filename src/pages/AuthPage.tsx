import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Building2, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const AuthPage = () => {
  const { user, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [signInData, setSignInData] = useState({ email: '', password: '' });

  // Reset form data
  const resetFormData = () => {
    setSignInData({ email: '', password: '' });
  };

  // Cleanup on unmount - move this before conditional return
  React.useEffect(() => {
    return () => {
      resetFormData();
    };
  }, []);

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(signInData.email, signInData.password);
      
      if (error) {
        toast.error('Gagal masuk', {
          description: error.message || 'Periksa kredensial Anda dan coba lagi.',
        });
      } else {
        toast.success('Selamat datang kembali!', {
          description: 'Anda telah berhasil masuk.',
        });
        resetFormData(); // Clear form after successful login
      }
    } catch (error) {
      toast.error('Terjadi kesalahan yang tidak terduga');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-elevated">
              <Package className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">GSU Inventory</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Building2 className="w-4 h-4" />
            Kelurahan Gunung Sari Ulu
          </p>
        </div>

        {/* Auth Form */}
        <Card className="shadow-elevated border-0 bg-gradient-card">
          <CardHeader className="space-y-1">
            <h2 className="text-2xl font-semibold text-center">Selamat Datang</h2>
            <p className="text-muted-foreground text-center">
              Akses sistem manajemen inventaris
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Masukkan email Anda"
                    className="pl-10"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signin-password">Kata Sandi</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Masukkan kata sandi Anda"
                    className="pl-10"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:bg-primary-hover"
                disabled={isLoading}
              >
                {isLoading ? 'Sedang masuk...' : 'Masuk'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>© 2025 Kelurahan Gunung Sari Ulu</p>
          <p>Sistem Manajemen Inventaris</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;