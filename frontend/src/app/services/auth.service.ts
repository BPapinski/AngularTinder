import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders  } from '@angular/common/http';
import { Observable, tap, switchMap, catchError, throwError } from 'rxjs';

/**
 * Payload used for user login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response returned after successful login
 */
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
  private verifyUrl = 'http://localhost:8000/api/users/token/verify/';
  private refreshUrl = 'http://localhost:8000/api/users/token/refresh/';


  /**
   * Authenticates user and stores access & refresh tokens
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.apiUrl, credentials).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
      })
    );
  }

  /**
   * Checks if access token exists in local storage
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  /**
   * Clears authentication tokens from local storage
   */
  logout() {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
  }

  /**
   * Performs authenticated GET request with automatic token validation
   * and refresh if access token has expired
   */
  authFetch<T>(url: string): Observable<T> {
    const access = localStorage.getItem('access_token');
    const refresh = localStorage.getItem('refresh_token');

    if (!access) {
      throw new Error('Brak access tokena');
    }

    return this.http.post(this.verifyUrl, { token: access }).pipe(
      switchMap(() =>
        this.http.get<T>(url, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${access}`
          })
        })
      ),
      catchError(() => {
        if (!refresh) {
          throw new Error('Brak refresh tokena');
        }

        return this.http.post<any>(this.refreshUrl, { refresh }).pipe(
          switchMap(res => {
            localStorage.setItem('access_token', res.access);

            return this.http.get<T>(url, {
              headers: new HttpHeaders({
                Authorization: `Bearer ${res.access}`
              })
            });
          })
        );
      })
    );
  }
}
