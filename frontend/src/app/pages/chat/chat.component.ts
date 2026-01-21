import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  matches$: Observable<any[]> | null = null;
  messages: any[] = [];
  selectedUser: any = null;
  newMessage = '';

  private readonly BACKEND_URL = 'http://localhost:8000';

  // Do obsługi subskrypcji strumienia wiadomości
  private messagesSubscription: Subscription | null = null;

  // Do autoscrolla
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.chatService.getMatches().subscribe(res => {
      // this.matches = res;
      console.log('👥 Pobrani rozmówcy:', this.matches$);
    });

    this.matches$ = this.chatService.getMatches();

    // Globalny nasłuch na nowe wiadomości z serwisu
    this.messagesSubscription = this.chatService.messages$.subscribe(msg => {
      this.messages.push(msg);
      this.scrollToBottom();
    });
  }

  ngAfterViewChecked() {
    // Opcjonalnie: automatyczne przewijanie w dół przy wejściu
    // this.scrollToBottom();
  }

  getProfileImage(path: string | null): string {
    if(!path) return 'public/assets/placeholder-user.png';
    if (path.startsWith('http')) return path;
    return `${this.BACKEND_URL}${path}`;
  }

  selectUser(user: any) {
    if (this.selectedUser?.id === user.id) return;
    this.selectedUser = user;
    this.messages = [];

    this.chatService.getMessagesHistory(user.id).subscribe(res => {
      this.messages = res;
      this.scrollToBottom();
    });

    this.chatService.connect(user.id);
  }

  send() {
    if (!this.newMessage.trim()) return;
    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

  scrollToBottom(): void {
    try {
      // Małe opóźnienie, aby Angular zdążył wyrenderować nowy element w DOM
      setTimeout(() => {
        if (this.messagesContainer) {
          this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
        }
      }, 50);
    } catch(err) { }
  }

  ngOnDestroy() {
    // Sprzątanie połączeń przy wyjściu z czatu
    this.chatService.disconnect();
    if (this.messagesSubscription) {
      this.messagesSubscription.unsubscribe();
    }
  }
}
