import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Subject } from 'rxjs';
import { Ride } from '../models/ride.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client!: Client;

  /** Emits true once STOMP handshake succeeds; false on disconnect/error. */
  readonly connected$ = new BehaviorSubject<boolean>(false);

  /** Emits each ride notification received from /topic/rides. */
  readonly rideNotification$ = new Subject<Ride>();

  connect(): void {
    if (this.client?.active) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl) as WebSocket,
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected$.next(true);
        this.client.subscribe('/topic/rides', (message: IMessage) => {
          const ride: Ride = JSON.parse(message.body);
          this.rideNotification$.next(ride);
        });
      },
      onDisconnect: () => {
        this.connected$.next(false);
      },
      onStompError: (frame) => {
        this.connected$.next(false);
        console.error('[WS] Erro STOMP:', frame.headers['message']);
      },
      onWebSocketError: (event) => {
        this.connected$.next(false);
        console.error('[WS] Erro WebSocket:', event);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    if (this.client?.active) {
      this.client.deactivate();
      this.connected$.next(false);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
