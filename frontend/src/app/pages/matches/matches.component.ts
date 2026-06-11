import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DatingService } from '../../services/dating.service';
import { NotificationService } from '../../services/notification.service';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface MatchItem {
  id: number;
  user: {
    id: number;
    first_name: string;
    age?: number;
    profile_image?: string | null;
  };
  created_at: string;
}

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.css'],
})
export class MatchesComponent implements OnInit {

  matches: MatchItem[] = [];
  loading = signal<boolean>(false);

  resetting = signal(false);

  constructor(
    public authService: AuthService,
    private datingService: DatingService,
    private router: Router,
    private notificationService: NotificationService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.notificationService.clearMatches();
      this.loadMatches();
    }
  }

  loadMatches() {
    this.loading.set(true);

    this.datingService.getMatches()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: res => this.matches = res || [],
        error: () => this.matches = []
      });
  }

  trackById(_: number, item: MatchItem) {
    return item.id;
  }

  isNew(match: MatchItem): boolean {
    const created = new Date(match.created_at).getTime();
    const now = Date.now();
    return now - created < 24 * 60 * 60 * 1000;
  }

  goToChat(userId: number) {
    this.router.navigate(['/chat'], { queryParams: { userId: userId } });
  }

  resetMatches() {
    if (!confirm('Usunąć wszystkie pary i polubienia? (tylko do testów)')) return;
    this.resetting.set(true);
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    this.http.delete(`${environment.apiUrl}/interactions/reset/`, { headers })
      .pipe(finalize(() => this.resetting.set(false)))
      .subscribe({
        next: () => {
          this.matches = [];
          this.notificationService.newMatches.set(0);
          this.notificationService.clearMatches();
        },
        error: () => alert('Błąd podczas usuwania par'),
      });
  }
}
