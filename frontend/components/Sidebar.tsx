'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  CubeIcon, 
  CalculatorIcon, 
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  TruckIcon,
  CurrencyRupeeIcon,
  UsersIcon,
  CpuChipIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role?: string;
  department?: string;
}

interface Company {
  id: number;
  name: string;
  code: string;
  db_name?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[]; // If undefined, accessible to all roles
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Inventory', href: '/inventory', icon: CubeIcon, roles: ['admin', 'manager', 'supervisor', 'staff'] },
  { name: 'Quotations', href: '/quotations', icon: DocumentTextIcon, roles: ['admin', 'manager', 'supervisor'] },
  { name: 'Customers', href: '/customers', icon: UserGroupIcon, roles: ['admin', 'manager', 'supervisor'] },
  { name: 'Box Calculator', href: '/box-calculation', icon: CalculatorIcon, roles: ['admin', 'manager', 'supervisor', 'operator'] },
  { name: 'Work Orders', href: '/work-orders', icon: ClipboardDocumentListIcon, roles: ['admin', 'manager', 'supervisor', 'operator'] },
  { name: 'Orders', href: '/orders', icon: ClipboardDocumentListIcon, roles: ['admin', 'manager', 'supervisor'] },
  { name: 'Dispatch', href: '/dispatch', icon: TruckIcon, roles: ['admin', 'manager', 'supervisor', 'operator'] },
  { name: 'Attendance', href: '/attendance', icon: CalendarDaysIcon, roles: ['admin', 'manager', 'supervisor'] },
  { name: 'Payments', href: '/payments', icon: CurrencyRupeeIcon, roles: ['admin', 'manager'] },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, roles: ['admin', 'manager'] },
  { name: 'Users', href: '/users', icon: UsersIcon, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, roles: ['admin'] },
  { name: 'Smart AI', href: '/ai-features', icon: CpuChipIcon, roles: ['admin', 'manager'] },
];



export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCollapsed = localStorage.getItem('pms_sidebar_collapsed');
      if (savedCollapsed === 'true') setCollapsed(true);

      const userStr = localStorage.getItem('pms_user');
      const companyStr = localStorage.getItem('pms_company');
      
      if (userStr) {
        try {
          setUser(JSON.parse(userStr));
        } catch {
          setUser(null);
        }
      }
      
      if (companyStr) {
        try {
          setCompany(JSON.parse(companyStr));
        } catch {
          setCompany(null);
        }
      }
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('pms_sidebar_collapsed', String(next));
    window.dispatchEvent(new CustomEvent('pms_sidebar_toggle', { detail: { collapsed: next } }));
  };

  // Filter navigation based on user role
  const filteredNavigation = useMemo(() => {
    if (!user) return navigation;
    
    const userRole = user.role || 'staff';
    
    return navigation.filter(item => {
      // If no roles specified, accessible to all
      if (!item.roles || item.roles.length === 0) return true;
      
      // Check if user role is in the allowed roles
      return item.roles.includes(userRole);
    });
  }, [user]);

  if (pathname === '/login' || pathname === '/signup' || pathname === '/login-mt' || pathname === '/signup-mt') {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const NavLinks = () => (
    <>
      {filteredNavigation.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? item.name : undefined}
            className={`flex items-center rounded-xl transition-all ${
              collapsed
                ? 'justify-center w-10 h-10 mx-auto'
                : 'gap-3 px-4 py-3'
            } ${
              active
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-500'}`} />
            {!collapsed && <span className="font-medium">{item.name}</span>}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 bg-white rounded-lg shadow-md"
        >
          {mobileOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full ${collapsed ? 'w-16' : 'w-64'} bg-white shadow-xl z-50 transform transition-all duration-300 lg:translate-x-0 flex flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + Collapse Toggle */}
        {collapsed ? (
          <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-2 border-b gap-3">
            <Link href="/dashboard">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
                <svg viewBox="0 0 100 100" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="12" y="44" width="76" height="48" rx="4" fill="white" fillOpacity="0.9" />
                  <line x1="12" y1="56" x2="88" y2="56" stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.35" />
                  <line x1="12" y1="65" x2="88" y2="65" stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.35" />
                  <line x1="12" y1="74" x2="88" y2="74" stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.35" />
                  <rect x="12" y="24" width="33" height="22" rx="3" fill="white" fillOpacity="0.7" />
                  <rect x="55" y="24" width="33" height="22" rx="3" fill="white" fillOpacity="0.7" />
                  <rect x="44" y="38" width="12" height="54" rx="2" fill="white" fillOpacity="0.4" />
                </svg>
              </div>
            </Link>
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex items-center justify-center w-8 h-6 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-500 transition-colors"
            >
              <ChevronDoubleRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-5 border-b flex-shrink-0 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="12" y="44" width="76" height="48" rx="4" fill="white" fillOpacity="0.9" />
                  <line x1="12" y1="56" x2="88" y2="56" stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.35" />
                  <line x1="12" y1="65" x2="88" y2="65" stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.35" />
                  <line x1="12" y1="74" x2="88" y2="74" stroke="#7c3aed" strokeWidth="2" strokeOpacity="0.35" />
                  <rect x="12" y="24" width="33" height="22" rx="3" fill="white" fillOpacity="0.7" />
                  <rect x="55" y="24" width="33" height="22" rx="3" fill="white" fillOpacity="0.7" />
                  <rect x="44" y="38" width="12" height="54" rx="2" fill="white" fillOpacity="0.4" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-base">BoxCost Pro</h1>
                <p className="text-xs text-gray-500">Corrugation ERP</p>
              </div>
            </Link>
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors flex-shrink-0"
            >
              <ChevronDoubleLeftIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation & Footer - Scrollable Area */}
        <div className="flex-1 overflow-y-auto">
          <nav className={`space-y-1 ${collapsed ? 'px-2 py-3' : 'p-4 space-y-2'}`}>
            <NavLinks />
          </nav>

          {/* Footer - Scrolls with content */}
          <div className="p-3 border-t bg-white">
            {/* Company Info */}
            {company && (
              <div className={`mb-2 ${collapsed ? 'flex justify-center' : 'px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100'}`}>
                {collapsed ? (
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center" title={company.name}>
                    <CubeIcon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CubeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-900 truncate">{company.name}</p>
                      <p className="text-[10px] text-blue-600 uppercase font-medium">{company.code}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Info */}
            <div className={`flex items-center bg-gray-50 rounded-xl ${collapsed ? 'justify-center p-2' : 'gap-3 p-3'}`}>
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0" title={collapsed ? (user?.full_name || user?.username || '') : undefined}>
                <span className="text-blue-600 font-bold text-sm">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate text-sm">
                    {user?.full_name || user?.username || 'User'}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                    {user?.role && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full uppercase">
                        {user.role}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}