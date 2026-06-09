import { Injectable, inject, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private auth = inject(AuthService);
  private pollSub: Subscription | null = null;
  private readonly MATCHES_VISIT_KEY = 'lastMatchesVisit';

  unreadMessages = signal(0);
  newMatches = signal(0);

  startPolling() {
    this.refresh();
    if (!this.pollSub) {
      this.pollSub = interval(30000).subscribe(() => this.refresh());
    }
  }

  refresh() {
    if (!this.auth.isLoggedIn()) return;

    this.auth.authFetch<{ unread: number }>('/chat/unread/').subscribe({
      next: (r) => this.unreadMessages.set(r.unread),
      error: () => {},
    });

    this.auth.authFetch<any[]>('/interactions/matches/').subscribe({
      next: (matches) => {
        const raw = localStorage.getItem(this.MATCHES_VISIT_KEY);
        const lastVisitMs = raw ? new Date(raw).getTime() : 0;
        const count = matches.filter(
          (m) => new Date(m.created_at).getTime() > lastVisitMs
        ).length;
        this.newMatches.set(count);
      },
      error: () => {},
    });
  }

  clearMatches() {
    localStorage.setItem(this.MATCHES_VISIT_KEY, new Date().toISOString());
    this.newMatches.set(0);
  }
}
