import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Driver, Ride } from '../../../models/ride.model';
import { RideService } from '../../../services/ride.service';
import { RideStateService } from '../../../services/ride-state.service';

type ViewState = 'list' | 'active';

@Component({
  selector: 'app-driver-panel',
  standalone: false,
  templateUrl: './driver-panel.html',
  styleUrl: './driver-panel.scss',
})
export class DriverPanel implements OnInit, OnDestroy {

  viewState: ViewState = 'list';
  activeRide: Ride | null = null;

  pendingRides: Ride[] = [];
  drivers: Driver[] = [];
  selectedDriverId = '';
  errorMessage = '';
  isOnline = false;
  completing = false;

  private subs = new Subscription();

  constructor(
    private rideService: RideService,
    public rideState: RideStateService,
    private cdr: ChangeDetectorRef,
  ) {}

  private static readonly STORAGE_KEY = 'pgece_driver_active_ride';

  ngOnInit(): void {
    this.loadDrivers();

    this.subs.add(
      this.rideState.pendingRides$.subscribe(rides => {
        this.pendingRides = rides;
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.rideState.isOnline$.subscribe(online => {
        this.isOnline = online;
        this.cdr.detectChanges();
      })
    );
  }

  private restoreActiveRide(): void {
    const stored = localStorage.getItem(DriverPanel.STORAGE_KEY);
    if (!stored) return;

    const ride: Ride = JSON.parse(stored);
    this.rideService.getRide(ride.id).subscribe({
      next: (current) => {
        if (current.status === 'IN_PROGRESS') {
          this.activeRide = current;
          this.viewState = 'active';
        } else {
          localStorage.removeItem(DriverPanel.STORAGE_KEY);
        }
        this.cdr.detectChanges();
      },
      error: () => localStorage.removeItem(DriverPanel.STORAGE_KEY),
    });
  }

  get activeDriver(): Driver | null {
    if (!this.activeRide?.driverId) return null;
    return this.drivers.find(d => d.id === this.activeRide!.driverId) ?? null;
  }

  private loadDrivers(): void {
    this.rideService.listDrivers().subscribe({
      next: (drivers) => {
        this.drivers = drivers;
        if (drivers.length) this.selectedDriverId = drivers[0].id;
        this.cdr.detectChanges();
        this.restoreActiveRide();
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.cdr.detectChanges();
      },
    });
  }

  toggleOnline(): void {
    if (this.isOnline) {
      this.rideState.goOffline();
    } else {
      this.errorMessage = '';
      this.rideState.goOnline();
    }
  }

  acceptRide(ride: Ride): void {
    if (!this.selectedDriverId) {
      this.errorMessage = 'Selecione um motorista antes de aceitar.';
      return;
    }

    this.errorMessage = '';
    this.rideState.removeRide(ride.id);
    this.cdr.detectChanges();

    this.rideService.acceptRide(ride.id, { driverId: this.selectedDriverId }).subscribe({
      next: (acceptedRide) => {
        this.activeRide = acceptedRide;
        this.viewState = 'active';
        localStorage.setItem(DriverPanel.STORAGE_KEY, JSON.stringify(acceptedRide));
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.rideState.refresh();
        this.cdr.detectChanges();
      },
    });
  }

  rejectRide(ride: Ride): void {
    if (!this.selectedDriverId) {
      this.errorMessage = 'Selecione um motorista antes de rejeitar.';
      return;
    }

    this.errorMessage = '';
    this.rideState.removeRide(ride.id);
    this.cdr.detectChanges();

    this.rideService.rejectRide(ride.id, this.selectedDriverId).subscribe({
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.rideState.refresh();
        this.cdr.detectChanges();
      },
    });
  }

  completeRide(): void {
    if (!this.activeRide) return;
    this.completing = true;
    this.errorMessage = '';

    this.rideService.completeRide(this.activeRide.id).subscribe({
      next: () => {
        this.activeRide = null;
        this.viewState = 'list';
        this.completing = false;
        localStorage.removeItem(DriverPanel.STORAGE_KEY);
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.completing = false;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
