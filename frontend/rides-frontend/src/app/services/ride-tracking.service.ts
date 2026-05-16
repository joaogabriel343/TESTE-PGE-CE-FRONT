import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Ride } from '../models/ride.model';
import { RideService } from './ride.service';

@Injectable({ providedIn: 'root' })
export class RideTrackingService implements OnDestroy {

  private readonly RIDE_KEY = 'pgece_active_ride';

  readonly activeRide$ = new BehaviorSubject<Ride | null>(
    RideTrackingService.loadFromStorage()
  );

  private pollingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private rideService: RideService) {
    const cached = this.activeRide$.value;
    if (cached) {
      this.validateFromServer(cached.id);
    }
  }

  private static loadFromStorage(): Ride | null {
    try {
      const raw = localStorage.getItem('pgece_active_ride');
      return raw ? (JSON.parse(raw) as Ride) : null;
    } catch {
      return null;
    }
  }

  startTracking(ride: Ride): void {
    localStorage.setItem(this.RIDE_KEY, JSON.stringify(ride));
    this.activeRide$.next(ride);
    if (ride.status === 'PENDING') this.startPolling(ride.id);
  }

  stopTracking(): void {
    localStorage.removeItem(this.RIDE_KEY);
    this.stopPolling();
    this.activeRide$.next(null);
  }

  private validateFromServer(rideId: number): void {
    this.rideService.getRide(rideId).subscribe({
      next: ride => {
        localStorage.setItem(this.RIDE_KEY, JSON.stringify(ride));
        this.activeRide$.next(ride);
        if (ride.status === 'PENDING' || ride.status === 'IN_PROGRESS') {
          this.startPolling(rideId);
        } else {
          localStorage.removeItem(this.RIDE_KEY);
          this.activeRide$.next(null);
        }
      },
      error: err => {
        console.warn('[RideTracking] validação falhou, mantendo cache:', err.message);
        const cached = this.activeRide$.value;
        if (cached?.status === 'PENDING' || cached?.status === 'IN_PROGRESS') {
          this.startPolling(rideId);
        }
      },
    });
  }

  private startPolling(rideId: number): void {
    this.stopPolling();
    this.pollingTimer = setInterval(() => {
      this.rideService.getRide(rideId).subscribe({
        next: ride => {
          localStorage.setItem(this.RIDE_KEY, JSON.stringify(ride));
          this.activeRide$.next(ride);
          if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
            this.stopPolling();
          }
        },
        error: err => console.error('[RideTracking] polling error:', err.message),
      });
    }, 2000);
  }

  private stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
