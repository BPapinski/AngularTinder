// header.component.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header>
      <nav>
        <a routerLink="/">Home</a>
        <a routerLink="/login">Login</a>
        <a routerLink="/profile">Profil</a>
      </nav>
    </header>
  `
})
export class HeaderComponent {}
