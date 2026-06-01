'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './AuthProvider';
import Sidebar from './Sidebar';
import ShortcutHandler from './ShortcutHandler';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <AuthProvider>
        <main className="flex-1 min-h-screen w-screen overflow-hidden">
          {children}
        </main>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <ShortcutHandler />
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
        {children}
      </main>
    </AuthProvider>
  );
}
