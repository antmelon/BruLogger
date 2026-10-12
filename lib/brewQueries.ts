import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import {
  focusManager, QueryClient, QueryKey, useMutation, useQuery, useQueryClient,
} from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Brew, BrewInsert, Coffee, CoffeeInsert } from '../types';
import { createBrew, deleteBrew, deleteBrewPhoto, getBrew, getBrews, getPhotoUrl, updateBrew } from './brews';
import { createCoffee, deleteCoffee, getCoffees, updateCoffee } from './coffees';

// Cached access to brews and coffees for screens, built on lib/brews.ts and lib/coffees.ts. Every
// screen reads the same 'brews' query; a brew's detail is keyed under it (['brews', id]) so
// invalidating the list covers both. Brews embed their coffee, so editing a coffee refreshes the
// brews too. Coffees are one 'coffees' list.

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const keys = {
  all: ['brews'] as const,
  one: (id: string) => ['brews', id] as const,
  coffees: ['coffees'] as const,
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
    mutationFn: async (vars: { id: string; brew: BrewInsert; previousPhotoPath: string | null }) => {
      const updated = await updateBrew(vars.id, vars.brew);
      if (vars.previousPhotoPath && vars.brew.photo_path !== vars.previousPhotoPath) {
        await deleteBrewPhoto(vars.previousPhotoPath).catch((e) => console.warn('Failed to delete old photo:', e));
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
    mutationFn: async (brew: Pick<Brew, 'id' | 'photo_path'>) => {
      await deleteBrew(brew.id);
      if (brew.photo_path) {
        await deleteBrewPhoto(brew.photo_path).catch((e) => console.warn('Failed to delete photo:', e));
      }
    },
    // Only the list: the deleted brew's own entry is still observed by the detail screen until it
    // navigates away, and refetching it there would flash "not found". It expires on its own.
    onSuccess: () => client.invalidateQueries({ queryKey: keys.all, exact: true }),
  });
}

export function useCoffees() {
  useRefetchOnScreenFocus(keys.coffees);
  return useQuery({ queryKey: keys.coffees, queryFn: getCoffees });
}

/**
 * The new coffee goes into the cached list straight away, so the brew form can save a brew of it
 * without waiting for the list to reload.
 */
export function useCreateCoffee() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createCoffee,
    onSuccess: (coffee) => {
      client.setQueryData<Coffee[]>(keys.coffees, (list) => (list ? [coffee, ...list] : list));
      void client.invalidateQueries({ queryKey: keys.coffees });
    },
  });
}

/** Also refreshes the brews, which carry their coffee's details. */
export function useUpdateCoffee() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; coffee: Partial<CoffeeInsert> }) => updateCoffee(vars.id, vars.coffee),
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: keys.coffees }),
      client.invalidateQueries({ queryKey: keys.all }),
    ]),
  });
}

export function useDeleteCoffee() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteCoffee,
    onSuccess: () => client.invalidateQueries({ queryKey: keys.coffees }),
  });
}

const SIGNED_URL_TTL_S = 3600;

/**
 * A displayable link for a brew's photo. The bucket is private, so this is a signed link that
 * expires after an hour; it's cached for 50 minutes and refetched after that.
 */
export function usePhotoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['photo-url', path],
    queryFn: () => getPhotoUrl(path!, SIGNED_URL_TTL_S),
    enabled: !!path,
    staleTime: (SIGNED_URL_TTL_S - 600) * 1000,
    gcTime: SIGNED_URL_TTL_S * 1000,
  });
}
