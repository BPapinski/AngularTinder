// src/app/services/dating.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service'; // Pamiętaj o imporcie AuthService

export interface DatingProfile {
  id: number;
  first_name: string;
  age: number;
  bio: string;
  profile_image: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class DatingService {
  // environment.apiUrl to 'http://localhost:8000/api'
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Tworzenie nagłówków z tokenem
  private getHeaders(): HttpHeaders {
    // Zakładam, że AuthService ma metodę getToken().
    // Jeśli trzymasz token tylko w localStorage, użyj: localStorage.getItem('token')
    const token = this.authService.getToken();

    return new HttpHeaders({
      // Ważne: Sprawdź czy Twój backend (Django) oczekuje "Token" czy "Bearer"
      // Domyślnie Django REST Framework używa "Token"
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getFeed(): Observable<any> {
    // === POPRAWKA ŚCIEŻKI ===
    // Było: /feed/
    // Jest: /interactions/feed/
    const url = `${this.apiUrl}/interactions/feed/`;

    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  sendInteraction(userId: number, action: 'like' | 'dislike'): Observable<any> {
    // URL: /api/interactions/like/{id}/
    const url = `${this.apiUrl}/interactions/${action}/${userId}/`;

    return this.http.post(url, {}, { headers: this.getHeaders() });
  }
}
