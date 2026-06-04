import { useEffect } from 'react';
import { useSyncStore } from '@/store/syncStore.ts';
import toast from 'react-hot-toast';

export function OnlineStatusProvider({ children }: { children: React.ReactNode }) {
  const { setOnline } = useSyncStore();

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      toast.success('Back online — syncing changes', { id: 'online-status' });
    };

    const handleOffline = () => {
      setOnline(false);
      toast('You\'re offline — changes will sync when reconnected', {
        id: 'online-status',
        icon: '📡',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return <>{children}</>;
}
