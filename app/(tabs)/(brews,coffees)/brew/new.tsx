import { useLocalSearchParams, useRouter } from 'expo-router';
import BrewForm from '../../../../components/BrewForm';
import { useCreateBrew } from '../../../../lib/brewQueries';
import { BrewInsert } from '../../../../types';

export default function NewBrewScreen() {
  const router = useRouter();
  // From a coffee's screen ("Log a Brew"), the brew starts with that coffee
  const { coffee } = useLocalSearchParams<{ coffee?: string }>();
  const createMutation = useCreateBrew();

  async function handleSubmit(brew: BrewInsert) {
    const created = await createMutation.mutateAsync(brew);
    router.replace(`/brew/${created.id}`);
  }

  return <BrewForm initial={coffee ? { coffee_id: coffee } : undefined} onSubmit={handleSubmit} submitLabel="Log Brew" />;
}
