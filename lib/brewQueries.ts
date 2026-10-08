import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import {
  focusManager, QueryClient, QueryKey, useMutation, useQuery, useQueryClient,
} from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Brew, BrewInsert } from '../types';
import { createBrew, deleteBrew, deleteBrewPhoto, getBrew, getBrews, updateBrew } from './brews';

// Cached access to brews for screens, built on lib/brews.ts. Every screen reads the same 'brews'
// query; a brew's detail is keyed under it (['brews', id]) so invalidating the list covers both.

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const keys = {
  all: ['brews'] as const,
  one: (id: string) => ['brews', id] as const,
};

/** Native has no window focus events, so treat the app returning to the foreground as focus. */
export function useAppStateFocus() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);
}

/**
 * Refetch stale data when a screen regains focus. Tabs and stacked screens stay mounted, so
 * React Query's own mount and window-focus refetches don't fire on navigation. This is what
 * picks up brews logged from Telegram.
 */
function useRefetchOnScreenFocus(queryKey: QueryKey) {
  const client = useQueryClient();
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false; // the initial mount already fetched
        return;
      }
      client.refetchQueries({ queryKey, exact: true, stale: true });
    }, [client, queryKey]),
  );
}

export function useBrews() {
  useRefetchOnScreenFocus(keys.all);
  return useQuery({ queryKey: keys.all, queryFn: getBrews });
}

export function useBrew(id: string) {
  const client = useQueryClient();
  const queryKey = useMemo(() => keys.one(id), [id]);
  useRefetchOnScreenFocus(queryKey);
  return useQuery({
    queryKey,
    queryFn: () => getBrew(id),
    // Coming from the list, show the cached row right away (refetched if it's stale)
    initialData: () => client.getQueryData<Brew[]>(keys.all)?.find((b) => b.id === id),
    initialDataUpdatedAt: () => client.getQueryState(keys.all)?.dataUpdatedAt,
  });
}

export function useCreateBrew() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createBrew,
    onSuccess: (brew) => {
      client.setQueryData(keys.one(brew.id), brew);
      return client.invalidateQueries({ queryKey: keys.all, exact: true });
    },
  });
}

/** Photo cleanup happens here, after the DB write succeeds, so screens can't forget it. */
export function useUpdateBrew() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; brew: BrewInsert; previousPhotoUrl: string | null }) => {
      const updated = await updateBrew(vars.id, vars.brew);
      if (vars.previousPhotoUrl && vars.brew.photo_url !== vars.previousPhotoUrl) {
        await deleteBrewPhoto(vars.previousPhotoUrl).catch((e) => console.warn('Failed to delete old photo:', e));
      }
      return updated;
    },
    onSuccess: (brew) => {
      client.setQueryData(keys.one(brew.id), brew);
      return client.invalidateQueries({ queryKey: keys.all, exact: true });
    },
  });
}

export function useDeleteBrew() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (brew: Pick<Brew, 'id' | 'photo_url'>) => {
      await deleteBrew(brew.id);
      if (brew.photo_url) {
        await deleteBrewPhoto(brew.photo_url).catch((e) => console.warn('Failed to delete photo:', e));
      }
    },
    // Only the list: the deleted brew's own entry is still observed by the detail screen until it
    // navigates away, and refetching it there would flash "not found". It expires on its own.
    onSuccess: () => client.invalidateQueries({ queryKey: keys.all, exact: true }),
  });
}
