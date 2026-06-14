import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-message-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-notification.component.html',
  styleUrl: './message-notification.component.css',
})
export class MessageNotificationComponent {
  protected notificationService = inject(NotificationService);
  private router = inject(Router);
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const popup = this.notificationService.messagePopup();
      if (this.dismissTimer) {
        clearTimeout(this.dismissTimer);
        this.dismissTimer = null;
      }
      if (popup) {
        this.dismissTimer = setTimeout(() => this.notificationService.closeMessagePopup(), 6000);
      }
    });
  }

  preview(content: string): string {
    const trimmed = content.trim();
    if (!trimmed) return 'Wysłał(a) nową wiadomość';
    return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
  }

  goToChat() {
    const popup = this.notificationService.messagePopup();
    if (!popup) return;
    this.notificationService.closeMessagePopup();
    this.router.navigate(['/chat'], { queryParams: { userId: popup.userId } });
  }

  close() {
    this.notificationService.closeMessagePopup();
  }
}
