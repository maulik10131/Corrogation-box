'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRightIcon, EnvelopeIcon, LockClosedIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/lib/config';

interface Company {
  id: number;
  name: string;
  code: string;
  city?: string;
  state?: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    
    // Check if user is already logged in
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      const user = localStorage.getItem('pms_user');
      
      if (token && user) {
        // User is already logged in, redirect to dashboard
        router.push('/dashboard');
      }
    }
    
    // Fetch companies
    fetchCompanies();
  }, [router]);

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
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedCompany) {
      setError('Please select a company');
      return;
    }

    if (!username || !email || !password) {
      setError('Username, email, and password are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Confirm password does not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/mt-auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          username,
          email,
          password,
          company_id: selectedCompany,
        }),
      });

      const result = await response.json();

      // Check HTTP status first
      if (!response.ok) {
        const validationMessage = result.errors
          ? Object.values(result.errors).flat().join(' | ')
          : null;
        setError(validationMessage || result.error || result.message || 'Signup failed');
        return;
      }

      // Check success flag
      if (!result.success) {
        const validationMessage = result.errors
          ? Object.values(result.errors).flat().join(' | ')
          : null;
        setError(validationMessage || result.error || result.message || 'Signup failed');
        return;
      }

      // Validate that we have required data
      if (!result.data || !result.data.user) {
        setError('Invalid response from server');
        return;
      }

      // Save to localStorage only if signup is successful
      if (typeof window !== 'undefined') {
        localStorage.setItem('pms_user', JSON.stringify(result.data.user));
        localStorage.setItem('pms_company', JSON.stringify(result.data.company));
        if (result.data.token) {
          localStorage.setItem('pms_token', result.data.token);
        } else {
          localStorage.setItem('pms_token', 'default_token');
        }
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="w-full max-w-3xl h-[520px] rounded-3xl bg-white shadow-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#e8ddd0]">
      {/* Card */}
      <div className="w-full max-w-5xl rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col md:flex-row min-h-[560px]">

        {/* ── LEFT PANEL — box image ── */}
        <div className="relative md:w-[45%] flex flex-col items-end justify-center overflow-hidden min-h-[420px]">
          {/* actual SVG image fills the panel */}
          <img
            src="/box-collage-bg.svg"
            alt=""
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'cover', objectPosition: 'left center' }}
          />
          {/* brown warm overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(80,45,15,0.62) 0%, rgba(120,75,30,0.45) 55%, rgba(150,100,45,0.22) 100%)' }}
          />
          {/* wavy right edge */}
          <svg className="absolute right-0 top-0 h-full w-12 hidden md:block z-10" viewBox="0 0 48 560" preserveAspectRatio="none">
            <path d="M48,0 C28,70 4,105 24,190 C44,275 8,310 24,395 C40,480 28,510 4,560 L48,560 Z" fill="white"/>
          </svg>
          {/* text overlay */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-8 py-10 text-white">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/50 flex items-center justify-center mb-4 shadow-lg backdrop-blur-sm">
              <svg width="36" height="36" viewBox="0 0 46 46" fill="none">
                <path d="M23 4L42 14.5V31.5L23 42L4 31.5V14.5Z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2"/>
                <path d="M23 4L42 14.5L23 25L4 14.5Z" fill="white" fillOpacity="0.4" stroke="white" strokeWidth="1.5"/>
                <path d="M23 25V42M4 14.5V31.5L23 42M42 14.5V31.5L23 42" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-center drop-shadow-lg">Create Account</h2>
            <p className="text-sm text-white/80 mt-2 text-center max-w-[160px] leading-relaxed drop-shadow">
              Join Corrugation PMS to manage inventory &amp; orders
            </p>
            <div className="mt-5 flex gap-3 text-[11px] text-white/75">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />Fast</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />Secure</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />Smart</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 bg-white flex flex-col justify-center px-7 py-10 md:px-9">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Sign Up</h1>
          <p className="text-sm text-gray-500 mb-5">Fill in your details to get started</p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Company Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</label>
              <div className="mt-1.5 relative">
                <BuildingOfficeIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                {loadingCompanies ? (
                  <div className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm text-gray-400">
                    Loading companies...
                  </div>
                ) : companies.length === 0 ? (
                  <div className="w-full rounded-xl border border-red-200 bg-red-50 pl-9 pr-3 py-2.5 text-sm text-red-600">
                    No companies available
                  </div>
                ) : (
                  <select
                    value={selectedCompany || ''}
                    onChange={(e) => setSelectedCompany(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pl-9 pr-3 py-2.5 text-sm outline-none transition appearance-none cursor-pointer"
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
              <div className="mt-1.5 relative">
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pl-9 pr-3 py-2.5 text-sm outline-none transition"
                  placeholder="Enter full name"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</label>
              <div className="mt-1.5 relative">
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pl-9 pr-3 py-2.5 text-sm outline-none transition"
                  placeholder="Choose username"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
              <div className="mt-1.5 relative">
                <EnvelopeIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pl-9 pr-3 py-2.5 text-sm outline-none transition"
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
              <div className="mt-1.5 relative">
                <LockClosedIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pl-9 pr-3 py-2.5 text-sm outline-none transition"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirm Password</label>
              <div className="mt-1.5 relative">
                <LockClosedIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pl-9 pr-3 py-2.5 text-sm outline-none transition"
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 text-sm font-semibold hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 shadow-md shadow-orange-200 transition"
              >
                {loading ? 'Creating...' : 'Sign Up'}
                {!loading && <ArrowRightIcon className="w-4 h-4" />}
              </button>
              <Link
                href="/login"
                className="flex-1 inline-flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 py-2.5 text-sm font-semibold hover:border-orange-300 hover:text-orange-600 transition"
              >
                Sign In
              </Link>
            </div>
          </form>

          <p className="text-xs text-gray-400 mt-6 text-center">
            Corrugation PMS &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
