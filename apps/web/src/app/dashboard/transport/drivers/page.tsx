import React from 'react';
import { getTransportStaffAction } from '../actions';
import { DriversClient } from './DriversClient';

export default async function DriversPage() {
  const result = await getTransportStaffAction();
  const staff = result.success ? result.data : [];

  return <DriversClient initialStaff={staff} />;
}
