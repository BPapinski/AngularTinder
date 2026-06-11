import { Injectable, inject, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private auth = inject(AuthService);
  private pollSub: Subscription | null = null;
  private socket: WebSocket | null = null;
  private readonly MATCHES_VISIT_KEY = 'lastMatchesVisit';

  unreadMessages = signal(0);
  newMatches = signal(0);

  startPolling() {
    this.refresh();
    this.connectWebSocket();

    if (!this.pollSub) {
      this.pollSub = interval(60000).subscribe(() => this.refresh());
    }
  }

  stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    this.disconnectWebSocket();
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

  private connectWebSocket() {
    if (this.socket) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsUrl = `${environment.wsUrl}/ws/notifications/?token=${token}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        this.unreadMessages.update(count => count + 1);
      }
    };

    this.socket.onclose = (event) => {
      this.socket = null;
      const isInvalidToken = event.code === 4001;
      if (!isInvalidToken && event.code !== 1000 && this.auth.isLoggedIn()) {
        setTimeout(() => this.connectWebSocket(), 5000);
      } else if (isInvalidToken) {
        this.auth.logout();
      }
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private disconnectWebSocket() {
    if (this.socket) {
      this.socket.close(1000);
      this.socket = null;
    }
  }
}
