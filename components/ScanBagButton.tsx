import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CoffeeFormValues } from '../lib/form';
import { prepareForUpload } from '../lib/photos';
import { scanBagPhoto } from '../lib/scanBagPhoto';
import { colors } from '../lib/theme';
import { BagIcon } from './icons';

/**
 * Snap the bag is on the website for now. The iPhone app gets it with version 1.1.0, whose camera
 * permission text also mentions photographing a bag: App Review checks that the text says what
 * the camera is used for, and the 1.0 text only mentions brew photos. Turning it on there also
 * needs the camera-or-library choice that BrewForm's photo picker has.
 */
export const BAG_SCAN_AVAILABLE = Platform.OS === 'web';

/** "Scan the Bag": a photo of a coffee bag fills in the coffee's fields, which stay editable. */
export default function ScanBagButton({ onScanned }: { onScanned: (fields: Partial<CoffeeFormValues>) => void }) {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);

  async function scan() {
    // The browser's file picker; on a phone it offers the camera too
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    setScanning(true);
    setStatus(null);
    try {
      const { coffee, remaining } = await scanBagPhoto(await prepareForUpload(picked.assets[0]));
      onScanned(coffee);
      const left = remaining === null ? '' : ` ${remaining} ${remaining === 1 ? 'scan' : 'scans'} left today.`;
      setStatus({ text: `Filled in from your photo. Check the details before saving.${left}`, error: false });
    } catch (e) {
      setStatus({ text: e instanceof Error ? e.message : "Couldn't scan the bag. Please try again.", error: true });
    } finally {
      setScanning(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={scan}
        disabled={scanning}
        activeOpacity={0.8}
        role="button"
        aria-label="Scan the bag: fill in the coffee from a photo of its label"
        aria-busy={scanning}
      >
        {scanning ? <ActivityIndicator color={colors.primary} /> : <BagIcon size={20} color={colors.primary} />}
        <Text style={styles.buttonText}>{scanning ? 'Reading the bag…' : 'Scan the Bag'}</Text>
      </TouchableOpacity>
      {status ? (
        <Text style={[styles.status, status.error && styles.statusError]} role={status.error ? 'alert' : 'status'}>
          {status.text}
        </Text>
      ) : (
        <Text style={styles.status}>A photo of the label fills in the details below.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: colors.surfaceWarm,
  },
  buttonText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  status: { fontSize: 13, lineHeight: 18, color: colors.textMedium, marginTop: 8 },
  statusError: { color: colors.error },
});
