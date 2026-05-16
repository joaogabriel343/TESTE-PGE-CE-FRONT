import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateRide } from './pages/client/create-ride/create-ride';
import { DriverPanel } from './pages/driver/driver-panel/driver-panel';
import { RideHistory } from './pages/history/ride-history';

const routes: Routes = [
  { path: '',        redirectTo: 'client', pathMatch: 'full' },
  { path: 'client',  component: CreateRide },
  { path: 'driver',  component: DriverPanel },
  { path: 'history', component: RideHistory },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
