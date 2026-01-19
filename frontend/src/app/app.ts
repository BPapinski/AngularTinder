import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './pages/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent], // <--- Added HeaderComponent here
  template: `
    <app-header></app-header>
    <router-outlet></router-outlet>
  `, // <--- Changed from 'templateUrl' to 'template'
  styleUrl: './app.css'
})
export class App {
}
