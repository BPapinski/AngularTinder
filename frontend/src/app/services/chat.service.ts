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

  private messageSubject = new Subject<any>();
  public messages$ = this.messageSubject.asObservable();

  getMatches(): Observable<any[]> {
    return this.auth.authFetch<any[]>('/chat/matches/');
  }

  getMessagesHistory(userId: number): Observable<any[]> {
    return this.auth.authFetch<any[]>(`/chat/messages/${userId}/`);
  }

  connect(otherUserId: number) {
    this.disconnect();
    this.otherUserId = otherUserId;

    const token = localStorage.getItem('access_token');
    const wsUrl = `${environment.wsUrl}/ws/chat/${otherUserId}/?token=${token}`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next(this.normalizeMessage(data));
    };
  }

  sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ content: trimmed }));
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
        next: (msg) => this.messageSubject.next(this.normalizeMessage(msg)),
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
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.otherUserId = null;
  }

  private normalizeMessage(msg: any) {
    return {
      ...msg,
      receiver: typeof msg.receiver === 'object' ? msg.receiver?.id : msg.receiver,
    };
  }
}
