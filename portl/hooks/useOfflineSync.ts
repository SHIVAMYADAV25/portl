import { useCallback, useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { flushQueue, pendingCount } from "@/services/offlineQueue";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(() => {
    pendingCount().then(setPending).catch(() => {});
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await flushQueue();
    } finally {
      setSyncing(false);
      refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    refreshPending();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) sync();
    });
    return unsubscribe;
  }, [sync, refreshPending]);

  return { isOnline, pending, syncing, sync };
}
