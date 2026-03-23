import { useRouter } from 'expo-router';
import BrewForm from '../../components/BrewForm';
import { createBrew } from '../../lib/brews';
import { BrewInsert } from '../../types';

export default function NewBrewScreen() {
  const router = useRouter();

  async function handleSubmit(brew: BrewInsert) {
    const created = await createBrew(brew);
    router.replace(`/brew/${created.id}`);
  }

  return <BrewForm onSubmit={handleSubmit} submitLabel="Log Brew" />;
}
