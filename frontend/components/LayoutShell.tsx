'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AppTopbar from '@/components/AppTopbar';
import BusinessAssistantChatbot from '@/components/BusinessAssistantChatbot';
import AppToast from '@/components/AppToast';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pms_sidebar_collapsed');
    if (saved === 'true') setSidebarCollapsed(true);

    const handler = (e: Event) => {
      setSidebarCollapsed((e as CustomEvent).detail.collapsed);
    };
    window.addEventListener('pms_sidebar_toggle', handler);
    return () => window.removeEventListener('pms_sidebar_toggle', handler);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {!isAuthPage && <Sidebar />}

      <main className={`flex-1 overflow-y-auto ${
        isAuthPage ? 'p-0' : `p-4 lg:p-6 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`
      }`}>
        {!isAuthPage && <AppTopbar />}
        {children}
      </main>

      {!isAuthPage && <BusinessAssistantChatbot />}
      <AppToast />
    </div>
  );
}
