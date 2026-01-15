import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export interface DatingProfile {
  id: number;
  first_name: string;
  age: number;
  gender: string;
  bio: string;
  profile_image?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DatingService {
  private feedUrl = 'http://localhost:8000/api/interactions/feed/';

  constructor(private auth: AuthService) {}

  getFeed() {
    return this.auth.authFetch<DatingProfile[]>(this.feedUrl);
  }
}
