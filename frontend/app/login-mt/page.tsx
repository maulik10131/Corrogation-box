'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web';

interface Company {
  id: number;
  name: string;
  code: string;
  city?: string;
  state?: string;
}

export default function MultiTenantLoginPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const router = useRouter();

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await fetch(`${API_BASE_URL}/api/mt-auth/companies`);
      const result = await response.json();

      if (result.success) {
        setCompanies(result.data || []);
        if (result.data && result.data.length === 1) {
          // Auto-select if only one company
          setSelectedCompany(result.data[0].id);
        }
      } else {
        setError('Failed to load companies');
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to connect to server');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identity || !password) {
      setError('Please enter username/email and password');
      return;
    }

    if (!selectedCompany) {
      setError('Please select a company');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/mt-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity,
          password,
          company_id: selectedCompany,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store token and user info
        localStorage.setItem('pms_token', result.data.token);
        localStorage.setItem('pms_user', JSON.stringify(result.data.user));
        localStorage.setItem('pms_company', JSON.stringify(result.data.company));

        console.log('Login successful:', result.data);

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Corrugation PMS</h1>
            <p className="text-gray-500 mt-2">Production Management System</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Company Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Company *
            </label>
            {loadingCompanies ? (
              <div className="border border-gray-300 rounded-lg p-3 text-center text-gray-500">
                Loading companies...
              </div>
            ) : companies.length === 0 ? (
              <div className="border border-red-300 rounded-lg p-3 text-center text-red-600">
                No companies available
              </div>
            ) : (
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              >
                <option value="">-- Select Company --</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                    {company.city && company.state && ` (${company.city}, ${company.state})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Username/Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username or Email *
            </label>
            <input
              type="text"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter username or email"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter password"
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || loadingCompanies}
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all ${
              loading || loadingCompanies
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Don't have an account?</p>
          <button
            onClick={() => router.push('/signup-mt')}
            className="text-blue-600 hover:underline font-medium mt-1"
          >
            Create new account
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>Multi-Tenant Mode</p>
          <p className="mt-1">Each company has its own secure database</p>
        </div>
      </div>
    </div>
  );
}
