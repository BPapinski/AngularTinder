import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  authService = inject(AuthService);
  notificationService = inject(NotificationService);

  get unreadSenders() {
    return () => {
      const perUser = this.notificationService.unreadPerUser();
      const names = this.notificationService.senderNames();
      return Object.entries(perUser)
        .filter(([, count]) => (count ?? 0) > 0)
        .map(([id, count]) => ({ id: Number(id), name: names[Number(id)] ?? '...', count: count! }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
    };
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.notificationService.startPolling();
    }
  }

  getProfileImageUrl(): string {
    const user = this.user;

    if (!user || !user.profile_image) {
      return 'assets/placeholder-user.svg';
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
