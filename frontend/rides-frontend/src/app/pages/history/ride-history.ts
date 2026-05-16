import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Ride } from '../../models/ride.model';
import { RideService } from '../../services/ride.service';

@Component({
  selector: 'app-ride-history',
  standalone: false,
  templateUrl: './ride-history.html',
  styleUrl: './ride-history.scss',
})
export class RideHistory implements OnInit {

  rides: Ride[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private rideService: RideService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.rideService.listAllRides().subscribe({
      next: (rides) => {
        this.rides = rides.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING:     'Aguardando',
      IN_PROGRESS: 'Em andamento',
      COMPLETED:   'Finalizada',
      CANCELLED:   'Cancelada',
    };
    return map[status] ?? status;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
