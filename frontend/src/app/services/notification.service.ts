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
  unreadPerUser = signal<Partial<Record<number, number>>>({});
  senderNames = signal<Record<number, string>>({});
  activeChatUserId = signal<number | null>(null);
  matchPopup = signal<{ userId: number; userName: string } | null>(null);

  showMatchPopup(userId: number, userName: string) {
    this.matchPopup.set({ userId, userName });
  }

  closeMatchPopup() {
    this.matchPopup.set(null);
  }

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

    this.auth.authFetch<{ user_id: number; user_name: string; count: number }[]>('/chat/unread-per-user/').subscribe({
      next: (rows) => {
        const perUser: Partial<Record<number, number>> = { ...this.unreadPerUser() };
        const names: Record<number, string> = { ...this.senderNames() };
        for (const row of rows) {
          perUser[row.user_id] = row.count;
          names[row.user_id] = row.user_name;
        }
        this.unreadPerUser.set(perUser);
        this.senderNames.set(names);
      },
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

  markRead(userId: number) {
    const perUser = { ...this.unreadPerUser() };
    const wasUnread = perUser[userId] ?? 0;
    if (wasUnread === 0) return;

    delete perUser[userId];
    this.unreadPerUser.set(perUser);
    this.unreadMessages.update(n => Math.max(0, n - wasUnread));
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
        const fromId: number = data.from_user_id;
        if (fromId === this.activeChatUserId()) return;

        this.senderNames.update(names => ({ ...names, [fromId]: data.from_user_name }));
        this.unreadMessages.update(count => count + 1);
        this.unreadPerUser.update(perUser => ({
          ...perUser,
          [fromId]: (perUser[fromId] ?? 0) + 1,
        }));
      } else if (data.type === 'new_match') {
        this.newMatches.update(count => count + 1);
        this.showMatchPopup(data.with_user_id, data.with_user_name);
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
