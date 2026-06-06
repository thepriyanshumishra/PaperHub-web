'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NotebooksRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/bookmarks');
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );
}
