'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/bot', key: '1' },
  { href: '/clients', key: '2' },
  { href: '/itr', key: '3' },
  { href: '/gst', key: '4' },
  { href: '/dsc', key: '5' },
];

export default function ShortcutHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Search focus: Ctrl + K or Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('[data-search-input="true"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 2. Clear focus/close modal: Escape
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          activeElement.blur();
        }
        return;
      }

      // 3. Navigation shortcuts: Alt + [1-5]
      // Ensure no input field is currently active/typing, or allow Alt navigation regardless
      // Usually Alt shortcuts are safe to trigger even from input, but let's allow it globally
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const matchingItem = navItems.find((item) => item.key === e.key);
        if (matchingItem) {
          e.preventDefault();
          router.push(matchingItem.href);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return null;
}
