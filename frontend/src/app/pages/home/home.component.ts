import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule  } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { DatingService, DatingProfile } from '../../services/dating.service';
import { NotificationService } from '../../services/notification.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  profiles: DatingProfile[] = [];
  loading = false;
  currentPhotoIndex = 0;

  startX = 0;
  translateX = 0;
  rotate = 0;
  isDragging = false;

  readonly SWIPE_THRESHOLD = 120;
  readonly USE_MOCKS = false;

  get likeOpacity(): number {
    return Math.max(0, Math.min(this.translateX / this.SWIPE_THRESHOLD, 1));
  }

  get nopeOpacity(): number {
    return Math.max(0, Math.min(-this.translateX / this.SWIPE_THRESHOLD, 1));
  }

  constructor(
    public authService: AuthService,
    private datingService: DatingService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
  ) {}

  ngOnInit() {
    if (this.USE_MOCKS) {
      this.loadMockProfiles();
      return;
    }

    else if (this.authService.isLoggedIn()) {
      this.loadFeed();
    }
  }

  loadMockProfiles() {
    this.profiles = [
      { id: 1, first_name: 'Anna', age: 24, bio: 'Kawa i podróże ☕✈️', profile_image: null, photos: [] },
      { id: 2, first_name: 'Kasia', age: 27, bio: 'Frontend i UX 💻', profile_image: null, photos: [] },
      { id: 3, first_name: 'Magda', age: 22, bio: 'Fotografia 📸', profile_image: null, photos: [] },
      { id: 4, first_name: 'Ola', age: 26, bio: 'Sport i psy 🐕', profile_image: null, photos: [] },
      { id: 5, first_name: 'Natalia', age: 29, bio: 'City breaki 🌍', profile_image: null, photos: [] }
    ] as DatingProfile[];
  }

  loadFeed() {
  this.loading = true;
  this.profiles = [];
  this.currentPhotoIndex = 0;

  this.datingService.getFeed()
    .pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (profiles: any) => {
        console.log('FEED RESPONSE', profiles);

        if (Array.isArray(profiles)) {
            this.profiles = profiles.map((profile: DatingProfile) => ({
              ...profile,
              photos: profile.photos?.length
                ? profile.photos
                : profile.profile_image
                  ? [profile.profile_image]
                  : [],
            }));
          } else {
            this.profiles = [];
          }
        this.loading = false;
      },
      error: (err) => {
        console.error('FEED ERROR', err);
        this.profiles = [];
        this.loading = false;
      },
      complete: () => {
        this.cdr.detectChanges();
      }
    });
}

  onPointerDown(event: PointerEvent) {
    if ((event.target as HTMLElement).closest('.photo-nav, .photo-dots')) return;
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
    if (!profile) return;

    this.removeFirstProfile();

    this.datingService.sendInteraction(profile.id, 'like').subscribe({
      next: (res) => {
        if (res?.is_match) {
          this.notificationService.showMatchPopup(profile.id, profile.first_name);
          this.notificationService.newMatches.update(n => n + 1);
        }
      },
      error: (err) => console.error('SMASH (API Error):', err)
    });
  }

  pass(profile: DatingProfile) {
    if (!profile) return;

    console.log('PASS (UI):', profile.first_name);
    this.removeFirstProfile();

    this.datingService.sendInteraction(profile.id, 'dislike').subscribe({
      next: (res) => console.log('PASS (API Success):', res),
      error: (err) => console.error('PASS (API Error):', err)
    });
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

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  login() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.authService.logout();
  }

  private removeFirstProfile() {
    this.profiles.shift();
    this.currentPhotoIndex = 0;
    this.resetCard();
  }

  getCurrentPhotos(profile: DatingProfile | undefined): string[] {
    if (!profile) return [];
    if (profile.photos?.length) return profile.photos;
    return profile.profile_image ? [profile.profile_image] : [];
  }

  get activePhotos(): string[] {
    return this.getCurrentPhotos(this.profiles[0]);
  }

  showPreviousPhoto(event: Event) {
    event.stopPropagation();
    const photos = this.activePhotos;
    if (!photos.length) return;
    this.currentPhotoIndex = (this.currentPhotoIndex - 1 + photos.length) % photos.length;
  }

  showNextPhoto(event: Event) {
    event.stopPropagation();
    const photos = this.activePhotos;
    if (!photos.length) return;
    this.currentPhotoIndex = (this.currentPhotoIndex + 1) % photos.length;
  }

  goToPhoto(index: number, event: Event) {
    event.stopPropagation();
    this.currentPhotoIndex = index;
  }
}
