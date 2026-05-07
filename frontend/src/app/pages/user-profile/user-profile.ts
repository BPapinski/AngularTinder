import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService, UserProfile } from '../../services/auth.service';

function minMaxAgeValidator(control: AbstractControl): ValidationErrors | null {
  const min = control.get('min_preferred_age')?.value;
  const max = control.get('max_preferred_age')?.value;
  if (min !== null && min !== '' && max !== null && max !== '' && +min > +max) {
    return { minMaxAge: true };
  }
  return null;
}

function ageValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  const birth = new Date(value);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 18) return { tooYoung: true };
  if (age > 120) return { invalidDate: true };
  return null;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css'
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private location = inject(Location);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  user: UserProfile | null = null;
  loading = true;
  isOwnProfile = false;

  isEditing = false;
  editForm!: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  submitting = false;

  ngOnInit() {
    this.initForm();
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
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  initForm() {
    this.editForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      birth_date: ['', [ageValidator]],
      gender: [''],
      gender_preference: [''],
      min_preferred_age: [null, [Validators.min(18), Validators.max(99)]],
      max_preferred_age: [null, [Validators.min(18), Validators.max(99)]],
      bio: ['', [Validators.maxLength(500)]],
    }, { validators: minMaxAgeValidator });
  }

  startEditing() {
    if (!this.user) return;
    this.isEditing = true;
    this.selectedFile = null;
    this.previewUrl = null;

    this.editForm.patchValue({
      first_name: this.user.first_name,
      birth_date: this.user.birth_date ?? '',
      gender: this.user.gender ?? '',
      gender_preference: this.user.gender_preference ?? '',
      min_preferred_age: this.user.min_preferred_age ?? null,
      max_preferred_age: this.user.max_preferred_age ?? null,
      bio: this.user.bio ?? '',
    });
  }

  cancelEditing() {
    this.isEditing = false;
    this.selectedFile = null;
    this.previewUrl = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile() {
    if (this.editForm.invalid) return;

    this.submitting = true;
    const formData = new FormData();
    const v = this.editForm.value;

    formData.append('first_name', v.first_name);
    formData.append('bio', v.bio || '');
    formData.append('gender', v.gender || '');
    formData.append('gender_preference', v.gender_preference || '');
    if (v.birth_date) formData.append('birth_date', v.birth_date);
    if (v.min_preferred_age !== null && v.min_preferred_age !== '') {
      formData.append('min_preferred_age', v.min_preferred_age);
    }
    if (v.max_preferred_age !== null && v.max_preferred_age !== '') {
      formData.append('max_preferred_age', v.max_preferred_age);
    }
    if (this.selectedFile) {
      formData.append('profile_image', this.selectedFile);
    }

    this.authService.updateProfile(formData).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.isEditing = false;
        this.submitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Błąd zapisu', err);
        this.submitting = false;
        alert('Nie udało się zapisać zmian.');
        this.cdr.detectChanges();
      }
    });
  }

  loadUser(id: number) {
    this.authService.getUserById(id).subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Błąd pobierania profilu', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  checkIfOwnProfile(visitedId: number) {
    const currentUser = this.authService.currentUser();
    this.isOwnProfile = !!(currentUser && currentUser.id === visitedId);
  }

  getProfileImageUrl(): string {
    if (this.previewUrl) return this.previewUrl;
    if (!this.user?.profile_image) return 'assets/placeholder-user.png';
    if (this.user.profile_image.startsWith('http')) return this.user.profile_image;
    return `http://127.0.0.1:8000${this.user.profile_image}`;
  }

  getGenderLabel(code?: string): string {
    if (code === 'M') return 'Mężczyzna';
    if (code === 'F') return 'Kobieta';
    return 'Nie podano';
  }

  getGenderPreferenceLabel(code?: string): string {
    if (code === 'M') return 'Mężczyźni';
    if (code === 'F') return 'Kobiety';
    if (code === 'A') return 'Wszyscy';
    return 'Nie podano';
  }

  get bioLength(): number {
    return this.editForm.get('bio')?.value?.length ?? 0;
  }

  get minMaxAgeError(): boolean {
    return this.editForm.hasError('minMaxAge') &&
      (this.editForm.get('min_preferred_age')?.touched || this.editForm.get('max_preferred_age')?.touched) || false;
  }

  goBack() {
    this.location.back();
  }
}