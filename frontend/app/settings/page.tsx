"use client";

import {
  Cog6ToothIcon,
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type SectionId = 'company' | 'notifications' | 'tax' | 'security';

const sections = [
  {
    id: 'company',
    title: 'Company Profile',
    description: 'Manage company name, GST details, address, and contact information.',
    icon: UserCircleIcon,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure reminders for quotation follow-up, low stock, and attendance alerts.',
    icon: BellIcon,
  },
  {
    id: 'tax',
    title: 'Tax & Pricing',
    description: 'Set default GST percentages, pricing preferences, and rounding rules.',
    icon: CurrencyRupeeIcon,
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Review access controls, password policy, and account safety settings.',
    icon: ShieldCheckIcon,
  },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('company');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pms_token');
      const user = localStorage.getItem('pms_user');
      if (!token || !user) {
        router.replace('/login');
      } else {
        setIsAuthenticated(true);
        setAuthChecking(false);
      }
    }
  }, [router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeSectionMeta = useMemo(
    () => sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection]
  );

  const handleSave = () => {
    setSaveMessage(`${activeSectionMeta.title} settings saved`);
    window.setTimeout(() => setSaveMessage(''), 2000);
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
                <Cog6ToothIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Settings</h1>
                <p className="text-sm text-gray-500">Loading settings...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md">
              <Cog6ToothIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Settings</h1>
              <p className="text-sm text-gray-500">
                Configure business preferences and system defaults for your PMS.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <button
                type="button"
                key={section.title}
                onClick={() => setActiveSection(section.id)}
                className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md ${
                  activeSection === section.id ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-100'
                }`}
              >
                <div className={`mb-3 inline-flex rounded-xl p-2.5 ${
                  activeSection === section.id
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md'
                    : 'bg-gray-100'
                }`}>
                  <Icon className={`h-5 w-5 ${activeSection === section.id ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{section.description}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{activeSectionMeta.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{activeSectionMeta.description}</p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-700 shadow-md transition-all"
            >
              Save
            </button>
          </div>

          {activeSection === 'company' && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" placeholder="Company Name" />
              <input className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" placeholder="GST Number" />
              <input className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" placeholder="Phone" />
              <input className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" placeholder="Email" />
              <textarea
                className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                rows={3}
                placeholder="Address"
              />
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="mt-5 space-y-3">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" defaultChecked />
                Quotation follow-up reminders
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" defaultChecked />
                Low stock alerts
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                Attendance anomaly alerts
              </label>
            </div>
          )}

          {activeSection === 'tax' && (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <input type="number" className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Default GST %" />
              <select className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option>Round Off: Nearest Rupee</option>
                <option>Round Off: 2 Decimals</option>
              </select>
              <select className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option>Price Basis: Tax Exclusive</option>
                <option>Price Basis: Tax Inclusive</option>
              </select>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option>Password Policy: Medium</option>
                <option>Password Policy: Strong</option>
              </select>
              <select className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option>Session Timeout: 30 min</option>
                <option>Session Timeout: 60 min</option>
                <option>Session Timeout: 120 min</option>
              </select>
            </div>
          )}

          {saveMessage && (
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 bg-white border border-emerald-100 rounded-2xl shadow-xl animate-fade-in">
              <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                <CheckCircleIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{saveMessage}</p>
                <p className="text-xs text-gray-500">Changes have been applied successfully.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
