import { useRouter } from 'expo-router';
import CoffeeForm from '../../components/CoffeeForm';
import { useCreateCoffee } from '../../lib/brewQueries';
import { CoffeeInsert } from '../../types';

export default function NewCoffeeScreen() {
  const router = useRouter();
  const createMutation = useCreateCoffee();

  async function handleSubmit(coffee: CoffeeInsert) {
    const created = await createMutation.mutateAsync(coffee);
    router.replace(`/coffee/${created.id}`);
  }

  return <CoffeeForm onSubmit={handleSubmit} submitLabel="Add Coffee" />;
}
