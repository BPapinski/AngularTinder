import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // 1. Import
import { Router, RouterModule  } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { DatingService, DatingProfile } from '../../services/dating.service';

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

  constructor(
    public authService: AuthService,
    private datingService: DatingService,
    private router: Router,
    private cdr: ChangeDetectorRef // 2. Wstrzyknięcie detektora
  ) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.loadFeed();
    }
  }

  loadFeed() {
    console.log('1. Rozpoczynam loadFeed');
    this.loading = true;

    this.datingService.getFeed().subscribe({
      next: (profiles) => {
        console.log('3. SUKCES! Odebrano dane:', profiles);

        this.profiles = profiles;
        this.loading = false;

        // 3. NUCLEARNA OPCJA: Ręczne wymuszenie odświeżenia widoku
        this.cdr.detectChanges();

        console.log('4. Wymuszono odświeżenie widoku');
      },
      error: (error) => {
        console.error('Błąd:', error);
        this.loading = false;
        this.cdr.detectChanges(); // Tutaj też warto dodać
      }
    });
  }

  login() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  pass(profile: any) {
    console.log('Pass clicked for', profile);
    // Tutaj wywołanie API do backendu, np. oznaczenie profilu jako "przesunięty w lewo"
  }

  smash(profile: any) {
    console.log('Smash clicked for', profile);
    // Tutaj wywołanie API do backendu, np. oznaczenie profilu jako "polubiony"
  }
}
