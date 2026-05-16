import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { RideService } from '../../../services/ride.service';
import { RideTrackingService } from '../../../services/ride-tracking.service';
import { Driver, Ride } from '../../../models/ride.model';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

type ViewState = 'form' | 'waiting' | 'accepted' | 'completed';

@Component({
  selector: 'app-create-ride',
  standalone: false,
  templateUrl: './create-ride.html',
  styleUrl: './create-ride.scss',
})
export class CreateRide implements OnInit, OnDestroy {

  form!: FormGroup;
  loading = false;
  errorMessage = '';

  loadingPickupCep = false;
  loadingDestinationCep = false;
  pickupCepError = '';
  destinationCepError = '';

  viewState: ViewState = 'form';
  activeRide: Ride | null = null;
  activeDriver: Driver | null = null;
  countdownSeconds = 120;

  private subs = new Subscription();
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private allDrivers: Driver[] = [];

  readonly mockedUsers = [
    { id: 'user-1',  name: 'Ana Beatriz Fontenele' },
    { id: 'user-2',  name: 'Carlos Eduardo Lima' },
    { id: 'user-3',  name: 'Fernanda Cavalcante' },
    { id: 'user-4',  name: 'José Augusto Nogueira' },
    { id: 'user-5',  name: 'Larissa Meireles Costa' },
    { id: 'user-6',  name: 'Marcos Vinícius Alves' },
    { id: 'user-7',  name: 'Natália Barroso Neto' },
    { id: 'user-8',  name: 'Pedro Henrique Sabóia' },
    { id: 'user-9',  name: 'Renata Diógenes Silva' },
    { id: 'user-10', name: 'Thiago Rodrigues Pinto' },
    { id: 'user-11', name: 'Camila Vasconcelos' },
    { id: 'user-12', name: 'Diego Furtado Araújo' },
  ];

  constructor(
    private fb: FormBuilder,
    private rideService: RideService,
    private http: HttpClient,
    private trackingService: RideTrackingService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      userId: ['', Validators.required],
      pickupLogradouro:  ['', [Validators.required, Validators.minLength(3)]],
      pickupNumero:      ['', Validators.required],
      pickupComplemento: [''],
      pickupBairro:      ['', Validators.required],
      pickupCidadeUf:    ['', Validators.required],
      destinationLogradouro:  ['', [Validators.required, Validators.minLength(3)]],
      destinationNumero:      ['', Validators.required],
      destinationComplemento: [''],
      destinationBairro:      ['', Validators.required],
      destinationCidadeUf:    ['', Validators.required],
    });

    this.rideService.listDrivers().subscribe({
      next: d => (this.allDrivers = d),
      error: () => {},
    });

    this.subs.add(
      this.trackingService.activeRide$.subscribe(ride => {
        this.activeRide = ride;

        if (ride === null) {
          this.viewState = 'form';
          this.stopCountdown();
        } else if (ride.status === 'PENDING') {
          if (this.viewState !== 'waiting') {
            this.viewState = 'waiting';
            this.startCountdown(ride.createdAt);
          }
        } else if (ride.status === 'IN_PROGRESS') {
          this.viewState = 'accepted';
          this.stopCountdown();
          this.resolveDriver(ride.driverId);
        } else if (ride.status === 'COMPLETED') {
          this.viewState = 'completed';
          this.stopCountdown();
          setTimeout(() => this.trackingService.stopTracking(), 4000);
        }

        this.cdr.detectChanges();
      })
    );
  }

  get f() { return this.form.controls; }

  get countdownDisplay(): string {
    const m = Math.floor(this.countdownSeconds / 60);
    const s = this.countdownSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  onPickupCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    input.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    this.pickupCepError = '';
    if (digits.length === 8) this.fetchCep(digits, 'pickup');
  }

  onDestinationCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    input.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    this.destinationCepError = '';
    if (digits.length === 8) this.fetchCep(digits, 'destination');
  }

  private fetchCep(cep: string, type: 'pickup' | 'destination'): void {
    if (type === 'pickup') this.loadingPickupCep = true;
    else this.loadingDestinationCep = true;

    this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
      next: (data) => {
        if (type === 'pickup') this.loadingPickupCep = false;
        else this.loadingDestinationCep = false;

        if (data.erro) {
          if (type === 'pickup') this.pickupCepError = 'CEP não encontrado.';
          else this.destinationCepError = 'CEP não encontrado.';
          return;
        }

        const patch = type === 'pickup'
          ? {
              pickupLogradouro: data.logradouro,
              pickupBairro:     data.bairro,
              pickupCidadeUf:   `${data.localidade}/${data.uf}`,
            }
          : {
              destinationLogradouro: data.logradouro,
              destinationBairro:     data.bairro,
              destinationCidadeUf:   `${data.localidade}/${data.uf}`,
            };

        this.form.patchValue(patch);
      },
      error: () => {
        if (type === 'pickup') { this.loadingPickupCep = false; this.pickupCepError = 'Erro ao buscar CEP.'; }
        else { this.loadingDestinationCep = false; this.destinationCepError = 'Erro ao buscar CEP.'; }
      },
    });
  }

  private buildAddress(type: 'pickup' | 'destination'): string {
    const v = this.form.value;
    const logradouro  = type === 'pickup' ? v.pickupLogradouro  : v.destinationLogradouro;
    const numero      = type === 'pickup' ? v.pickupNumero       : v.destinationNumero;
    const complemento = type === 'pickup' ? v.pickupComplemento  : v.destinationComplemento;
    const bairro      = type === 'pickup' ? v.pickupBairro       : v.destinationBairro;
    const cidadeUf    = type === 'pickup' ? v.pickupCidadeUf     : v.destinationCidadeUf;

    return [logradouro, numero, complemento, bairro, cidadeUf]
      .map(s => (s ?? '').trim())
      .filter(Boolean)
      .join(', ');
  }

  private resolveDriver(driverId?: string): void {
    if (!driverId) return;
    this.activeDriver = this.allDrivers.find(d => d.id === driverId) ?? null;
    if (!this.activeDriver) {
      this.rideService.listDrivers().subscribe({
        next: drivers => {
          this.allDrivers = drivers;
          this.activeDriver = drivers.find(d => d.id === driverId) ?? null;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }
  }

  private startCountdown(createdAt: string): void {
    this.stopCountdown();
    const deadline = new Date(createdAt + 'Z').getTime() + 2 * 60 * 1000;

    const tick = () => {
      this.countdownSeconds = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      this.cdr.detectChanges();
      if (this.countdownSeconds === 0) this.stopCountdown();
    };

    tick();
    this.countdownTimer = setInterval(tick, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  cancelTracking(): void {
    this.trackingService.stopTracking();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const payload = {
      userId:             this.form.value.userId,
      pickupAddress:      this.buildAddress('pickup'),
      destinationAddress: this.buildAddress('destination'),
    };

    this.rideService.createRide(payload).subscribe({
      next: (ride) => {
        this.loading = false;
        this.form.reset();
        this.trackingService.startTracking(ride);
      },
      error: (err: Error) => {
        this.loading = false;
        this.errorMessage = err.message;
      },
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.stopCountdown();
  }
}
