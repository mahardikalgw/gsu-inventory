import React, { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  message?: string;
  timeout?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Memuat...",
  timeout = 30000 // 30 seconds default timeout
}) => {
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowTimeoutMessage(true);
    }, timeout);

    return () => clearTimeout(timeoutId);
  }, [timeout]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
          <div className="w-8 h-8 bg-white/20 rounded"></div>
        </div>
        <p className="text-gray-700 font-medium">{message}</p>
        <p className="text-xs text-gray-500 mt-2">Mohon tunggu...</p>
        
        {showTimeoutMessage && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Loading memakan waktu lebih lama dari biasanya. 
              <br />
              <button 
                onClick={() => window.location.reload()} 
                className="text-blue-600 hover:text-blue-800 underline mt-1"
              >
                Klik di sini untuk refresh halaman
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner; 