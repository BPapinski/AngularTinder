import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-match-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-popup.component.html',
  styleUrl: './match-popup.component.css',
})
export class MatchPopupComponent {
  protected notificationService = inject(NotificationService);
  private router = inject(Router);

  goToChat() {
    const popup = this.notificationService.matchPopup();
    if (!popup) return;
    this.notificationService.closeMatchPopup();
    this.router.navigate(['/chat'], { queryParams: { userId: popup.userId } });
  }

  close() {
    this.notificationService.closeMatchPopup();
  }
}
