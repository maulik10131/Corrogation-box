'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web';

interface Company {
  id: number;
  name: string;
  code: string;
  city?: string;
  state?: string;
}

export default function MultiTenantSignupPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!selectedCompany) {
      setError('Please select a company');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/mt-auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          company_id: selectedCompany,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store token and user info
        localStorage.setItem('pms_token', result.data.token);
        localStorage.setItem('pms_user', JSON.stringify(result.data.user));
        localStorage.setItem('pms_company', JSON.stringify(result.data.company));

        console.log('Signup successful:', result.data);

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(result.error || 'Signup failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 mt-2">Join Corrugation PMS</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          {/* Company Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Company *
            </label>
            {loadingCompanies ? (
              <div className="border border-gray-300 rounded-lg p-3 text-center text-gray-500 text-sm">
                Loading companies...
              </div>
            ) : companies.length === 0 ? (
              <div className="border border-red-300 rounded-lg p-3 text-center text-red-600 text-sm">
                No companies available
              </div>
            ) : (
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Enter your full name"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Choose a username"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="your@email.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Re-enter password"
              required
            />
          </div>

          {/* Signup Button */}
          <button
            type="submit"
            disabled={loading || loadingCompanies}
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all ${
              loading || loadingCompanies
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Already have an account?</p>
          <button
            onClick={() => router.push('/login-mt')}
            className="text-blue-600 hover:underline font-medium mt-1"
          >
            Login here
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>By creating an account, you agree to our Terms of Service</p>
        </div>
      </div>
    </div>
  );
}
