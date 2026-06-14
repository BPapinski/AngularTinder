import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
    min_preferred_age: [18, [Validators.required, Validators.min(18)]],
    max_preferred_age: [null as number | null, [Validators.min(18)]],
  }, {
    validators: this.preferredAgeRangeValidator,
  });

  onSubmit() {
    this.errorMessage.set('');

    if (this.registerForm.invalid) {
      this.errorMessage.set(this.getFormErrors());
      return;
    }

    this.loading.set(true);

    const payload = { ...this.registerForm.value };
    if (payload.min_preferred_age == null) delete payload.min_preferred_age;
    if (payload.max_preferred_age == null) delete payload.max_preferred_age;

    this.http.post(`${environment.apiUrl}/users/register/`, payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.parseApiError(err));
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  private getFormErrors(): string {
    const labels: Record<string, string> = {
      email: 'Email',
      password: 'Hasło',
      first_name: 'Imię',
      gender: 'Płeć',
      gender_preference: 'Szukam',
      birth_date: 'Data urodzenia',
      bio: 'Bio',
      min_preferred_age: 'Min. wiek',
      max_preferred_age: 'Maks. wiek',
    };

    const messages: string[] = [];

    Object.entries(this.registerForm.controls).forEach(([key, control]) => {
      const label = labels[key] || key;
      const error = this.getControlError(control);
      if (error) {
        messages.push(`${label}: ${error}`);
      }
    });

    if (this.registerForm.errors?.['preferredAgeRange']) {
      messages.push('Maks. wiek nie może być mniejszy niż min. wiek');
    }

    return messages.length
      ? messages.join(' · ')
      : 'Uzupełnij wszystkie wymagane pola.';
  }

  private getControlError(control: AbstractControl): string | null {
    if (!control.errors) return null;

    if (control.errors['required']) return 'to pole jest wymagane';
    if (control.errors['email']) return 'podaj poprawny adres email';
    if (control.errors['minlength']) {
      return `minimum ${control.errors['minlength'].requiredLength} znaków`;
    }
    if (control.errors['maxlength']) {
      return `maksymalnie ${control.errors['maxlength'].requiredLength} znaków`;
    }
    if (control.errors['min']) {
      return `minimum ${control.errors['min'].min}`;
    }

    return 'nieprawidłowa wartość';
  }

  private preferredAgeRangeValidator(control: AbstractControl) {
    const min = control.get('min_preferred_age')?.value;
    const max = control.get('max_preferred_age')?.value;

    if (min == null || max == null || max === '') {
      return null;
    }

    return Number(max) < Number(min) ? { preferredAgeRange: true } : null;
  }

  private parseApiError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Brak połączenia z serwerem. Upewnij się, że backend jest uruchomiony.';
    }

    const body = err.error;
    if (!body) {
      return `Nie udało się utworzyć konta (błąd ${err.status}).`;
    }

    if (typeof body === 'string') {
      return body;
    }

    if (body.detail) {
      return Array.isArray(body.detail) ? body.detail.join(' ') : String(body.detail);
    }

    const fieldLabels: Record<string, string> = {
      email: 'Email',
      password: 'Hasło',
      first_name: 'Imię',
      gender: 'Płeć',
      gender_preference: 'Szukam',
      birth_date: 'Data urodzenia',
      bio: 'Bio',
      min_preferred_age: 'Min. wiek',
      max_preferred_age: 'Maks. wiek',
      non_field_errors: 'Błąd',
    };

    const messages: string[] = [];

    Object.entries(body).forEach(([key, value]) => {
      const label = fieldLabels[key] || key;
      const raw = Array.isArray(value) ? value.join(' ') : String(value);
      messages.push(`${label}: ${this.translateError(raw)}`);
    });

    return messages.length
      ? messages.join(' · ')
      : 'Nie udało się utworzyć konta.';
  }

  private translateError(message: string): string {
    const translations: Record<string, string> = {
      'user with this email already exists.': 'użytkownik z tym adresem email już istnieje',
      'This field is required.': 'to pole jest wymagane',
      'Enter a valid email address.': 'podaj poprawny adres email',
      'Ensure this field has at least 6 characters.': 'hasło musi mieć co najmniej 6 znaków',
    };

    return translations[message] || message;
  }
}
