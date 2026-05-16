import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { DriverPanel } from './driver-panel';
import { RideService } from '../../../services/ride.service';
import { RideStateService } from '../../../services/ride-state.service';
import { Ride, Driver } from '../../../models/ride.model';

describe('DriverPanel', () => {
  let component: DriverPanel;
  let fixture: ComponentFixture<DriverPanel>;
  let rideServiceSpy: jasmine.SpyObj<RideService>;
  let rideStateStub: Partial<RideStateService>;

  const mockDrivers: Driver[] = [
    { id: 'driver-1', name: 'Carlos Silva', license: 'ABC-1234' },
    { id: 'driver-2', name: 'Ana Souza',   license: 'DEF-5678' },
  ];

  const mockRide: Ride = {
    id: 1, userId: 'user-1',
    pickupAddress: 'Av. Beira Mar, 100',
    destinationAddress: 'Av. Washington Soares, 200',
    status: 'PENDING', createdAt: new Date().toISOString(),
  };

  const acceptedRide: Ride = { ...mockRide, status: 'IN_PROGRESS', driverId: 'driver-1' };

  beforeEach(async () => {
    rideServiceSpy = jasmine.createSpyObj('RideService', [
      'listDrivers', 'acceptRide', 'rejectRide', 'completeRide',
    ]);
    rideServiceSpy.listDrivers.and.returnValue(of(mockDrivers));

    rideStateStub = {
      pendingRides$: new BehaviorSubject<Ride[]>([mockRide]),
      isOnline$:     new BehaviorSubject<boolean>(true),
      removeRide:    jasmine.createSpy('removeRide'),
      refresh:       jasmine.createSpy('refresh'),
      goOnline:      jasmine.createSpy('goOnline'),
      goOffline:     jasmine.createSpy('goOffline'),
    };

    await TestBed.configureTestingModule({
      declarations: [DriverPanel],
      imports: [FormsModule],
      providers: [
        { provide: RideService,     useValue: rideServiceSpy },
        { provide: RideStateService, useValue: rideStateStub },
        ChangeDetectorRef,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DriverPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve ser criado', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar lista de motoristas ao inicializar', () => {
    expect(component.drivers.length).toBe(2);
    expect(component.selectedDriverId).toBe('driver-1');
  });

  it('deve exibir corridas pendentes do RideStateService', () => {
    expect(component.pendingRides.length).toBe(1);
  });

  it('deve iniciar na viewState "list"', () => {
    expect(component.viewState).toBe('list');
  });

  describe('toggleOnline', () => {
    it('deve chamar goOffline quando está online', () => {
      component.isOnline = true;
      component.toggleOnline();
      expect(rideStateStub.goOffline).toHaveBeenCalled();
    });

    it('deve chamar goOnline quando está offline', () => {
      component.isOnline = false;
      component.toggleOnline();
      expect(rideStateStub.goOnline).toHaveBeenCalled();
    });
  });

  describe('acceptRide', () => {
    it('deve mudar viewState para "active" após aceitar', () => {
      rideServiceSpy.acceptRide.and.returnValue(of(acceptedRide));
      component.selectedDriverId = 'driver-1';

      component.acceptRide(mockRide);

      expect(component.viewState).toBe('active');
      expect(component.activeRide).toEqual(acceptedRide);
    });

    it('deve remover corrida da lista otimisticamente antes da resposta', () => {
      rideServiceSpy.acceptRide.and.returnValue(of(acceptedRide));
      component.selectedDriverId = 'driver-1';

      component.acceptRide(mockRide);

      expect(rideStateStub.removeRide).toHaveBeenCalledWith(mockRide.id);
    });

    it('deve exibir erro e restaurar lista quando aceitar falha', () => {
      rideServiceSpy.acceptRide.and.returnValue(throwError(() => new Error('Corrida indisponível')));
      component.selectedDriverId = 'driver-1';

      component.acceptRide(mockRide);

      expect(component.errorMessage).toBe('Corrida indisponível');
      expect(rideStateStub.refresh).toHaveBeenCalled();
      expect(component.viewState).toBe('list');
    });

    it('deve exibir erro e não chamar serviço quando nenhum motorista está selecionado', () => {
      component.selectedDriverId = '';
      component.acceptRide(mockRide);

      expect(component.errorMessage).toBeTruthy();
      expect(rideServiceSpy.acceptRide).not.toHaveBeenCalled();
    });
  });

  describe('rejectRide', () => {
    it('deve remover corrida da lista ao rejeitar', () => {
      rideServiceSpy.rejectRide.and.returnValue(of(mockRide));
      component.selectedDriverId = 'driver-1';

      component.rejectRide(mockRide);

      expect(rideStateStub.removeRide).toHaveBeenCalledWith(mockRide.id);
      expect(rideServiceSpy.rejectRide).toHaveBeenCalledWith(mockRide.id, 'driver-1');
    });

    it('deve restaurar lista quando rejeição falha', () => {
      rideServiceSpy.rejectRide.and.returnValue(throwError(() => new Error('Erro')));
      component.selectedDriverId = 'driver-1';

      component.rejectRide(mockRide);

      expect(rideStateStub.refresh).toHaveBeenCalled();
    });

    it('deve exibir erro quando nenhum motorista está selecionado', () => {
      component.selectedDriverId = '';
      component.rejectRide(mockRide);

      expect(component.errorMessage).toBeTruthy();
      expect(rideServiceSpy.rejectRide).not.toHaveBeenCalled();
    });
  });

  describe('completeRide', () => {
    beforeEach(() => {
      rideServiceSpy.acceptRide.and.returnValue(of(acceptedRide));
      component.selectedDriverId = 'driver-1';
      component.acceptRide(mockRide);
    });

    it('deve voltar para viewState "list" após finalizar', () => {
      rideServiceSpy.completeRide.and.returnValue(of({ ...acceptedRide, status: 'COMPLETED' as const }));

      component.completeRide();

      expect(component.viewState).toBe('list');
      expect(component.activeRide).toBeNull();
    });

    it('deve exibir erro quando finalização falha', () => {
      rideServiceSpy.completeRide.and.returnValue(throwError(() => new Error('Falha ao finalizar')));

      component.completeRide();

      expect(component.errorMessage).toBe('Falha ao finalizar');
      expect(component.viewState).toBe('active');
    });

    it('não deve chamar serviço se não há activeRide', () => {
      component.activeRide = null;
      component.completeRide();

      expect(rideServiceSpy.completeRide).not.toHaveBeenCalled();
    });
  });
});
