'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRightIcon, LockClosedIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '@/lib/config';

interface Company {
  id: number;
  name: string;
  code: string;
  city?: string;
  state?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companiesError, setCompaniesError] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    
    // Check if user is already logged in
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      const user = localStorage.getItem('pms_user');
      
      if (token && user) {
        router.push('/dashboard');
      }
    }
    
    fetchCompanies();
  }, [router]);

  const fetchCompanies = async (isRetry = false) => {
    try {
      setLoadingCompanies(true);
      setCompaniesError(false);
      const response = await fetch(`${API_BASE_URL}/mt-auth/companies`);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        setCompanies(result.data);
        if (result.data.length === 1) {
          setSelectedCompany(result.data[0].id);
        }
      } else {
        if (!isRetry) {
          setTimeout(() => fetchCompanies(true), 2000);
        } else {
          setCompaniesError(true);
        }
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      if (!isRetry) {
        setTimeout(() => fetchCompanies(true), 2000);
      } else {
        setCompaniesError(true);
      }
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identity || !password) {
      setError('Username/email and password are required');
      return;
    }

    if (!selectedCompany && companies.length > 0) {
      setError('Please select a company');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/mt-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity, password, company_id: selectedCompany }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || result.message || 'Invalid username or password');
        return;
      }

      if (!result.success) {
        setError(result.error || result.message || 'Login failed');
        return;
      }

      if (!result.data || !result.data.user) {
        setError('Invalid response from server');
        return;
      }

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
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-8 py-10 text-white" style={{ transform: 'perspective(800px) rotateX(8deg) rotateY(-12deg)', transformStyle: 'preserve-3d', willChange: 'transform' }}>
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/50 flex items-center justify-center mb-4 shadow-lg backdrop-blur-sm">
              <svg width="36" height="36" viewBox="0 0 46 46" fill="none">
                <path d="M23 4L42 14.5V31.5L23 42L4 31.5V14.5Z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2"/>
                <path d="M23 4L42 14.5L23 25L4 14.5Z" fill="white" fillOpacity="0.4" stroke="white" strokeWidth="1.5"/>
                <path d="M23 25V42M4 14.5V31.5L23 42M42 14.5V31.5L23 42" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-center drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3), -1px -1px 2px rgba(255,255,255,0.1)' }}>Welcome Back</h2>
            <p className="text-sm text-white/80 mt-2 text-center max-w-[160px] leading-relaxed drop-shadow" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
              Sign in to manage corrugation orders &amp; inventory
            </p>
            <div className="mt-5 flex gap-3 text-[11px] text-white/75" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />Fast</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />Secure</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />Smart</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 bg-white flex flex-col justify-center px-7 py-8 md:px-9">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Sign In</h1>
          <p className="text-sm text-gray-500 mb-7">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</label>
              <div className="mt-1.5 relative">
                <BuildingOfficeIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                {loadingCompanies ? (
                  <div className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"/></svg>
                    Loading companies...
                  </div>
                ) : companiesError || companies.length === 0 ? (
                  <div className="w-full rounded-xl border border-amber-200 bg-amber-50 pl-9 pr-3 py-2.5 text-sm text-amber-700 flex items-center justify-between">
                    <span>Could not load companies</span>
                    <button
                      type="button"
                      onClick={() => fetchCompanies()}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-800 underline ml-2 whitespace-nowrap"
                    >
                      Retry
                    </button>
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
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username / Email</label>
              <div className="mt-1.5 relative">
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pl-9 pr-3 py-2.5 text-sm outline-none transition"
                  placeholder="Enter username or email"
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
                  placeholder="Enter password"
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
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRightIcon className="w-4 h-4" />}
              </button>
              <Link
                href="/signup"
                className="flex-1 inline-flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 py-2.5 text-sm font-semibold hover:border-orange-300 hover:text-orange-600 transition"
              >
                Sign Up
              </Link>
            </div>
          </form>

          <p className="text-xs text-gray-400 mt-8 text-center">
            Corrugation PMS &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
