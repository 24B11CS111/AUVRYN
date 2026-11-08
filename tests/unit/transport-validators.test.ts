import { describe, it, expect } from 'vitest';
import {
  createVehicleSchema,
  createVehicleDocumentSchema,
  createTransportStopSchema,
  createTransportRouteSchema,
  assignRouteStopsSchema,
  assignStudentTransportSchema,
  recordGpsLocationSchema,
  studentBoardingEventSchema,
  transportChangeRequestSchema,
  transportSettingsUpdateSchema,
} from '@edu-platform/validators';

describe('Milestone 10: Transport & Tracking Validators', () => {
  describe('createVehicleSchema', () => {
    it('accepts valid vehicle details with positive capacity', () => {
      const valid = {
        registrationNumber: 'DL-01-AB-1234',
        vehicleModel: 'Tata Starbus 40',
        vehicleType: 'school_bus',
        seatingCapacity: 40,
        standingCapacity: 10,
        fuelType: 'diesel',
        ownershipType: 'institution_owned',
        status: 'active',
        makeYear: 2023,
      };
      const res = createVehicleSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects zero or negative seating capacity', () => {
      const invalid = {
        registrationNumber: 'DL-01-AB-1234',
        vehicleModel: 'Tata Starbus 40',
        seatingCapacity: 0,
      };
      const res = createVehicleSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it('rejects invalid vehicle status', () => {
      const invalid = {
        registrationNumber: 'DL-01-AB-1234',
        vehicleModel: 'Tata Starbus 40',
        seatingCapacity: 30,
        status: 'unknown_status',
      };
      const res = createVehicleSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('createVehicleDocumentSchema', () => {
    it('accepts valid document with expiry on or after issued date', () => {
      const valid = {
        vehicleId: '123e4567-e89b-12d3-a456-426614174000',
        documentType: 'insurance',
        documentNumber: 'POL-998822',
        issuedDate: '2026-01-01',
        expiryDate: '2027-01-01',
      };
      const res = createVehicleDocumentSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects document where expiryDate precedes issuedDate', () => {
      const invalid = {
        vehicleId: '123e4567-e89b-12d3-a456-426614174000',
        documentType: 'insurance',
        documentNumber: 'POL-998822',
        issuedDate: '2026-06-01',
        expiryDate: '2026-01-01',
      };
      const res = createVehicleDocumentSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Expiry date must be on or after issued date');
      }
    });
  });

  describe('createTransportStopSchema', () => {
    it('accepts valid stop coordinates within geo bounds', () => {
      const valid = {
        name: 'Greenwood Heights Gate 1',
        latitude: 28.6139,
        longitude: 77.209,
        geofenceRadiusMeters: 60,
      };
      const res = createTransportStopSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects out-of-bounds latitude (< -90 or > 90)', () => {
      const invalid = {
        name: 'Invalid Lat Stop',
        latitude: 95.5,
        longitude: 77.209,
      };
      const res = createTransportStopSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it('rejects out-of-bounds longitude (< -180 or > 180)', () => {
      const invalid = {
        name: 'Invalid Lng Stop',
        latitude: 28.6139,
        longitude: 195.0,
      };
      const res = createTransportStopSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it('rejects geofence radius below 10m', () => {
      const invalid = {
        name: 'Tiny Geofence Stop',
        latitude: 28.6139,
        longitude: 77.209,
        geofenceRadiusMeters: 5,
      };
      const res = createTransportStopSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('createTransportRouteSchema', () => {
    it('accepts valid route with code and endpoints', () => {
      const valid = {
        routeName: 'Route 4A - North Metro Connector',
        routeCode: 'RT-04A',
        startLocation: 'Sector 14 Metro',
        destination: 'North Campus Gate',
        academicYearId: '123e4567-e89b-12d3-a456-426614174000',
        routeType: 'both',
        shift: 'morning',
        totalDistanceKm: 18.5,
      };
      const res = createTransportRouteSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects missing academicYearId or startLocation', () => {
      const invalid = {
        routeName: 'Incomplete Route',
        routeCode: 'RT-01',
      };
      const res = createTransportRouteSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('assignRouteStopsSchema', () => {
    it('accepts sequential stops with valid arrival and departure times', () => {
      const valid = {
        routeId: '123e4567-e89b-12d3-a456-426614174000',
        stops: [
          {
            stopId: '223e4567-e89b-12d3-a456-426614174001',
            stopOrder: 1,
            scheduledArrivalTime: '07:15',
            scheduledDepartureTime: '07:18',
            pickupAllowed: true,
            dropoffAllowed: false,
          },
          {
            stopId: '223e4567-e89b-12d3-a456-426614174002',
            stopOrder: 2,
            scheduledArrivalTime: '07:30',
            scheduledDepartureTime: '07:33',
            pickupAllowed: true,
            dropoffAllowed: true,
          },
        ],
      };
      const res = assignRouteStopsSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects empty stops list', () => {
      const invalid = {
        routeId: '123e4567-e89b-12d3-a456-426614174000',
        stops: [],
      };
      const res = assignRouteStopsSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('recordGpsLocationSchema', () => {
    it('accepts valid telemetry payload', () => {
      const valid = {
        vehicleId: '123e4567-e89b-12d3-a456-426614174000',
        journeyId: '223e4567-e89b-12d3-a456-426614174001',
        latitude: 28.5355,
        longitude: 77.391,
        speedKmh: 42.5,
        heading: 180,
        accuracyMeters: 4.2,
      };
      const res = recordGpsLocationSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects negative speed', () => {
      const invalid = {
        vehicleId: '123e4567-e89b-12d3-a456-426614174000',
        latitude: 28.5355,
        longitude: 77.391,
        speedKmh: -10,
      };
      const res = recordGpsLocationSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('studentBoardingEventSchema', () => {
    it('accepts valid pickup event verification', () => {
      const valid = {
        journeyId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '223e4567-e89b-12d3-a456-426614174001',
        stopId: '323e4567-e89b-12d3-a456-426614174002',
        eventType: 'pickup',
        verificationMethod: 'qr_scan',
      };
      const res = studentBoardingEventSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects invalid event type', () => {
      const invalid = {
        journeyId: '123e4567-e89b-12d3-a456-426614174000',
        studentId: '223e4567-e89b-12d3-a456-426614174001',
        stopId: '323e4567-e89b-12d3-a456-426614174002',
        eventType: 'transferred',
      };
      const res = studentBoardingEventSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('transportSettingsUpdateSchema', () => {
    it('accepts valid retention and distance bounds', () => {
      const valid = {
        gpsProvider: 'driver_mobile_app',
        gpsUpdateIntervalSeconds: 15,
        locationRetentionDays: 30,
        approachingStopDistanceMeters: 500,
        allowParentTracking: true,
        requireParentChangeApproval: true,
        preventOvercapacityAssignment: true,
      };
      const res = transportSettingsUpdateSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects update interval below 5 seconds', () => {
      const invalid = {
        gpsProvider: 'driver_mobile_app',
        gpsUpdateIntervalSeconds: 2,
        locationRetentionDays: 30,
        approachingStopDistanceMeters: 500,
      };
      const res = transportSettingsUpdateSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });
});
