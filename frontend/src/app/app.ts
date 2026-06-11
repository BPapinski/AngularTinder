import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './pages/header/header.component';
import { MatchPopupComponent } from './components/match-popup/match-popup.component';
import { filter } from 'rxjs/operators';

const AUTH_ROUTES = new Set(['/login', '/register']);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, MatchPopupComponent],
  template: `
    @if (showHeader()) {
      <app-header></app-header>
    }
    <router-outlet></router-outlet>
    <app-match-popup></app-match-popup>
  `,
  styleUrl: './app.css'
})
export class App {
  private router = inject(Router);
  showHeader = signal(!AUTH_ROUTES.has(this.router.url.split('?')[0]));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const path = this.router.url.split('?')[0];
        this.showHeader.set(!AUTH_ROUTES.has(path));
      });
  }
}
