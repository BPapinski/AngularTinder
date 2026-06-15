import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, take, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}


export interface UserPhoto {
  id: number;
  order: number;
  image: string;
  created_at?: string;
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  gender?: string;
  gender_preference?: string;
  min_preferred_age?: number | null;
  max_preferred_age?: number | null;
  birth_date?: string;
  age?: number;
  bio?: string;
  profile_image?: string;
  photos?: UserPhoto[];
  is_match?: boolean;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = environment.apiUrl;
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  currentUser = signal<UserProfile | null>(null);
  userLoading = signal<boolean>(false);

  constructor() {
    if (this.isLoggedIn()) {
      this.fetchCurrentUser().subscribe({
        next: (user) => this.currentUser.set(user),
        error: () => this.logout()
      });
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = `${this.baseUrl}/users/login/`;
    return this.http.post<LoginResponse>(url, credentials).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);

        this.fetchCurrentUser().subscribe();
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  fetchCurrentUser(): Observable<UserProfile> {
    this.userLoading.set(true);
    return this.authFetch<UserProfile>('/users/me/').pipe(
      tap(user => this.currentUser.set(user)),
      finalize(() => this.userLoading.set(false))
    );
  }

  authFetch<T>(endpoint: string): Observable<T> {
    const fullUrl = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('access_token');

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<T>(fullUrl, { headers }).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error<T>(endpoint);
        }
        return throwError(() => error);
      })
    );
  }

  getUserById(id: number): Observable<UserProfile> {
    return this.authFetch<UserProfile>(`/users/${id}/`);
  }

  private handle401Error<T>(originalEndpoint: string): Observable<T> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);
      const refresh = localStorage.getItem('refresh_token');

      if (!refresh) {
        this.logout();
        return throwError(() => new Error('Brak refresh tokena'));
      }

      const refreshUrl = `${this.baseUrl}/users/token/refresh/`;

      return this.http.post<any>(refreshUrl, { refresh }).pipe(
        switchMap((token: any) => {
          this.isRefreshing = false;
          localStorage.setItem('access_token', token.access);
          this.refreshTokenSubject.next(token.access);
          return this.authFetch<T>(originalEndpoint);
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);
          this.logout();
          return throwError(() => err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        take(1),
        switchMap(token => {
          if (!token) {
            this.logout();
            return throwError(() => new Error('Session expired'));
          }
          return this.authFetch<T>(originalEndpoint);
        })
      );
    }
  }

  updateProfile(formData: FormData): Observable<UserProfile> {
    return this.authFetch<UserProfile>('/users/me/').pipe(
      switchMap(() => {
        const url = `${this.baseUrl}/users/me/`;
        const token = localStorage.getItem('access_token');
        let headers = new HttpHeaders();
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return this.http.patch<UserProfile>(url, formData, { headers });
      }),
      tap(updatedUser => {
        this.currentUser.set(updatedUser);
      })
    );
  }

  uploadPhoto(file: File): Observable<UserPhoto> {
    const formData = new FormData();
    formData.append('image', file);
    const url = `${this.baseUrl}/users/me/photos/`;
    const token = localStorage.getItem('access_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<UserPhoto>(url, formData, { headers });
  }

  deletePhoto(photoId: number): Observable<void> {
    const url = `${this.baseUrl}/users/me/photos/${photoId}/`;
    const token = localStorage.getItem('access_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.delete<void>(url, { headers });
  }

  reorderPhotos(photoIds: number[]): Observable<UserPhoto[]> {
    const url = `${this.baseUrl}/users/me/photos/reorder/`;
    const token = localStorage.getItem('access_token');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.put<UserPhoto[]>(url, { photo_ids: photoIds }, { headers });
  }

  deleteAccount(credentials: { email: string; password: string }): Observable<{ detail: string }> {
    const url = `${this.baseUrl}/users/me/delete/`;

    return this.authFetch<UserProfile>('/users/me/').pipe(
      switchMap(() => {
        const token = localStorage.getItem('access_token');
        let headers = new HttpHeaders();
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }

        return this.http.post<{ detail: string }>(url, credentials, { headers });
      }),
      tap(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        this.currentUser.set(null);
      })
    );
  }
}
