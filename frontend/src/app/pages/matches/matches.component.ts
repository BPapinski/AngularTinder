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
  visibleMatches: MatchItem[] = [];

  loading = signal<boolean>(false);

  animating = false;
  direction: 'left' | 'right' = 'right';

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
    if (this.loading()) return;

    this.loading.set(true);
    this.datingService.getMatches()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: res => {
          this.matches = res || [];
          this.visibleMatches = this.matches.slice(0, 3);
        },
        error: (err) => {
          console.error('Error loading matches:', err);
          this.matches = [];
          this.visibleMatches = [];
        }
      });
  }

  trackById(_: number, item: MatchItem) {
    return item.id;
  }

  getTransform(index: number): string {
    if (index === 0 && this.animating) {
      return this.direction === 'right'
        ? 'translateX(120%) rotate(10deg)'
        : 'translateX(-120%) rotate(-10deg)';
    }

    return `translateY(${index * 12}px) scale(${1 - index * 0.05})`;
  }

  next() {
    if (this.animating) return;
    this.direction = 'right';
    this.animate();
  }

  prev() {
    if (this.animating) return;
    this.direction = 'left';
    this.animate();
  }

  private animate() {
    this.animating = true;

    setTimeout(() => {
      const first = this.matches.shift();
      if (first) this.matches.push(first);

      this.visibleMatches = this.matches.slice(0, 3);
      this.animating = false;
    }, 300);
  }

  goToChat(id: number) {
    this.router.navigate(['/chat', id]);
  }
}
