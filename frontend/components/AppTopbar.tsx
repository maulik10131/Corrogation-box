'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BellIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  HomeIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  TruckIcon,
  CubeIcon,
  UserGroupIcon,
  BanknotesIcon,
  CpuChipIcon,
  ChartBarIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';

type StoredUser = {
  id?: number;
  username?: string;
  email?: string;
  full_name?: string;
};

export default function AppTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string>('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (isAuthPage) return;

    const raw = localStorage.getItem('pms_user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    }
    setAvatarSrc(localStorage.getItem('pms_avatar') || '');

    const onAvatarUpdate = () => setAvatarSrc(localStorage.getItem('pms_avatar') || '');
    window.addEventListener('pms_avatar_updated', onAvatarUpdate);
    return () => window.removeEventListener('pms_avatar_updated', onAvatarUpdate);
  }, [isAuthPage]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const displayName = useMemo(() => {
    if (!user) return 'Guest';
    return user.full_name || user.username || 'User';
  }, [user]);

  const email = user?.email || 'Not logged in';
  const initials = (displayName || 'U').slice(0, 1).toUpperCase();

  type PageInfo = { title: string; icon: React.ElementType; bg: string; fg: string };
  const PAGE_MAP: Record<string, PageInfo> = {
    '/dashboard':        { title: 'Dashboard',         icon: HomeIcon,                  bg: 'bg-indigo-50',  fg: 'text-indigo-600' },
    '/inventory':        { title: 'Inventory',          icon: CubeIcon,                  bg: 'bg-cyan-50',    fg: 'text-cyan-600' },
    '/quotations':       { title: 'Quotations',         icon: DocumentTextIcon,          bg: 'bg-blue-50',    fg: 'text-blue-600' },
    '/customers':        { title: 'Customers',          icon: UsersIcon,                 bg: 'bg-green-50',   fg: 'text-green-600' },
    '/box-calculation':  { title: 'Box Calculator',     icon: ShoppingCartIcon,          bg: 'bg-purple-50',  fg: 'text-purple-600' },
    '/work-orders':      { title: 'Work Orders',        icon: ClipboardDocumentListIcon, bg: 'bg-violet-50',  fg: 'text-violet-600' },
    '/orders':           { title: 'Orders',             icon: ShoppingCartIcon,          bg: 'bg-purple-50',  fg: 'text-purple-600' },
    '/dispatch':         { title: 'Dispatch',           icon: TruckIcon,                 bg: 'bg-teal-50',    fg: 'text-teal-600' },
    '/attendance':       { title: 'Attendance',         icon: ClipboardDocumentListIcon, bg: 'bg-amber-50',   fg: 'text-amber-600' },
    '/payments':         { title: 'Payments',           icon: BanknotesIcon,             bg: 'bg-lime-50',    fg: 'text-lime-600' },
    '/reports':          { title: 'Reports',            icon: ChartBarIcon,              bg: 'bg-orange-50',  fg: 'text-orange-600' },
    '/users':            { title: 'Users',              icon: UserGroupIcon,             bg: 'bg-rose-50',    fg: 'text-rose-600' },
    '/settings':         { title: 'Settings',           icon: Cog6ToothIcon,             bg: 'bg-gray-100',   fg: 'text-gray-600' },
    '/ai-features':      { title: 'Smart AI Features',  icon: CpuChipIcon,               bg: 'bg-violet-50',  fg: 'text-violet-600' },
    '/profile':          { title: 'My Profile',         icon: UserCircleIcon,            bg: 'bg-indigo-50',  fg: 'text-indigo-600' },
  };

  const currentPage: PageInfo = PAGE_MAP[pathname] ?? {
    title: 'Corrugation PMS', icon: HomeIcon, bg: 'bg-indigo-50', fg: 'text-indigo-600',
  };
  const PageIcon = currentPage.icon;

  const handleLogout = () => {
    localStorage.removeItem('pms_user');
    localStorage.removeItem('pms_token');
    router.push('/login');
  };

  if (isAuthPage) {
    return null;
  }

  return (
    <header className="bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Page title — left side */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-xl flex-shrink-0 ${currentPage.bg}`}>
            <PageIcon className={`w-5 h-5 ${currentPage.fg}`} />
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate">{currentPage.title}</p>
        </div>

        {/* Today quick stats — center */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-xs text-gray-500">Today Sale:</span>
              <span className="text-xs font-semibold text-gray-800">₹24,500</span>
            </div>
            <div className="w-px h-3.5 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              <span className="text-xs text-gray-500">Dispatch:</span>
              <span className="text-xs font-semibold text-gray-800">136 Box</span>
            </div>
            <div className="w-px h-3.5 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              <span className="text-xs text-gray-500">Pending:</span>
              <span className="text-xs font-semibold text-gray-800">₹58,200</span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Notification bell */}
          <button
            className="relative p-2 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors"
            type="button"
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Profile button */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 px-2.5 py-1.5 hover:from-indigo-100 hover:to-purple-100 transition-all shadow-sm"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-indigo-200">
                {avatarSrc
                  ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                  : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {initials}
                    </div>
                  )
                }
              </div>
              {/* Name (hidden on small screens) */}
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[90px] truncate">
                {displayName}
              </span>
              <ChevronDownIcon className={`w-4 h-4 text-indigo-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden z-50">
                {/* Header gradient */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/60 flex-shrink-0">
                    {avatarSrc
                      ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                      : (
                        <div className="w-full h-full bg-white/20 flex items-center justify-center text-white font-bold text-base">
                          {initials}
                        </div>
                      )
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{displayName}</p>
                    <p className="text-xs text-indigo-100 truncate">{email}</p>
                  </div>
                </div>

                <div className="p-2">
                  {user ? (
                    <>
                      <Link
                        href="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="mt-1 flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
                      >
                        <span className="p-1 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                          <UserCircleIcon className="w-3.5 h-3.5 text-indigo-600" />
                        </span>
                        My Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 rounded-xl hover:bg-purple-50 hover:text-purple-700 transition-colors group"
                      >
                        <span className="p-1 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                          <Cog6ToothIcon className="w-3.5 h-3.5 text-purple-600" />
                        </span>
                        Settings
                      </Link>
                      <div className="my-1.5 border-t border-gray-100" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 rounded-xl hover:bg-red-50 transition-colors group"
                      >
                        <span className="p-1 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                          <ArrowRightOnRectangleIcon className="w-3.5 h-3.5 text-red-500" />
                        </span>
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="mt-1 flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 rounded-xl hover:bg-indigo-50"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      Login
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
