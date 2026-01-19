import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // 1. Dodaj ChangeDetectorRef
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css'
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private location = inject(Location);
  private cdr = inject(ChangeDetectorRef); // 2. Wstrzyknij ChangeDetectorRef

  user: UserProfile | null = null;
  loading = true;
  isOwnProfile = false;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      const userId = +idParam;
      this.checkIfOwnProfile(userId);
      this.loadUser(userId);
    } else {
      this.isOwnProfile = true;
      this.authService.fetchCurrentUser().subscribe({
        next: (data) => {
          this.user = data;
          this.loading = false;
          this.cdr.detectChanges(); // 3. <--- KLUCZOWA ZMIANA: Wymuś odświeżenie widoku
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges(); // Wymuś też przy błędzie
        }
      });
    }
  }

  loadUser(id: number) {
    this.authService.getUserById(id).subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
        this.cdr.detectChanges(); // 3. <--- KLUCZOWA ZMIANA
      },
      error: (err) => {
        console.error('Błąd pobierania profilu', err);
        this.loading = false;
        this.cdr.detectChanges(); // Wymuś też przy błędzie
      }
    });
  }

  // Reszta metod bez zmian (checkIfOwnProfile, getProfileImageUrl, etc.)
  checkIfOwnProfile(visitedId: number) {
    const currentUser = this.authService.currentUser();
    if (currentUser && currentUser.id === visitedId) {
      this.isOwnProfile = true;
    } else {
      this.isOwnProfile = false;
    }
  }

  getProfileImageUrl(): string {
    // Tutaj zmienimy logikę w Kroku 2, żeby naprawić błąd 404
    if (!this.user || !this.user.profile_image) {
      return 'assets/placeholder-user.png';
    }
    if (this.user.profile_image.startsWith('http')) {
      return this.user.profile_image;
    }
    return `http://127.0.0.1:8000${this.user.profile_image}`;
  }

  getGenderLabel(code?: string): string {
    if (code === 'M') return 'Mężczyzna';
    if (code === 'F') return 'Kobieta';
    return 'Nie podano';
  }

  goBack() {
    this.location.back();
  }
}
