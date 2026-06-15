import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private socket: WebSocket | null = null;
  private otherUserId: number | null = null;
  private pendingSends: string[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private messageSubject = new Subject<any>();
  public messages$ = this.messageSubject.asObservable();

  getMatches(): Observable<any[]> {
    return this.auth.authFetch<any[]>('/chat/matches/');
  }

  getMessagesHistory(userId: number): Observable<any[]> {
    return this.auth.authFetch<any[]>(`/chat/messages/${userId}/`);
  }

  connect(otherUserId: number) {
    this.clearReconnectTimer();
    this.disconnectSocketOnly();
    this.otherUserId = otherUserId;
    this.pendingSends = [];

    const token = localStorage.getItem('access_token');
    const wsUrl = `${environment.wsUrl}/ws/chat/${otherUserId}/?token=${token}`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.flushPendingSends();
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message_reaction') {
        this.pushReactionUpdate(data);
        return;
      }
      this.pushIncomingMessage(data);
    };

    this.socket.onclose = (event) => {
      this.socket = null;
      if (event.code === 4001 || this.otherUserId !== otherUserId) return;
      this.scheduleReconnect(otherUserId);
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  pushIncomingMessage(msg: any) {
    this.messageSubject.next({ ...this.normalizeMessage(msg), _event: 'message' });
  }

  pushReactionUpdate(update: any) {
    this.messageSubject.next({ ...update, _event: 'reaction' });
  }

  sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ content: trimmed }));
      return;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      this.pendingSends.push(trimmed);
      return;
    }

    if (!this.otherUserId) return;

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http
      .post<any>(`${environment.apiUrl}/chat/send/`, {
        receiver_id: this.otherUserId,
        content: trimmed,
      }, { headers })
      .subscribe({
        next: (msg) => this.pushIncomingMessage(msg),
        error: (err) => console.error('Failed to send message:', err),
      });
  }

  setReaction(messageId: number, reaction: string): Observable<any> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post<any>(
      `${environment.apiUrl}/chat/messages/${messageId}/reaction/`,
      { reaction },
      { headers },
    );
  }

  removeReaction(messageId: number): Observable<any> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.delete<any>(
      `${environment.apiUrl}/chat/messages/${messageId}/reaction/`,
      { headers },
    );
  }

  markRead(userId: number): void {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http
      .post<any>(`${environment.apiUrl}/chat/mark-read/${userId}/`, {}, { headers })
      .subscribe({ error: () => {} });
  }

  disconnect() {
    this.clearReconnectTimer();
    this.otherUserId = null;
    this.pendingSends = [];
    this.disconnectSocketOnly();
  }

  private disconnectSocketOnly() {
    if (!this.socket) return;

    const socket = this.socket;
    this.socket = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.close();
  }

  private flushPendingSends() {
    while (this.pendingSends.length && this.socket?.readyState === WebSocket.OPEN) {
      const content = this.pendingSends.shift()!;
      this.socket.send(JSON.stringify({ content }));
    }
  }

  private scheduleReconnect(otherUserId: number) {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      if (this.otherUserId === otherUserId) {
        this.connect(otherUserId);
      }
    }, 3000);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private normalizeMessage(msg: any) {
    return {
      ...msg,
      receiver: typeof msg.receiver === 'object' ? msg.receiver?.id : msg.receiver,
    };
  }
}
