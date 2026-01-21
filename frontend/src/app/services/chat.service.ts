import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  getMatches(): Observable<any[]> {
    return this.auth.authFetch<any[]>('/chat/matches/');
  }

  getMessages(userId: number): Observable<any[]> {
    return this.auth.authFetch<any[]>(`/chat/messages/${userId}/`);
  }

  sendMessage(receiverId: number, content: string) {
    return this.http.post(
      `${this.auth['baseUrl']}/chat/send/`,
      { receiver_id: receiverId, content },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`
        }
      }
    );
  }
}
