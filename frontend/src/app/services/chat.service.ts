import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private socket: WebSocket | null = null;

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

    const token = localStorage.getItem('access_token');
    const wsUrl = `ws://127.0.0.1:8000/ws/chat/${otherUserId}/?token=${token}`;

    console.log('🔗 Łączę się z WebSocketem:', wsUrl);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('✅ WebSocket połączony z użytkownikiem:', otherUserId);
    };

    this.socket.onmessage = (event) => {
      console.log('📩 ChatService otrzymała surowe dane z WS:', event.data);
      const data = JSON.parse(event.data);
      console.log('📩 ChatService parsowała wiadomość:', data);
      this.messageSubject.next(data);
    };

    this.socket.onclose = (event) => {
      console.log('❌ WebSocket zamknięty, kod:', event.code);
    };

    this.socket.onerror = (error) => {
      console.error('⚠️ Błąd WebSocketa:', error);
    };
  }

  sendMessage(content: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const msg = { content: content };
      this.socket.send(JSON.stringify(msg));
    } else {
      console.error('Nie można wysłać wiadomości, brak połączenia WebSocket.');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
