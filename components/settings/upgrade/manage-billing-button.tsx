'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Loader2 } from 'lucide-react';
import { createPortalSession } from '@/lib/actions/stripe';

export function ManageBillingButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleManage = async () => {
    setIsLoading(true);
    try {
      const result = await createPortalSession();
      if (result.success && result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to open portal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleManage}
      disabled={isLoading}
      variant="ghost"
      className="text-muted-foreground hover:text-foreground"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Settings className="w-4 h-4 mr-2" />
      )}
      Manage Billing & Subscription
    </Button>
  );
}
