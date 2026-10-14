import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CoffeeForm from '../../../../../components/CoffeeForm';
import { useCoffees, useUpdateCoffee } from '../../../../../lib/brewQueries';
import { colors } from '../../../../../lib/theme';
import { CoffeeInsert } from '../../../../../types';

export default function EditCoffeeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: coffees, isPending, isError } = useCoffees();
  const coffee = coffees?.find((c) => c.id === id);
  const updateMutation = useUpdateCoffee();

  async function handleSubmit(updated: CoffeeInsert) {
    await updateMutation.mutateAsync({ id, coffee: updated });
    // Back to the coffee, which shows the changes (replacing the form would list it twice)
    if (router.canGoBack()) router.back();
    else router.replace(`/coffee/${id}`);
  }

  if (isPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!coffee) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{isError ? 'Failed to load coffee.' : 'Coffee not found.'}</Text>
      </View>
    );
  }

  return <CoffeeForm initial={coffee} onSubmit={handleSubmit} submitLabel="Save Changes" />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorText: { color: colors.textMedium, fontSize: 16 },
});
