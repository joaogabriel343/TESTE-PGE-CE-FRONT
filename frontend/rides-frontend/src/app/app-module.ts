import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { CreateRide } from './pages/client/create-ride/create-ride';
import { DriverPanel } from './pages/driver/driver-panel/driver-panel';
import { RideHistory } from './pages/history/ride-history';
import { Navbar } from './shared/components/navbar/navbar';

/**
 * Módulo raiz da aplicação Angular.
 *
 * ReactiveFormsModule → habilita FormGroup/FormControl para formulário reativo
 * provideHttpClient() → registra o HttpClient como serviço disponível para injeção
 */
@NgModule({
  declarations: [App, CreateRide, DriverPanel, RideHistory, Navbar],
  imports: [BrowserModule, AppRoutingModule, ReactiveFormsModule, FormsModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptorsFromDi()),
  ],
  bootstrap: [App],
})
export class AppModule {}
