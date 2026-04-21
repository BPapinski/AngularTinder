import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-prompt',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './login-prompt.component.html',
  styleUrls: ['./login-prompt.component.css'],
})
export class LoginPromptComponent {
  @Input() title: string = 'Witaj!';
  @Input() description: string = 'Zaloguj się, aby zacząć.';
}