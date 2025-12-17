import { checkAndSeedJourneys } from '@/lib/actions/seed-journeys';
import { JourneysPageClient } from '@/components/journey/journeys-page-client';
import { JourneysContent } from '@/components/journey/journeys-content';

export default async function JourneysPage() {
  // Auto-seed journeys if none exist (fire and forget for faster initial render)
  checkAndSeedJourneys();

  return (
    <JourneysPageClient>
      <JourneysContent />
    </JourneysPageClient>
  );
}
