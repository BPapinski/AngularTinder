import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

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

    if (!user || !user.profile_image) {
      return 'assets/placeholder-user.png';
    }

    if (user.profile_image.startsWith('http')) {
      return user.profile_image;
    }

    const serverUrl = 'http://127.0.0.1:8000';

    return `${serverUrl}${user.profile_image}`;
  }
  get user() {
    return this.authService.currentUser();
  }

  logout() {
    this.authService.logout();
  }
}
