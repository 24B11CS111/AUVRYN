import React from 'react';
import { getTransportVehiclesAction } from '../actions';
import { VehiclesClient } from './VehiclesClient';

export default async function VehiclesPage() {
  const result = await getTransportVehiclesAction();
  const vehicles = result.success ? result.data : [];

  return <VehiclesClient initialVehicles={vehicles} />;
}
