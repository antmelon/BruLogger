import { useRouter } from 'expo-router';
import BrewForm from '../../components/BrewForm';
import { useCreateBrew } from '../../lib/brewQueries';
import { BrewInsert } from '../../types';

export default function NewBrewScreen() {
  const router = useRouter();
  const createMutation = useCreateBrew();

  async function handleSubmit(brew: BrewInsert) {
    const created = await createMutation.mutateAsync(brew);
    router.replace(`/brew/${created.id}`);
  }

  return <BrewForm onSubmit={handleSubmit} submitLabel="Log Brew" />;
}
