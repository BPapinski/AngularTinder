import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.css']
})
export class UserProfile implements OnInit {
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  user: any = null;
  loading = true;

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;

    this.authService.authFetch<any>('/users/me/').subscribe({
      next: (res) => {
        this.user = res;
        this.loading = false;
        console.log('Loaded profile:', this.user);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.loading = false;
      },
    });
  }

  get genderLabel() {
    if (!this.user) return '';
    return this.user.gender === 'M'
      ? 'Mężczyzna'
      : this.user.gender === 'F'
      ? 'Kobieta'
      : 'Inna';
  }
}
