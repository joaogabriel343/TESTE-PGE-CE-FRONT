import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { AcceptRideRequest, CreateRideRequest, Driver, Ride } from '../models/ride.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RideService {

  private readonly api = environment.apiUrl;
  private readonly TIMEOUT_MS = 8000;

  constructor(private http: HttpClient) {}

  createRide(payload: CreateRideRequest): Observable<Ride> {
    return this.http
      .post<Ride>(`${this.api}/rides`, payload)
      .pipe(timeout(this.TIMEOUT_MS), catchError(this.handleError));
  }

  listPendingRides(): Observable<Ride[]> {
    return this.http
      .get<Ride[]>(`${this.api}/rides/pending`)
      .pipe(timeout(this.TIMEOUT_MS), catchError(this.handleError));
  }

  listAllRides(): Observable<Ride[]> {
    return this.http
      .get<Ride[]>(`${this.api}/rides`)
      .pipe(timeout(this.TIMEOUT_MS), catchError(this.handleError));
  }

  acceptRide(rideId: number, payload: AcceptRideRequest): Observable<Ride> {
    return this.http
      .post<Ride>(`${this.api}/rides/${rideId}/accept`, payload)
      .pipe(timeout(this.TIMEOUT_MS), catchError(this.handleError));
  }

  getRide(rideId: number): Observable<Ride> {
    return this.http
      .get<Ride>(`${this.api}/rides/${rideId}`)
      .pipe(timeout(this.TIMEOUT_MS), catchError(this.handleError));
  }

  listDrivers(): Observable<Driver[]> {
    return this.http
      .get<Driver[]>(`${this.api}/drivers`)
      .pipe(timeout(this.TIMEOUT_MS), catchError(this.handleError));
  }

  rejectRide(rideId: number, driverId: string): Observable<Ride> {
    return this.http
      .post<Ride>(`${this.api}/rides/${rideId}/reject`, { driverId })
      .pipe(timeout(this.TIMEOUT_MS), catchError(this.handleError));
  }

  completeRide(rideId: number): Observable<Ride> {
    return this.http
      .post<Ride>(`${this.api}/rides/${rideId}/complete`, {})
      .pipe(timeout(this.TIMEOUT_MS), catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | TimeoutError | Error): Observable<never> {
    let message = 'Ocorreu um erro inesperado.';

    if (error instanceof TimeoutError) {
      message = 'O backend não respondeu. Verifique se os containers estão rodando (docker-compose up).';
    } else if ((error as HttpErrorResponse).status === 0) {
      message = 'Sem conexão com o servidor. Verifique se o backend está rodando em localhost:8080.';
    } else if ((error as HttpErrorResponse).error?.message) {
      message = (error as HttpErrorResponse).error.message;
    } else if (error.message) {
      message = error.message;
    }

    return throwError(() => new Error(message));
  }
}
