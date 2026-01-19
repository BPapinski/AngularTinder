import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { UserProfile } from './pages/user-profile/user-profile';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: HomeComponent },
  {path: 'profile', component: UserProfile},
  { path: 'profile/:id', component: UserProfile },
  {
  path: 'register',
  loadComponent: () =>
    import('./pages/register/register.component')
      .then(m => m.RegisterComponent)
}
];
