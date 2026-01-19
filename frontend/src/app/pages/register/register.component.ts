import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  errorMessage = signal<string>('');
  loading = signal<boolean>(false);

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    first_name: ['', [Validators.required, Validators.maxLength(50)]],

    gender: ['M', Validators.required],
    gender_preference: ['A', Validators.required],

    birth_date: ['', Validators.required],
    bio: ['', Validators.maxLength(500)],

    min_preferred_age: [null],
    max_preferred_age: [null],
  });

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    // 🔹 Używamy HttpClient.post bezpośrednio
    this.http.post('/users/register/', this.registerForm.value)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error(err);
          this.loading.set(false);
          this.errorMessage.set('Nie udało się utworzyć konta');
        }
      });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
