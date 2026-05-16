import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RideService } from './ride.service';
import { Ride } from '../models/ride.model';

describe('RideService', () => {
  let service: RideService;
  let httpMock: HttpTestingController;

  const BASE = 'http://localhost:8081/api';

  const mockRide: Ride = {
    id: 1, userId: 'user-1',
    pickupAddress: 'Av. Beira Mar, 100',
    destinationAddress: 'Av. Washington Soares, 200',
    status: 'PENDING', createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RideService],
    });
    service = TestBed.inject(RideService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  describe('createRide', () => {
    it('deve fazer POST em /api/rides e retornar a corrida criada', () => {
      const payload = { userId: 'user-1', pickupAddress: 'A', destinationAddress: 'B' };
      service.createRide(payload).subscribe(ride => {
        expect(ride.status).toBe('PENDING');
        expect(ride.id).toBe(1);
      });

      const req = httpMock.expectOne(`${BASE}/rides`);
      expect(req.request.method).toBe('POST');
      req.flush(mockRide);
    });
  });

  describe('listPendingRides', () => {
    it('deve fazer GET em /api/rides/pending', () => {
      service.listPendingRides().subscribe(rides => {
        expect(rides.length).toBe(1);
      });

      const req = httpMock.expectOne(`${BASE}/rides/pending`);
      expect(req.request.method).toBe('GET');
      req.flush([mockRide]);
    });
  });

  describe('acceptRide', () => {
    it('deve fazer POST em /api/rides/{id}/accept com driverId', () => {
      const accepted = { ...mockRide, status: 'IN_PROGRESS' as const, driverId: 'driver-1' };
      service.acceptRide(1, { driverId: 'driver-1' }).subscribe(ride => {
        expect(ride.status).toBe('IN_PROGRESS');
        expect(ride.driverId).toBe('driver-1');
      });

      const req = httpMock.expectOne(`${BASE}/rides/1/accept`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ driverId: 'driver-1' });
      req.flush(accepted);
    });
  });

  describe('rejectRide', () => {
    it('deve fazer POST em /api/rides/{id}/reject com driverId', () => {
      service.rejectRide(1, 'driver-1').subscribe(ride => {
        expect(ride.status).toBe('PENDING');
      });

      const req = httpMock.expectOne(`${BASE}/rides/1/reject`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ driverId: 'driver-1' });
      req.flush(mockRide);
    });
  });

  describe('completeRide', () => {
    it('deve fazer POST em /api/rides/{id}/complete', () => {
      const completed = { ...mockRide, status: 'COMPLETED' as const };
      service.completeRide(1).subscribe(ride => {
        expect(ride.status).toBe('COMPLETED');
      });

      const req = httpMock.expectOne(`${BASE}/rides/1/complete`);
      expect(req.request.method).toBe('POST');
      req.flush(completed);
    });
  });

  describe('getRide', () => {
    it('deve fazer GET em /api/rides/{id}', () => {
      service.getRide(1).subscribe(ride => {
        expect(ride.id).toBe(1);
      });

      const req = httpMock.expectOne(`${BASE}/rides/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockRide);
    });
  });

  describe('listDrivers', () => {
    it('deve fazer GET em /api/drivers', () => {
      const drivers = [{ id: 'driver-1', name: 'Carlos', license: 'ABC-1234' }];
      service.listDrivers().subscribe(d => {
        expect(d.length).toBe(1);
        expect(d[0].id).toBe('driver-1');
      });

      const req = httpMock.expectOne(`${BASE}/drivers`);
      expect(req.request.method).toBe('GET');
      req.flush(drivers);
    });
  });

  describe('tratamento de erros', () => {
    it('deve propagar erro em formato legível quando servidor retorna 404', () => {
      let errorMessage = '';
      service.getRide(99).subscribe({
        error: (err: Error) => errorMessage = err.message,
      });

      const req = httpMock.expectOne(`${BASE}/rides/99`);
      req.flush({ message: 'Corrida não encontrada' }, { status: 404, statusText: 'Not Found' });

      expect(errorMessage).toBeTruthy();
    });

    it('deve propagar erro de conexão quando status é 0', () => {
      let errorMessage = '';
      service.listPendingRides().subscribe({
        error: (err: Error) => errorMessage = err.message,
      });

      const req = httpMock.expectOne(`${BASE}/rides/pending`);
      req.flush(null, { status: 0, statusText: 'Unknown Error' });

      expect(errorMessage).toContain('conexão');
    });
  });
});
