import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  loading = false;

  constructor(
    public authService: AuthService,
    private datingService: DatingService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.loadMatches();
    }
  }

  loadMatches() {
    this.loading = true;
    this.datingService.getMatches()
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: MatchItem[]) => this.matches = res || [],
        error: () => this.matches = []
      });
  }

  goToChat(matchId: number) {
    this.router.navigate(['/chat', matchId]);
  }
}
