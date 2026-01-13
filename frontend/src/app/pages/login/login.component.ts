// src/app/pages/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal<string>('');

  loginForm = this.fb.group({
    email: ['admin@admin.com', [Validators.required, Validators.email]],
    password: ['admin', [Validators.required]]
  });

  onSubmit() {
    if (this.loginForm.valid) {
      const credentials = {
        email: this.loginForm.value.email!,
        password: this.loginForm.value.password!
      };

      this.authService.login(credentials).subscribe({
        next: () => {
          console.log('logged in successfully');
          window.alert('logged in');
          this.errorMessage.set('');
          // this.router.navigate(['/feed']);   // tutaj przekierowanie po zalogowaniu na strone glowna
        },
        error: (err) => {
          console.error('log in error ', err);
          this.errorMessage.set('invalid credentials');
        }
      });
    }
  }
}
