import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { Ride } from '../models/ride.model';
import { RideService } from './ride.service';
import { WebSocketService } from './websocket.service';

@Injectable({ providedIn: 'root' })
export class RideStateService implements OnDestroy {

  private readonly ONLINE_KEY = 'pgece_driver_online';

  readonly isOnline$    = new BehaviorSubject<boolean>(
    localStorage.getItem('pgece_driver_online') === 'true'
  );
  readonly pendingRides$ = new BehaviorSubject<Ride[]>([]);

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private subs = new Subscription();

  constructor(
    private rideService: RideService,
    private wsService: WebSocketService,
  ) {
    this.subs.add(
      this.wsService.rideNotification$.subscribe(ride => {
        if (ride.status !== 'PENDING') return;
        const current = this.pendingRides$.value;
        if (!current.some(r => r.id === ride.id)) {
          this.pendingRides$.next([ride, ...current]);
        }
      })
    );


    if (this.isOnline$.value) {
      this.startOnlineMode();
    }
  }

  goOnline(): void {
    if (this.isOnline$.value) return;
    localStorage.setItem(this.ONLINE_KEY, 'true');
    this.isOnline$.next(true);
    this.startOnlineMode();
  }

  goOffline(): void {
    if (!this.isOnline$.value) return;
    localStorage.removeItem(this.ONLINE_KEY);
    this.isOnline$.next(false);
    this.stopOnlineMode();
  }

  refresh(): void {
    if (this.isOnline$.value) this.fetch();
  }

  removeRide(rideId: number): void {
    this.pendingRides$.next(
      this.pendingRides$.value.filter(r => r.id !== rideId)
    );
  }

  private startOnlineMode(): void {
    this.wsService.connect();
    this.fetch();
    if (this.pollingTimer === null) {
      this.pollingTimer = setInterval(() => this.fetch(), 5000);
    }
  }

  private stopOnlineMode(): void {
    this.stopPolling();
    this.wsService.disconnect();
    this.pendingRides$.next([]);
  }

  private fetch(): void {
    this.rideService.listPendingRides().subscribe({
      next: rides => this.pendingRides$.next(rides),
      error: err  => console.error('[RideState] erro ao buscar corridas:', err.message),
    });
  }

  private stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.subs.unsubscribe();
  }
}
