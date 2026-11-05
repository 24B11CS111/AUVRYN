import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getOutboxDeliveriesAction } from '../actions';
import { DeliveryQueueClient } from './DeliveryQueueClient';

export default async function DeliveryQueuePage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const res = await getOutboxDeliveriesAction();
  const deliveries = res.success && res.data ? res.data : [];

  return (
    <div className="container mx-auto py-6">
      <DeliveryQueueClient
        initialDeliveries={deliveries}
        userRole={userRole}
      />
    </div>
  );
}
