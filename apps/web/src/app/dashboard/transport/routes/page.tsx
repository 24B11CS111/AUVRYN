import React from 'react';
import { getTransportRoutesAction } from '../actions';
import { RoutesClient } from './RoutesClient';

export default async function RoutesPage() {
  const result = await getTransportRoutesAction();
  const routes = result.success ? result.data : [];

  return <RoutesClient initialRoutes={routes} />;
}
