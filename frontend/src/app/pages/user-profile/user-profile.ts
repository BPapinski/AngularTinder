import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';


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
  private route = inject(ActivatedRoute);

  user: any = null;
  loading = true;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const endpoint = id ? `/users/${id}/` : '/users/me/';
    this.loadProfile(endpoint);
  }

  loadProfile(endpoint: string) {
    this.loading = true;

    this.authService.authFetch<any>(endpoint).subscribe({
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
