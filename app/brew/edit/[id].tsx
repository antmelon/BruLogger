import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BrewForm from '../../../components/BrewForm';
import { getBrew, updateBrew, deleteBrewPhoto } from '../../../lib/brews';
import { colors } from '../../../lib/theme';
import { Brew, BrewInsert } from '../../../types';

export default function EditBrewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [brew, setBrew] = useState<Brew | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getBrew(id)
      .then(setBrew)
      .catch(() => setLoadError('Failed to load brew.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(updated: BrewInsert) {
    // Photo was removed: delete the old file from storage
    if (brew?.photo_url && updated.photo_url === null) {
      await deleteBrewPhoto(brew.photo_url);
    }
    await updateBrew(id, updated);
    router.replace(`/brew/${id}`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError || !brew) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{loadError ?? 'Brew not found.'}</Text>
      </View>
    );
  }

  return <BrewForm initial={brew} onSubmit={handleSubmit} submitLabel="Save Changes" />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.textMedium, fontSize: 16 },
});
