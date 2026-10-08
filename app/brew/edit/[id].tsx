import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BrewForm from '../../../components/BrewForm';
import { useBrew, useUpdateBrew } from '../../../lib/brewQueries';
import { colors } from '../../../lib/theme';
import { BrewInsert } from '../../../types';

export default function EditBrewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: brew, isPending, isError } = useBrew(id);
  const updateMutation = useUpdateBrew();

  async function handleSubmit(updated: BrewInsert) {
    await updateMutation.mutateAsync({ id, brew: updated, previousPhotoUrl: brew?.photo_url ?? null });
    router.replace(`/brew/${id}`);
  }

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!brew) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{isError ? 'Failed to load brew.' : 'Brew not found.'}</Text>
      </View>
    );
  }

  return <BrewForm initial={brew} onSubmit={handleSubmit} submitLabel="Save Changes" />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.textMedium, fontSize: 16 },
});
