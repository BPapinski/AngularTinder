import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, UserProfile } from '../../services/auth.service';

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
    this.initForm()
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
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      bio: ['', [Validators.maxLength(500)]],
      gender: [''],
    });
  }

  startEditing() {
    if (!this.user) return;
    this.isEditing = true;
    this.selectedFile = null;
    this.previewUrl = null;

    this.editForm.patchValue({
      first_name: this.user.first_name,
      bio: this.user.bio,
      gender: this.user.gender
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

    formData.append('first_name', this.editForm.get('first_name')?.value);
    formData.append('bio', this.editForm.get('bio')?.value || '');
    formData.append('gender', this.editForm.get('gender')?.value);

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
    if (currentUser && currentUser.id === visitedId) {
      this.isOwnProfile = true;
    } else {
      this.isOwnProfile = false;
    }
  }

  getProfileImageUrl(): string {
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
