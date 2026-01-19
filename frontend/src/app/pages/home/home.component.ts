import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { DatingService, DatingProfile } from '../../services/dating.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  profiles: DatingProfile[] = [];
  loading = false;

  // ===== SWIPE STATE =====
  startX = 0;
  translateX = 0;
  rotate = 0;
  isDragging = false;

  readonly SWIPE_THRESHOLD = 120;
  readonly USE_MOCKS = true;

  constructor(
    public authService: AuthService,
    private datingService: DatingService,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.USE_MOCKS) {
      this.loadMockProfiles();
      return;
    }

    if (this.authService.isLoggedIn()) {
      this.loadFeed();
    }
  }

  // ======================
  // MOCK PROFILES
  // ======================
  loadMockProfiles() {
    this.profiles = [
      { id: 1, first_name: 'Anna', age: 24, bio: 'Kawa i podróże ☕✈️', profile_image: null },
      { id: 2, first_name: 'Kasia', age: 27, bio: 'Frontend i UX 💻', profile_image: null },
      { id: 3, first_name: 'Magda', age: 22, bio: 'Fotografia 📸', profile_image: null },
      { id: 4, first_name: 'Ola', age: 26, bio: 'Sport i psy 🐕', profile_image: null },
      { id: 5, first_name: 'Natalia', age: 29, bio: 'City breaki 🌍', profile_image: null }
    ] as DatingProfile[];
  }

  // ======================
  // BACKEND FEED
  // ======================
  loadFeed() {
    this.loading = true;
    this.datingService.getFeed().subscribe({
      next: (profiles) => {
        this.profiles = profiles;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // ======================
  // SWIPE
  // ======================
  onPointerDown(event: PointerEvent) {
    this.isDragging = true;
    this.startX = event.clientX;
  }

  onPointerMove(event: PointerEvent) {
    if (!this.isDragging) return;
    this.translateX = event.clientX - this.startX;
    this.rotate = this.translateX / 15;
  }

  onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.translateX > this.SWIPE_THRESHOLD) {
      this.smash(this.profiles[0]);
    } else if (this.translateX < -this.SWIPE_THRESHOLD) {
      this.pass(this.profiles[0]);
    }

    this.resetCard();
  }

  smash(profile: DatingProfile) {
    console.log('SMASH:', profile);
    this.profiles.shift();
  }

  pass(profile: DatingProfile) {
    console.log('PASS:', profile);
    this.profiles.shift();
  }

  forceSmash() {
    this.smash(this.profiles[0]);
  }

  forcePass() {
    this.pass(this.profiles[0]);
  }

  resetCard() {
    this.translateX = 0;
    this.rotate = 0;
  }

  // ======================
  // NAVIGATION
  // ======================
  goToProfile() {
    this.router.navigate(['/profile']);
  }

  login() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
