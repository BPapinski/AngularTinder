import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service'; // Dostosuj ścieżkę

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  authService = inject(AuthService);

  getProfileImageUrl(): string {
    const user = this.user;

    // 1. Jeśli brak usera lub brak zdjęcia -> placeholder
    if (!user || !user.profile_image) {
      return 'assets/placeholder-user.png'; // Upewnij się, że masz taki plik w assets
    }

    // 2. Jeśli zdjęcie to pełny URL (np. z Google), zwracamy go
    if (user.profile_image.startsWith('http')) {
      return user.profile_image;
    }

    // 3. Jeśli to ścieżka względna (/media/...), doklejamy adres API
    // UWAGA: environment.apiUrl to zazwyczaj 'http://localhost:8000/api'
    // Musimy wyciąć '/api' żeby dostać 'http://localhost:8000' albo zdefiniować nową zmienną.
    // Tutaj zakładam proste wycięcie '/api' jeśli istnieje, lub użycie hosta.

    // Prostsza wersja: zhardkoduj domenę backendu lub dodaj do environment 'serverUrl'
    const serverUrl = 'http://127.0.0.1:8000'; // Zmień na swój adres backendu

    return `${serverUrl}${user.profile_image}`;
  }
  // Przykładowy getter dla danych usera (dostosuj do swojego serwisu)
  // user = { firstName: 'Marek', photoUrl: '...' }
  get user() {
    return this.authService.currentUser();
  }

  logout() {
    this.authService.logout();
  }
}
