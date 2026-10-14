import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BrewForm from '../../../components/BrewForm';
import { useBrew, useCreateBrew } from '../../../lib/brewQueries';
import { brewAgainFrom } from '../../../lib/form';
import { colors } from '../../../lib/theme';
import { BrewInsert } from '../../../types';

/** Brew Again: a new brew that starts from a past one's coffee and recipe. */
export default function BrewAgainScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: brew, isPending, isError } = useBrew(id);
  const createMutation = useCreateBrew();

  async function handleSubmit(created: BrewInsert) {
    const saved = await createMutation.mutateAsync(created);
    router.replace(`/brew/${saved.id}`);
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

  return (
    <BrewForm
      initial={brewAgainFrom(brew)}
      lastNotes={brew.general_notes}
      onSubmit={handleSubmit}
      submitLabel="Log Brew"
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.textMedium, fontSize: 16 },
});
