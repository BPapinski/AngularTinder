import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DatingService } from '../../services/dating.service';

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
  imports: [CommonModule, RouterModule],
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.css'],
})
export class MatchesComponent implements OnInit {

  matches: MatchItem[] = [];
  loading = signal<boolean>(false);

  constructor(
    public authService: AuthService,
    private datingService: DatingService,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
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
    return now - created < 24 * 60 * 60 * 1000; // 24h
  }

  goToChat(id: number) {
    this.router.navigate(['/chat', id]);
  }
}
