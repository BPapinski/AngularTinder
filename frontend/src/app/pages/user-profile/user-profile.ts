import { Component, OnInit, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, UserPhoto, UserProfile } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { DatingService } from '../../services/dating.service';

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
  private router = inject(Router);
  private datingService = inject(DatingService);
  private chatService = inject(ChatService);

  user: UserProfile | null = null;
  loading = true;
  isOwnProfile = false;
  isPartner = false;
  removingMatch = false;

  isEditing = false;
  isSettingsOpen = false;
  editForm!: FormGroup;
  deleteAccountForm!: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  submitting = false;
  photoUploading = false;
  photoActionId: number | null = null;
  viewPhotoIndex = 0;
  readonly maxPhotos = 9;
  deletingAccount = false;
  deleteAccountError = '';
  showDeleteConfirmModal = false;

  // ── Crop modal ──────────────────────────────────────────────────────────────
  showCropModal = false;
  cropSrc = '';
  cropBox = { x: 0, y: 0, size: 200 };

  @ViewChild('cropImgEl') cropImgEl!: ElementRef<HTMLImageElement>;
  @ViewChild('cropAreaEl') cropAreaEl!: ElementRef<HTMLDivElement>;

  private cropImgMeta = { left: 0, top: 0, width: 0, height: 0, natW: 0, natH: 0 };
  private drag: {
    type: 'move' | 'tl' | 'tr' | 'bl' | 'br';
    startX: number; startY: number;
    origBox: { x: number; y: number; size: number };
  } | null = null;

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit() {
    this.initForm();

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');

      if (idParam) {
        const userId = Number(idParam);
        this.loading = true;
        this.isPartner = history.state?.['fromMatch'] === true;
        this.checkIfOwnProfile(userId);
        this.loadUser(userId);

        if (!this.authService.currentUser()) {
          this.authService.fetchCurrentUser().subscribe(() => {
            this.checkIfOwnProfile(userId);
            this.cdr.detectChanges();
          });
        }
        return;
      }

      this.isOwnProfile = true;
      this.isPartner = false;
      this.authService.fetchCurrentUser().subscribe({
        next: (data) => {
          this.user = data;
          this.viewPhotoIndex = 0;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loading = false; this.cdr.detectChanges(); }
      });
    });
  }

  initForm() {
    this.editForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      bio: ['', [Validators.maxLength(500)]],
      gender: [''],
      gender_preference: ['A', Validators.required],
      min_preferred_age: [18, [Validators.required, Validators.min(18)]],
      max_preferred_age: [null as number | null, [Validators.min(18)]],
    }, {
      validators: this.preferredAgeRangeValidator,
    });

    this.deleteAccountForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  startEditing() {
    if (!this.user) return;
    this.isEditing = true;
    this.isSettingsOpen = false;
    this.selectedFile = null;
    this.previewUrl = null;
    this.viewPhotoIndex = 0;
    this.editForm.patchValue({
      first_name: this.user.first_name,
      bio: this.user.bio,
      gender: this.user.gender,
      gender_preference: this.user.gender_preference || 'A',
      min_preferred_age: this.user.min_preferred_age ?? 18,
      max_preferred_age: this.user.max_preferred_age ?? null,
    });
  }

  cancelEditing() {
    this.isEditing = false;
    this.selectedFile = null;
    this.previewUrl = null;
  }

  openSettings() {
    if (!this.user) return;
    this.isSettingsOpen = true;
    this.isEditing = false;
    this.deleteAccountError = '';
    this.deleteAccountForm.reset({ email: '', password: '' });
  }

  closeSettings() {
    this.isSettingsOpen = false;
    this.deleteAccountError = '';
    this.showDeleteConfirmModal = false;
    this.deleteAccountForm.reset({ email: '', password: '' });
  }

  // ── File selection → open crop ───────────────────────────────────────────────
  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.cropSrc = e.target!.result as string;
      this.showCropModal = true;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  // ── Crop: image loaded inside modal ─────────────────────────────────────────
  onCropImageLoad() {
    // Wait one tick for layout
    setTimeout(() => {
      const img = this.cropImgEl?.nativeElement;
      const area = this.cropAreaEl?.nativeElement;
      if (!img || !area) return;

      const aRect = area.getBoundingClientRect();
      const iRect = img.getBoundingClientRect();

      this.cropImgMeta = {
        left: iRect.left - aRect.left,
        top: iRect.top - aRect.top,
        width: iRect.width,
        height: iRect.height,
        natW: img.naturalWidth,
        natH: img.naturalHeight,
      };

      const maxSize = Math.min(iRect.width, iRect.height);
      this.cropBox = {
        x: this.cropImgMeta.left + (iRect.width - maxSize) / 2,
        y: this.cropImgMeta.top + (iRect.height - maxSize) / 2,
        size: maxSize,
      };
      this.cdr.detectChanges();
    }, 50);
  }

  // ── Crop: drag/resize ────────────────────────────────────────────────────────
  onCropPointerDown(e: PointerEvent, type: 'move' | 'tl' | 'tr' | 'bl' | 'br') {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    this.drag = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      origBox: { ...this.cropBox },
    };
  }

  onCropPointerMove(e: PointerEvent) {
    if (!this.drag) return;
    e.preventDefault();
    const dx = e.clientX - this.drag.startX;
    const dy = e.clientY - this.drag.startY;
    const orig = this.drag.origBox;
    let { x, y, size } = orig;

    if (this.drag.type === 'move') {
      x += dx;
      y += dy;
    } else {
      // Resize: corner handle changes both position and size
      const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy);
      switch (this.drag.type) {
        case 'br': size += delta; break;
        case 'bl': size -= delta; x += delta; break;
        case 'tr': size += delta; y -= delta; break;
        case 'tl': size -= delta; x += delta; y += delta; break;
      }
    }

    this.cropBox = this.constrainBox({ x, y, size });
    this.cdr.detectChanges();
  }

  onCropPointerUp() {
    this.drag = null;
  }

  private constrainBox(box: { x: number; y: number; size: number }) {
    const m = this.cropImgMeta;
    const minSize = 40;
    const maxSize = Math.min(m.width, m.height);
    let { x, y, size } = box;

    size = Math.max(minSize, Math.min(size, maxSize));
    x = Math.max(m.left, Math.min(x, m.left + m.width - size));
    y = Math.max(m.top, Math.min(y, m.top + m.height - size));

    return { x, y, size };
  }

  // ── Crop: confirm → canvas → File ────────────────────────────────────────────
  confirmCrop() {
    const m = this.cropImgMeta;
    const scale = m.natW / m.width;

    const srcX = (this.cropBox.x - m.left) * scale;
    const srcY = (this.cropBox.y - m.top) * scale;
    const srcSize = this.cropBox.size * scale;

    const OUTPUT = 600;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d')!;

    const img = this.cropImgEl.nativeElement;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);

    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      this.showCropModal = false;
      this.uploadPhotoFile(file);
    }, 'image/jpeg', 0.92);
  }

  cancelCrop() {
    this.showCropModal = false;
    this.cropSrc = '';
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  saveProfile() {
    if (this.editForm.invalid) return;

    this.submitting = true;
    const formData = new FormData();
    formData.append('first_name', this.editForm.get('first_name')?.value);
    formData.append('bio', this.editForm.get('bio')?.value || '');
    formData.append('gender', this.editForm.get('gender')?.value);
    formData.append('gender_preference', this.editForm.get('gender_preference')?.value);
    formData.append('min_preferred_age', this.editForm.get('min_preferred_age')?.value ?? '');
    formData.append('max_preferred_age', this.editForm.get('max_preferred_age')?.value ?? '');

    this.authService.updateProfile(formData).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.isEditing = false;
        this.submitting = false;
        this.previewUrl = null;
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

  deleteAccount() {
    if (this.deleteAccountForm.invalid || this.deletingAccount) {
      this.deleteAccountForm.markAllAsTouched();
      return;
    }

    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirmModal() {
    if (this.deletingAccount) return;
    this.showDeleteConfirmModal = false;
  }

  confirmDeleteAccount() {
    if (this.deleteAccountForm.invalid || this.deletingAccount) return;
    this.deletingAccount = true;
    this.deleteAccountError = '';

    this.authService.deleteAccount({
      email: this.deleteAccountForm.get('email')?.value,
      password: this.deleteAccountForm.get('password')?.value,
    }).subscribe({
      next: () => {
        this.deletingAccount = false;
        this.router.navigate(['/register']);
      },
      error: (err) => {
        this.deletingAccount = false;
        this.showDeleteConfirmModal = false;
        this.deleteAccountError = this.getDeleteAccountError(err);
        this.cdr.detectChanges();
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  get sortedPhotos(): UserPhoto[] {
    return [...(this.user?.photos ?? [])].sort((a, b) => a.order - b.order);
  }

  get canAddMorePhotos(): boolean {
    return this.sortedPhotos.length < this.maxPhotos;
  }

  get viewPhotos(): string[] {
    const urls = this.sortedPhotos.map(photo => photo.image);
    if (urls.length) return urls;
    const fallback = this.getProfileImageUrl();
    return fallback.includes('placeholder-user.svg') ? [] : [fallback];
  }

  uploadPhotoFile(file: File) {
    if (!this.canAddMorePhotos) {
      alert(`Możesz dodać maksymalnie ${this.maxPhotos} zdjęć.`);
      return;
    }

    this.photoUploading = true;
    this.authService.uploadPhoto(file).subscribe({
      next: (photo) => {
        const photos = [...this.sortedPhotos, photo].sort((a, b) => a.order - b.order);
        this.applyPhotos(photos);
        this.photoUploading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.photoUploading = false;
        alert('Nie udało się dodać zdjęcia.');
        this.cdr.detectChanges();
      },
    });
  }

  deletePhoto(photoId: number) {
    this.photoActionId = photoId;
    this.authService.deletePhoto(photoId).subscribe({
      next: () => {
        const photos = this.sortedPhotos.filter(photo => photo.id !== photoId);
        this.applyPhotos(photos);
        this.viewPhotoIndex = Math.min(this.viewPhotoIndex, Math.max(photos.length - 1, 0));
        this.photoActionId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.photoActionId = null;
        alert('Nie udało się usunąć zdjęcia.');
        this.cdr.detectChanges();
      },
    });
  }

  movePhotoEarlier(index: number) {
    if (index <= 0) return;
    this.reorderPhotosAtIndex(index, index - 1);
  }

  movePhotoLater(index: number) {
    if (index >= this.sortedPhotos.length - 1) return;
    this.reorderPhotosAtIndex(index, index + 1);
  }

  private reorderPhotosAtIndex(fromIndex: number, toIndex: number) {
    const photos = [...this.sortedPhotos];
    const [moved] = photos.splice(fromIndex, 1);
    photos.splice(toIndex, 0, moved);
    const photoIds = photos.map(photo => photo.id);

    this.photoActionId = moved.id;
    this.authService.reorderPhotos(photoIds).subscribe({
      next: (updated) => {
        this.applyPhotos(updated);
        this.photoActionId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.photoActionId = null;
        alert('Nie udało się zmienić kolejności zdjęć.');
        this.cdr.detectChanges();
      },
    });
  }

  private applyPhotos(photos: UserPhoto[]) {
    if (!this.user) return;
    const sorted = [...photos].sort((a, b) => a.order - b.order);
    this.user = {
      ...this.user,
      photos: sorted,
      profile_image: sorted[0]?.image ?? undefined,
    };
    if (this.isOwnProfile) {
      this.authService.currentUser.set(this.user);
    }
  }

  showPreviousViewPhoto() {
    if (!this.viewPhotos.length) return;
    this.viewPhotoIndex = (this.viewPhotoIndex - 1 + this.viewPhotos.length) % this.viewPhotos.length;
  }

  showNextViewPhoto() {
    if (!this.viewPhotos.length) return;
    this.viewPhotoIndex = (this.viewPhotoIndex + 1) % this.viewPhotos.length;
  }

  loadUser(id: number) {
    this.authService.getUserById(id).subscribe({
      next: (data) => {
        this.user = data;
        this.viewPhotoIndex = 0;
        this.loading = false;
        this.resolvePartnerStatus(id, data.is_match === true);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 403 || err?.status === 404) {
          this.router.navigate(['/matches']);
          return;
        }
        this.cdr.detectChanges();
      },
    });
  }

  private resolvePartnerStatus(partnerId: number, apiIsMatch: boolean) {
    if (this.isOwnProfile) {
      this.isPartner = false;
      return;
    }

    if (apiIsMatch || this.isPartner) {
      this.isPartner = true;
      return;
    }

    this.chatService.getMatches().subscribe({
      next: (matches) => {
        const inChatMatches = matches.some(match => Number(match.id) === Number(partnerId));
        if (inChatMatches) {
          this.isPartner = true;
          this.cdr.detectChanges();
          return;
        }

        this.datingService.getMatches().subscribe({
          next: (items) => {
            this.isPartner = items.some(item => Number(item.user.id) === Number(partnerId));
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  checkIfOwnProfile(visitedId: number) {
    const currentUser = this.authService.currentUser();
    this.isOwnProfile = !!(currentUser && Number(currentUser.id) === Number(visitedId));
  }

  getProfileImageUrl(): string {
    const firstPhoto = this.sortedPhotos[0]?.image;
    if (firstPhoto) return firstPhoto;
    if (!this.user || !this.user.profile_image) return 'assets/placeholder-user.svg';
    if (this.user.profile_image.startsWith('http')) return this.user.profile_image;
    return `http://127.0.0.1:8000${this.user.profile_image}`;
  }

  getGenderLabel(code?: string): string {
    if (code === 'M') return 'Mężczyzna';
    if (code === 'F') return 'Kobieta';
    if (code === 'O') return 'Inna';
    return 'Nie podano';
  }

  getGenderPreferenceLabel(code?: string): string {
    if (code === 'M') return 'Mężczyzn';
    if (code === 'F') return 'Kobiet';
    return 'Dowolnie';
  }

  getPreferredAgeLabel(): string {
    const min = this.user?.min_preferred_age;
    const max = this.user?.max_preferred_age;

    if (min && max) return `${min}-${max} lat`;
    if (min) return `Od ${min} lat`;
    if (max) return `Do ${max} lat`;
    return 'Dowolny';
  }

  private preferredAgeRangeValidator(control: AbstractControl) {
    const min = control.get('min_preferred_age')?.value;
    const max = control.get('max_preferred_age')?.value;

    if (min == null || max == null || max === '') {
      return null;
    }

    return Number(max) < Number(min) ? { preferredAgeRange: true } : null;
  }

  private getDeleteAccountError(err: any): string {
    const body = err?.error;

    if (!body) return 'Nie udało się usunąć konta.';
    if (typeof body === 'string') return body;
    if (body.detail) return String(body.detail);

    const messages = Object.values(body)
      .flat()
      .map(value => String(value));

    return messages.length ? messages.join(' ') : 'Nie udało się usunąć konta.';
  }

  goBack() {
    this.location.back();
  }

  openChat() {
    if (!this.user) return;
    this.router.navigate(['/chat'], { queryParams: { userId: this.user.id } });
  }

  removeMatch() {
    if (!this.user || this.removingMatch) return;
    if (!confirm('Usunąć parę? Rozmowa zostanie trwale usunięta.')) return;

    this.removingMatch = true;
    this.datingService.unmatch(this.user.id).subscribe({
      next: () => {
        this.removingMatch = false;
        this.isPartner = false;
        this.router.navigate(['/matches']);
      },
      error: () => {
        this.removingMatch = false;
        alert('Nie udało się usunąć pary.');
        this.cdr.detectChanges();
      },
    });
  }
}
