import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { linkedInApi } from '../lib/linkedin';

export function LinkedInCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        setError('Failed to authenticate with LinkedIn');
        setTimeout(() => navigate('/dashboard/linkedin'), 3000);
        return;
      }

      if (!code || !state) {
        setError('Invalid authentication response');
        setTimeout(() => navigate('/dashboard/linkedin'), 3000);
        return;
      }

      try {
        await linkedInApi.handleCallback(code, state);
        navigate('/dashboard/linkedin');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to complete authentication';
        setError(message);
        setTimeout(() => navigate('/dashboard/linkedin'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        {error ? (
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <p className="text-gray-500 mt-2">Redirecting back...</p>
          </div>
        ) : (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-gray-600">Completing LinkedIn authentication...</p>
          </div>
        )}
      </div>
    </div>
  );
}