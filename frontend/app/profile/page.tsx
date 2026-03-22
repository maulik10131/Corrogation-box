'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  UserCircleIcon,
  CameraIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  LockClosedIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

type StoredUser = {
  id?: number;
  username?: string;
  email?: string;
  full_name?: string;
  role?: string;
  is_super_admin?: number;
};

type StoredCompany = {
  id?: number;
  name?: string;
  code?: string;
  db_name?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/corrugation-pms/backend/web/api';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin:      { label: 'Admin',      color: 'text-purple-700', bg: 'bg-purple-100' },
  manager:    { label: 'Manager',    color: 'text-blue-700',   bg: 'bg-blue-100'   },
  supervisor: { label: 'Supervisor', color: 'text-green-700',  bg: 'bg-green-100'  },
  staff:      { label: 'Staff',      color: 'text-gray-700',   bg: 'bg-gray-100'   },
};

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser]       = useState<StoredUser | null>(null);
  const [company, setCompany] = useState<StoredCompany | null>(null);
  const [token, setToken]     = useState<string>('');

  // Avatar
  const [avatarSrc, setAvatarSrc]     = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Edit profile
  const [editing, setEditing]         = useState(false);
  const [editName, setEditName]       = useState('');
  const [editEmail, setEditEmail]     = useState('');
  const [editPhone, setEditPhone]     = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change password
  const [changingPwd, setChangingPwd]       = useState(false);
  const [currentPwd, setCurrentPwd]         = useState('');
  const [newPwd, setNewPwd]                 = useState('');
  const [confirmPwd, setConfirmPwd]         = useState('');
  const [showCurrent, setShowCurrent]       = useState(false);
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [savingPwd, setSavingPwd]           = useState(false);
  const [pwdMsg, setPwdMsg]                 = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t     = localStorage.getItem('pms_token')    || '';
      const uStr  = localStorage.getItem('pms_user')     || '';
      const cStr  = localStorage.getItem('pms_company')  || '';
      const saved = localStorage.getItem('pms_avatar')   || '';

      if (!t || !uStr) { router.replace('/login'); return; }

      try {
        const u = JSON.parse(uStr) as StoredUser;
        const c = cStr ? JSON.parse(cStr) as StoredCompany : null;
        setUser(u);
        setCompany(c);
        setToken(t);
        setEditName(u.full_name  || '');
        setEditEmail(u.email     || '');
        setEditPhone('');
        if (saved) setAvatarSrc(saved);
        setIsAuthenticated(true);
        setAuthChecking(false);
      } catch { router.replace('/login'); }
    }
  }, [router]);

  /* ── Avatar upload ─────────────────────────────── */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { (window as any).appAlert('Image must be under 2 MB'); return; }
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAvatarSrc(base64);
      localStorage.setItem('pms_avatar', base64);
      window.dispatchEvent(new Event('pms_avatar_updated'));
      setAvatarUploading(false);
    };
    reader.readAsDataURL(file);
  };

  /* ── Save profile ────────────────────────────────- */
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res  = await fetch(`${API_URL}/users/update-profile`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ full_name: editName, email: editEmail }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, full_name: editName, email: editEmail } as StoredUser;
        setUser(updated);
        localStorage.setItem('pms_user', JSON.stringify(updated));
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        setEditing(false);
      } else {
        setProfileMsg({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      // Offline fallback – save locally
      const updated = { ...user, full_name: editName, email: editEmail } as StoredUser;
      setUser(updated);
      localStorage.setItem('pms_user', JSON.stringify(updated));
      setProfileMsg({ type: 'success', text: 'Profile saved locally.' });
      setEditing(false);
    }
    setSavingProfile(false);
  };

  /* ── Change password ──────────────────────────── */
  const handleChangePassword = async () => {
    setPwdMsg(null);
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdMsg({ type: 'error', text: 'All fields are required.' }); return; }
    if (newPwd.length < 6)  { setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters.' }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ type: 'error', text: 'New passwords do not match.' }); return; }

    setSavingPwd(true);
    try {
      const res  = await fetch(`${API_URL}/users/change-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      const data = await res.json();
      if (data.success) {
        setPwdMsg({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        setChangingPwd(false);
      } else {
        setPwdMsg({ type: 'error', text: data.error || 'Failed to change password.' });
      }
    } catch {
      setPwdMsg({ type: 'error', text: 'Network error. Please try again.' });
    }
    setSavingPwd(false);
  };

  if (authChecking || !isAuthenticated) return null;

  const displayName = user?.full_name || user?.username || 'Guest User';
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const role        = user?.role || 'staff';
  const roleConfig  = ROLE_CONFIG[role] || ROLE_CONFIG.staff;
  const joinDate    = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">

      {/* ── HERO BANNER ─────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg">
        {/* gradient background */}
        <div className="h-36 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
        
        {/* avatar + name row */}
        <div className="bg-white px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14">
            {/* Avatar */}
            <div className="relative w-28 h-28 shrink-0">
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                {avatarSrc
                  ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-white">{initials}</span>
                }
              </div>
              {/* Camera button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                title="Upload photo"
              >
                {avatarUploading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CameraIcon className="w-4 h-4" />
                }
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name + role */}
            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                {user?.is_super_admin === 1 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                    <ShieldCheckIcon className="w-3.5 h-3.5" /> Super Admin
                  </span>
                )}
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${roleConfig.bg} ${roleConfig.color}`}>
                  {roleConfig.label}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">@{user?.username}</p>
            </div>

            {/* Edit button */}
            <div className="pb-1">
              {!editing
                ? <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow transition-colors">
                    <PencilIcon className="w-4 h-4" /> Edit Profile
                  </button>
                : <div className="flex gap-2">
                    <button onClick={handleSaveProfile} disabled={savingProfile} className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl shadow transition-colors disabled:opacity-60">
                      {savingProfile ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckIcon className="w-4 h-4" />} Save
                    </button>
                    <button onClick={() => { setEditing(false); setProfileMsg(null); }} className="flex items-center gap-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-xl transition-colors">
                      <XMarkIcon className="w-4 h-4" /> Cancel
                    </button>
                  </div>
              }
            </div>
          </div>

          {/* Photo hint */}
          <p className="text-xs text-gray-400 mt-2">Click the camera icon to upload a profile photo (max 2 MB)</p>
        </div>
      </div>

      {/* profile save message */}
      {profileMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {profileMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Account Details ───────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Personal Info card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-gray-50">
              <IdentificationIcon className="w-5 h-5 text-indigo-500" />
              <h2 className="font-semibold text-gray-800">Personal Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                {editing
                  ? <input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  : <p className="mt-1.5 text-sm font-semibold text-gray-900">{user?.full_name || '-'}</p>
                }
              </div>
              {/* Username */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Username</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">@{user?.username || '-'}</p>
                  <span className="text-xs text-gray-400">(cannot change)</span>
                </div>
              </div>
              {/* Email */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email Address</label>
                {editing
                  ? <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  : <div className="mt-1.5 flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-900">{user?.email || '-'}</p>
                    </div>
                }
              </div>
              {/* Phone */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</label>
                {editing
                  ? <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Enter phone number" className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  : <div className="mt-1.5 flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-semibold text-gray-900">{editPhone || 'Not provided'}</p>
                    </div>
                }
              </div>
              {/* Role */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
                <div className="mt-1.5">
                  <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full capitalize ${roleConfig.bg} ${roleConfig.color}`}>
                    {roleConfig.label}
                  </span>
                </div>
              </div>
              {/* Member Since */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-900">{joinDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => { setChangingPwd(!changingPwd); setPwdMsg(null); }}
              className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <LockClosedIcon className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold text-gray-800">Change Password</h2>
              </div>
              <span className="text-xs text-gray-500">{changingPwd ? 'Hide ▲' : 'Expand ▼'}</span>
            </button>

            {changingPwd && (
              <div className="p-6 space-y-4">
                {pwdMsg && (
                  <div className={`rounded-lg px-4 py-3 text-sm ${pwdMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {pwdMsg.text}
                  </div>
                )}
                {/* Current password */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPwd}
                      onChange={e => setCurrentPwd(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                      {showCurrent ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {/* New password */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPwd}
                      onChange={e => setNewPwd(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                      {showNew ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* strength bar */}
                  {newPwd.length > 0 && (
                    <div className="mt-1.5">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                            newPwd.length >= i * 3
                              ? i <= 1 ? 'bg-red-400' : i === 2 ? 'bg-yellow-400' : i === 3 ? 'bg-blue-400' : 'bg-green-500'
                              : 'bg-gray-200'
                          }`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {newPwd.length < 4 ? 'Weak' : newPwd.length < 7 ? 'Fair' : newPwd.length < 10 ? 'Good' : 'Strong'}
                      </p>
                    </div>
                  )}
                </div>
                {/* Confirm password */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirm New Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      placeholder="Repeat new password"
                      className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${confirmPwd && newPwd !== confirmPwd ? 'border-red-300' : 'border-gray-300'}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPwd && newPwd !== confirmPwd && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={savingPwd}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm rounded-xl transition-colors"
                >
                  {savingPwd
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Changing...</>
                    : <><LockClosedIcon className="w-4 h-4" /> Change Password</>
                  }
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT sidebar ────────────────────────── */}
        <div className="space-y-6">

          {/* Company Info */}
          {company && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <BuildingOffice2Icon className="w-5 h-5 text-indigo-500" />
                <h2 className="font-semibold text-gray-800">Company</h2>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Company Name</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{company.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Company Code</p>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md tracking-widest">
                    {company.code}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Database</p>
                  <p className="text-xs font-mono text-gray-600 mt-0.5 bg-gray-50 px-2 py-1 rounded">{company.db_name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Account Status */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <ShieldCheckIcon className="w-5 h-5 text-green-500" />
              <h2 className="font-semibold text-gray-800">Account Status</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Role</span>
                <span className={`text-sm font-semibold capitalize ${roleConfig.color}`}>{roleConfig.label}</span>
              </div>
              {user?.is_super_admin === 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Super Admin</span>
                  <span className="text-amber-600 text-sm font-semibold">Yes</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">User ID</span>
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">#{user?.id}</span>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 p-5 text-white shadow-lg">
            <h3 className="font-semibold text-sm mb-3">💡 Quick Tips</h3>
            <ul className="space-y-2 text-xs text-indigo-100">
              <li className="flex gap-2"><span>📷</span> Click the camera icon on your avatar to upload a profile photo.</li>
              <li className="flex gap-2"><span>✏️</span> Use Edit Profile to update your name and email.</li>
              <li className="flex gap-2"><span>🔒</span> Change your password regularly to keep your account secure.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
