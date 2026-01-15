import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/users/login/';
  private refreshUrl = 'http://localhost:8000/api/users/token/refresh/';
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.apiUrl, credentials).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
      })
    );
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  authFetch<T>(url: string): Observable<T> {
    const token = localStorage.getItem('access_token');

    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.get<T>(url, { headers }).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error<T>(url);
        }
        return throwError(() => error);
      })
    );
  }

  // --- LOGIKA ODŚWIEŻANIA ---
  private handle401Error<T>(originalUrl: string): Observable<T> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);
      const refresh = localStorage.getItem('refresh_token');

      if (!refresh) {
        this.logout();
        return throwError(() => new Error('Brak refresh tokena'));
      }

      return this.http.post<any>(this.refreshUrl, { refresh }).pipe(
        switchMap((token: any) => {
          this.isRefreshing = false;
          localStorage.setItem('access_token', token.access);
          this.refreshTokenSubject.next(token.access);
          return this.authFetch<T>(originalUrl);
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.logout();
          return throwError(() => err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(() => {
            return this.authFetch<T>(originalUrl);
        })
      );
    }
  }
}
