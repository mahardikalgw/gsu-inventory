# Gunung Sari Inventory Hub - Setup Guide

## 🚀 Quick Start

This guide will help you set up the complete inventory management system for Kelurahan Gunung Sari Ulu.

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Modern web browser

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd gunung-sari-inventory-hub

# Install dependencies
npm install
```

### 2. Supabase Setup

#### A. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

#### B. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/20250720020742-726dfd38-dc6c-402a-ae30-7981e81e21c6.sql`

#### C. Storage Setup

1. In SQL Editor, run the storage setup: `supabase/storage-setup.sql`
2. Go to Storage in your Supabase dashboard
3. Verify the "inventory" bucket is created

#### D. Environment Configuration

1. Copy your Supabase URL and anon key from Settings > API
2. Update `src/integrations/supabase/client.ts`:

```typescript
const SUPABASE_URL = "your-project-url";
const SUPABASE_PUBLISHABLE_KEY = "your-anon-key";
```

### 3. Run the Application

```bash
# Start development server
npm run dev

# Open http://localhost:5173
```

## 🔐 Initial Setup

### 1. Create Admin Account

1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add User" to create a new user account
3. Set the user's email and password
4. Go to SQL Editor and run this command to create an admin profile:
```sql
INSERT INTO public.profiles (user_id, full_name, role, phone)
SELECT 
    id,
    'Administrator',
    'admin',
    '+62-xxx-xxx-xxxx'
FROM auth.users 
WHERE email = 'your-email@example.com';
```
5. Replace 'your-email@example.com' with the actual email you used
6. Now you can sign in with these credentials

### 2. Create Initial Locations

1. Log in as admin
2. Go to Locations page
3. Add your office locations (e.g., "Main Office", "Storage Room")

## 📱 Features Overview

### ✅ Implemented Features

#### 🔍 Barcode Scanner
- Camera-based barcode scanning
- Manual barcode input
- Quick item lookup
- Real-time item details display

#### 📊 Reports & Exports
- Comprehensive dashboard statistics
- PDF report generation
- Excel/CSV export functionality
- Category, condition, and location breakdowns
- Items needing attention alerts

#### 🏢 Location Management (Admin Only)
- Add/edit/delete office locations
- Building, floor, and room organization
- Location-based item tracking
- Item count per location

#### 👥 User Management (Admin Only)
- Create and manage staff accounts
- Role-based permissions (Admin/Staff)
- User profile management
- Secure authentication

#### 📸 File Upload for Item Images
- Drag-and-drop image upload
- Image preview and validation
- Supabase storage integration
- 5MB file size limit
- Support for JPG, PNG, WebP, GIF

#### 📦 Enhanced Inventory Management
- Add/edit/delete inventory items
- Automatic barcode generation
- **QR Code generation and download**
- Image upload for items
- Comprehensive item details
- Search and filter functionality
- Category and condition tracking

#### 🔍 QR Code Features
- **Automatic QR Code generation** when creating new items
- **QR Code download** for all inventory items
- **High-quality PNG format** for printing
- **Barcode data encoded** in QR codes for scanning
- **Item name and barcode display** on QR codes

### 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface suitable for government use
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark Mode Support**: Optional dark theme
- **Loading States**: Smooth loading animations
- **Toast Notifications**: User feedback for all actions
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🔧 Configuration

### Customization Options

#### 1. Categories
Edit categories in the database migration file:
```sql
CREATE TYPE public.item_category AS ENUM (
  'office_equipment',
  'furniture', 
  'it_devices',
  'vehicle',
  'tools',
  'other'
);
```

#### 2. Conditions
Edit conditions in the database migration file:
```sql
CREATE TYPE public.item_condition AS ENUM (
  'excellent',
  'good', 
  'fair',
  'poor',
  'damaged'
);
```

#### 3. Barcode Format
Modify barcode generation in `src/components/InventoryItemModal.tsx`:
```typescript
const generateBarcode = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const barcode = `GSU-${timestamp.slice(-8)}-${random}`;
  return barcode;
};
```

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
3. Deploy

### Netlify Deployment

1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level security policies
- **Role-based Access**: Admin and Staff permissions
- **Authentication**: Secure Supabase Auth integration
- **File Upload Security**: File type and size validation
- **Input Validation**: Form validation with error handling

## 📊 Database Schema

### Tables

1. **profiles**: User profiles with roles
2. **locations**: Office locations and rooms
3. **inventory_items**: Main inventory data
4. **inventory_audit_log**: Change tracking

### Storage

1. **inventory bucket**: Image storage for items

## 🐛 Troubleshooting

### Common Issues

#### 1. Camera Access Denied
- Ensure HTTPS is enabled (required for camera access)
- Check browser permissions
- Try manual barcode input as alternative

#### 2. File Upload Fails
- Check Supabase storage bucket exists
- Verify storage policies are set correctly
- Check file size (max 5MB) and type

#### 3. Authentication Issues
- Verify Supabase URL and keys
- Check RLS policies
- Ensure user has proper role assigned

#### 4. Database Connection Issues
- Verify Supabase project is active
- Check migration files are applied
- Verify RLS policies are enabled

## 📞 Support

For technical support or questions:
- Check the Supabase documentation
- Review the React and TypeScript documentation
- Contact your system administrator

## 🔄 Updates

To update the system:

1. Pull latest changes: `git pull origin main`
2. Install new dependencies: `npm install`
3. Run any new migrations in Supabase
4. Test the application

---

**Gunung Sari Inventory Hub** - Modern inventory management for government offices 