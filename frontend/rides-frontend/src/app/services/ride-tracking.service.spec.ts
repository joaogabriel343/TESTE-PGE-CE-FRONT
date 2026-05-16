import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RideTrackingService } from './ride-tracking.service';
import { RideService } from './ride.service';
import { Ride } from '../models/ride.model';

describe('RideTrackingService', () => {
  let service: RideTrackingService;
  let rideServiceSpy: jasmine.SpyObj<RideService>;

  const pendingRide: Ride = {
    id: 1, userId: 'user-1',
    pickupAddress: 'Av. Beira Mar, 100',
    destinationAddress: 'Av. Washington Soares, 200',
    status: 'PENDING', createdAt: new Date().toISOString(),
  };

  const inProgressRide: Ride = { ...pendingRide, status: 'IN_PROGRESS', driverId: 'driver-1' };
  const completedRide:  Ride = { ...pendingRide, status: 'COMPLETED',   driverId: 'driver-1' };

  beforeEach(() => {
    rideServiceSpy = jasmine.createSpyObj('RideService', ['getRide']);
    rideServiceSpy.getRide.and.returnValue(of(pendingRide));

    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        RideTrackingService,
        { provide: RideService, useValue: rideServiceSpy },
      ],
    });
    service = TestBed.inject(RideTrackingService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    localStorage.clear();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('deve iniciar com activeRide$ null quando localStorage está vazio', () => {
    expect(service.activeRide$.value).toBeNull();
  });

  describe('startTracking', () => {
    it('deve emitir corrida PENDING e salvar no localStorage', () => {
      service.startTracking(pendingRide);

      expect(service.activeRide$.value).toEqual(pendingRide);
      const stored = JSON.parse(localStorage.getItem('pgece_active_ride')!);
      expect(stored.id).toBe(1);
    });
  });

  describe('stopTracking', () => {
    it('deve limpar activeRide$ e remover do localStorage', () => {
      service.startTracking(pendingRide);
      service.stopTracking();

      expect(service.activeRide$.value).toBeNull();
      expect(localStorage.getItem('pgece_active_ride')).toBeNull();
    });
  });

  describe('polling', () => {
    it('deve parar o polling ao detectar corrida COMPLETED', fakeAsync(() => {
      service.startTracking(pendingRide);

      rideServiceSpy.getRide.and.returnValue(of(completedRide));
      tick(2000);

      expect(service.activeRide$.value?.status).toBe('COMPLETED');

      const callsBefore = rideServiceSpy.getRide.calls.count();
      tick(4000);
      expect(rideServiceSpy.getRide.calls.count()).toBe(callsBefore);
    }));

    it('deve continuar polling para corrida IN_PROGRESS (esperando COMPLETED)', fakeAsync(() => {
      service.startTracking(pendingRide);

      rideServiceSpy.getRide.and.returnValue(of(inProgressRide));
      tick(2000);
      expect(service.activeRide$.value?.status).toBe('IN_PROGRESS');

      const callsAfterFirstPoll = rideServiceSpy.getRide.calls.count();
      tick(2000);
      expect(rideServiceSpy.getRide.calls.count()).toBeGreaterThan(callsAfterFirstPoll);
    }));

    it('deve manter cache em caso de erro de rede no polling', fakeAsync(() => {
      service.startTracking(pendingRide);

      rideServiceSpy.getRide.and.returnValue(throwError(() => new Error('Network error')));
      tick(2000);

      expect(service.activeRide$.value).not.toBeNull();
    }));
  });
});
