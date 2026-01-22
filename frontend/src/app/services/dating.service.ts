

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface DatingProfile {
  id: number;
  first_name: string;
  age: number;
  bio: string;
  profile_image: string | null;
}

export interface MatchUser {
  id: number;
  first_name: string;
  age?: number;
  profile_image?: string | null;
}

export interface MatchItem {
  id: number;
  user: MatchUser;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatingService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getFeed(): Observable<any> {
    const url = `${this.apiUrl}/interactions/feed/`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      timeout(10000)
    );
  }

  sendInteraction(userId: number, action: 'like' | 'dislike'): Observable<any> {
    const url = `${this.apiUrl}/interactions/${action}/${userId}/`;
    return this.http.post(url, {}, { headers: this.getHeaders() }).pipe(
      timeout(10000)
    );
  }

  getMatches(): Observable<MatchItem[]> {
    const url = `${this.apiUrl}/interactions/matches/`;
    return this.http.get<MatchItem[]>(url, { headers: this.getHeaders() }).pipe(
      timeout(10000)
    );
  }
}
