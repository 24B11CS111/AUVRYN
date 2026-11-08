import React from 'react';
import { getTransportRoutesAction, getTransportVehiclesAction } from '../actions';
import { ReportsClient } from './ReportsClient';

export default async function TransportReportsPage() {
  const [routesRes, vehiclesRes] = await Promise.all([
    getTransportRoutesAction(),
    getTransportVehiclesAction(),
  ]);

  return (
    <ReportsClient
      routes={routesRes.success ? routesRes.data : []}
      vehicles={vehiclesRes.success ? vehiclesRes.data : []}
    />
  );
}
