import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { UserProfileComponent } from './pages/user-profile/user-profile';
import { MatchesComponent } from './pages/matches/matches.component';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: HomeComponent },
  {path: 'profile', component: UserProfileComponent},
  { path: 'profile/:id', component: UserProfileComponent },
  {path: 'matches', component: MatchesComponent},
  {
  path: 'register',
  loadComponent: () =>
    import('./pages/register/register.component')
      .then(m => m.RegisterComponent)
}
];
