import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BrewForm from '../../../components/BrewForm';
import { getBrew, updateBrew } from '../../../lib/brews';
import { Brew, BrewInsert } from '../../../types';

export default function EditBrewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [brew, setBrew] = useState<Brew | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBrew(id).then(setBrew).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(updated: BrewInsert) {
    await updateBrew(id, updated);
    router.replace(`/brew/${id}`);
  }

  if (loading || !brew) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5A2B" />
      </View>
    );
  }

  return <BrewForm initial={brew} onSubmit={handleSubmit} submitLabel="Save Changes" />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EFE6' },
});
