import { notFound } from 'next/navigation';
import Journal from '@/components/Journal';
import PasswordGate from '@/components/PasswordGate';
import { USERS, getCurrentUser, isUserName } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { name: string };

export default async function UserJournalPage({ params }: { params: Promise<Params> }) {
  const { name } = await params;
  if (!isUserName(name)) notFound();

  const meta = USERS.find(u => u.name === name)!;
  const current = await getCurrentUser();

  if (current === name) {
    return <Journal userLabel={meta.label} />;
  }

  return <PasswordGate name={name} label={meta.label} />;
}
