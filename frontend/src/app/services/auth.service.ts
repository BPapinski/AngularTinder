import { Injectable, inject, signal } from '@angular/core'; // Dodano signal
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}


export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  gender?: string;
  birth_date?: string;
  age?: number;
  bio?: string;
  profile_image?: string; // Np. "/media/profile_images/SK1.jpg"
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  currentUser = signal<UserProfile | null>(null);
  userLoading = signal<boolean>(false);

  constructor() {
    // Przy odświeżeniu strony, jeśli mamy token, próbujemy pobrać dane użytkownika
    if (this.isLoggedIn()) {
      this.fetchCurrentUser().subscribe({
        error: () => this.logout() // Jeśli token wygasł i refresh nie zadziałał
      });
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = `${this.baseUrl}/users/login/`;
    return this.http.post<LoginResponse>(url, credentials).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);

        // === NOWE: Po udanym logowaniu od razu pobieramy dane usera ===
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

    // === NOWE: Czyścimy dane użytkownika przy wylogowaniu ===
    this.currentUser.set(null);
  }

  // === NOWA METODA: Pobiera dane o zalogowanym użytkowniku ===
  fetchCurrentUser(): Observable<UserProfile> {
    this.userLoading.set(true);  // <-- start loading
    return this.authFetch<UserProfile>('/users/me/').pipe(
      tap(user => this.currentUser.set(user)),
      finalize(() => this.userLoading.set(false)) // <-- stop loading
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

  // --- LOGIKA ODŚWIEŻANIA ---
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
          this.logout();
          return throwError(() => err);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(() => {
            return this.authFetch<T>(originalEndpoint);
        })
      );
    }
  }

  updateProfile(formData: FormData): Observable<UserProfile> {
    // Używamy FormData, aby przesłać tekst ORAZ plik (zdjęcie) w jednym zapytaniu
    return this.authFetch<UserProfile>('/users/me/').pipe(
      switchMap(() => {
        // Mały hack: authFetch robi GET, a my potrzebujemy PATCH z FormData.
        // Lepiej użyć bezpośrednio HttpClient z nagłówkami.
        const url = `${this.baseUrl}/users/me/`;
        const token = localStorage.getItem('access_token');
        let headers = new HttpHeaders();
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
          // WAŻNE: Nie ustawiaj Content-Type na multipart/form-data ręcznie!
          // Angular/Browser zrobi to sam, dodając boundary.
        }
        return this.http.patch<UserProfile>(url, formData, { headers });
      }),
      tap(updatedUser => {
        // Aktualizujemy lokalny stan aplikacji (sygnał)
        this.currentUser.set(updatedUser);
      })
    );
  }
}
