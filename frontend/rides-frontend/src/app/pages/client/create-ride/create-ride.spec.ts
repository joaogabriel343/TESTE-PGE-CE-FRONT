import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ChangeDetectorRef } from '@angular/core';
import { CreateRide } from './create-ride';
import { RideService } from '../../../services/ride.service';
import { RideTrackingService } from '../../../services/ride-tracking.service';
import { Ride } from '../../../models/ride.model';

describe('CreateRide', () => {
  let component: CreateRide;
  let fixture: ComponentFixture<CreateRide>;
  let rideServiceSpy: jasmine.SpyObj<RideService>;
  let trackingStub: Partial<RideTrackingService>;
  let activeRide$: BehaviorSubject<Ride | null>;

  const mockRide: Ride = {
    id: 1, userId: 'user-1',
    pickupAddress: 'Av. Beira Mar, 100, Meireles, Fortaleza/CE',
    destinationAddress: 'Av. Washington Soares, 200, Edson Queiroz, Fortaleza/CE',
    status: 'PENDING', createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    activeRide$ = new BehaviorSubject<Ride | null>(null);

    rideServiceSpy = jasmine.createSpyObj('RideService', ['createRide', 'listDrivers']);
    rideServiceSpy.listDrivers.and.returnValue(of([]));

    trackingStub = {
      activeRide$,
      startTracking: jasmine.createSpy('startTracking'),
      stopTracking:  jasmine.createSpy('stopTracking'),
    };

    await TestBed.configureTestingModule({
      declarations: [CreateRide],
      imports: [ReactiveFormsModule, FormsModule, HttpClientTestingModule],
      providers: [
        { provide: RideService,         useValue: rideServiceSpy },
        { provide: RideTrackingService,  useValue: trackingStub },
        ChangeDetectorRef,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateRide);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  it('deve inicializar na viewState "form"', () => {
    expect(component.viewState).toBe('form');
  });


  describe('formulário', () => {
    it('deve ser inválido quando vazio', () => {
      expect(component.form.invalid).toBeTrue();
    });

    it('deve ser válido quando todos os campos obrigatórios estão preenchidos', () => {
      preencherFormulario();
      expect(component.form.valid).toBeTrue();
    });

    it('deve ser inválido quando apenas userId está preenchido', () => {
      component.form.patchValue({ userId: 'user-1' });
      expect(component.form.invalid).toBeTrue();
    });

    it('deve ser inválido quando logradouro tem menos de 3 caracteres', () => {
      preencherFormulario();
      component.form.patchValue({ pickupLogradouro: 'Av' });
      expect(component.form.get('pickupLogradouro')?.invalid).toBeTrue();
    });
  });


  describe('onSubmit', () => {
    it('não deve chamar o serviço quando formulário é inválido', () => {
      component.onSubmit();
      expect(rideServiceSpy.createRide).not.toHaveBeenCalled();
    });

    it('deve marcar todos os campos como touched quando formulário inválido', () => {
      component.onSubmit();
      Object.values(component.form.controls).forEach(ctrl => {
        expect(ctrl.touched).toBeTrue();
      });
    });

    it('deve chamar startTracking após criação bem-sucedida', () => {
      rideServiceSpy.createRide.and.returnValue(of(mockRide));
      preencherFormulario();

      component.onSubmit();

      expect(trackingStub.startTracking).toHaveBeenCalledWith(mockRide);
    });

    it('deve exibir errorMessage quando serviço retorna erro', () => {
      rideServiceSpy.createRide.and.returnValue(throwError(() => new Error('Backend indisponível')));
      preencherFormulario();

      component.onSubmit();

      expect(component.errorMessage).toBe('Backend indisponível');
      expect(component.loading).toBeFalse();
    });

    it('deve resetar o formulário após envio bem-sucedido', () => {
      rideServiceSpy.createRide.and.returnValue(of(mockRide));
      preencherFormulario();

      component.onSubmit();

      expect(component.form.get('userId')?.value).toBeFalsy();
    });
  });


  describe('transições de viewState', () => {
    it('deve ir para "waiting" quando activeRide$ emite corrida PENDING', () => {
      activeRide$.next(mockRide);
      fixture.detectChanges();

      expect(component.viewState).toBe('waiting');
    });

    it('deve ir para "accepted" quando activeRide$ emite corrida IN_PROGRESS', () => {
      activeRide$.next({ ...mockRide, status: 'IN_PROGRESS', driverId: 'driver-1' });
      fixture.detectChanges();

      expect(component.viewState).toBe('accepted');
    });

    it('deve ir para "completed" quando activeRide$ emite corrida COMPLETED', fakeAsync(() => {
      activeRide$.next({ ...mockRide, status: 'COMPLETED', driverId: 'driver-1' });
      fixture.detectChanges();

      expect(component.viewState).toBe('completed');

      tick(4000);
      expect(trackingStub.stopTracking).toHaveBeenCalled();
    }));

    it('deve voltar para "form" quando activeRide$ emite null', () => {
      activeRide$.next(mockRide);
      activeRide$.next(null);
      fixture.detectChanges();

      expect(component.viewState).toBe('form');
    });
  });


  describe('cancelTracking', () => {
    it('deve chamar stopTracking do service', () => {
      component.cancelTracking();
      expect(trackingStub.stopTracking).toHaveBeenCalled();
    });
  });

  describe('countdown display', () => {
    it('deve formatar segundos como mm:ss', () => {
      component['countdownSeconds'] = 125;
      expect(component.countdownDisplay).toBe('2:05');
    });

    it('deve mostrar 0:00 quando expirado', () => {
      component['countdownSeconds'] = 0;
      expect(component.countdownDisplay).toBe('0:00');
    });
  });


  function preencherFormulario(): void {
    component.form.patchValue({
      userId: 'user-1',
      pickupLogradouro:       'Av. Beira Mar',
      pickupNumero:           '100',
      pickupComplemento:      '',
      pickupBairro:           'Meireles',
      pickupCidadeUf:         'Fortaleza/CE',
      destinationLogradouro:  'Av. Washington Soares',
      destinationNumero:      '200',
      destinationComplemento: '',
      destinationBairro:      'Edson Queiroz',
      destinationCidadeUf:    'Fortaleza/CE',
    });
  }
});
