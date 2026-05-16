/**
 * Tipos TypeScript que espelham os DTOs do backend.
 * Usar tipos explícitos evita erros em tempo de compilação e
 * habilita autocomplete no IDE.
 */

export type RideStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Ride {
  id: number;
  userId: string;
  pickupAddress: string;
  destinationAddress: string;
  status: RideStatus;
  driverId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRideRequest {
  userId: string;
  pickupAddress: string;
  destinationAddress: string;
}

export interface AcceptRideRequest {
  driverId: string;
}

export interface Driver {
  id: string;
  name: string;
  license: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
}
