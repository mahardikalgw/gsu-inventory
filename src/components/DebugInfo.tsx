import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const DebugInfo = () => {
  const { user, profile, loading, session } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Debug Info:</h3>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-400 hover:text-blue-300"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      
      <div className="space-y-1">
        <div>Loading: {loading ? '🔄 Yes' : '✅ No'}</div>
        <div>User: {user ? '✅ Logged in' : '❌ Not logged in'}</div>
        <div>User ID: {user?.id ? user.id.substring(0, 8) + '...' : 'None'}</div>
        <div>Profile: {profile ? '✅ Loaded' : '❌ Not loaded'}</div>
        <div>Role: {profile?.role || 'None'}</div>
        <div>Name: {profile?.full_name || 'None'}</div>
        
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div>Session: {session ? '✅ Active' : '❌ None'}</div>
            <div>Email: {user?.email || 'None'}</div>
            <div>Profile ID: {profile?.id || 'None'}</div>
            <div>Profile User ID: {profile?.user_id ? profile.user_id.substring(0, 8) + '...' : 'None'}</div>
            <div>Created: {profile?.created_at ? new Date(profile.created_at).toLocaleString() : 'None'}</div>
            
            <div className="mt-2">
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugInfo; 