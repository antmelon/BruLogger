import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Installing the website as an app, which is how Android users get BruLogger until there's a
// Play Store version. Chrome and Edge offer it through a `beforeinstallprompt` event, which
// public/index.html catches into window.__installPrompt (it can fire before the app loads).
// Safari and Firefox never offer it, so there the Install button just doesn't appear.

type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window {
    __installPrompt?: InstallPromptEvent | null;
  }
}

const currentPrompt = () => (Platform.OS === 'web' ? window.__installPrompt ?? null : null);

/** Whether the browser will install the app right now, and a function that asks the user. */
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(currentPrompt);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const update = () => setPrompt(currentPrompt());
    window.addEventListener('installpromptchange', update);
    update();
    return () => window.removeEventListener('installpromptchange', update);
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    // Each offer can only be shown once; Chrome fires a new event if it offers again
    window.__installPrompt = null;
    setPrompt(null);
  }, [prompt]);

  return { canInstall: prompt !== null, install };
}
