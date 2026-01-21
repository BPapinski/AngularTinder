import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

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

  private messagesSubscription: Subscription | null = null;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private route: ActivatedRoute,
  ) {}

  get currentUser() {
    return this.authService.currentUser();
  }

  ngOnInit() {
    this.matches$ = this.chatService.getMatches();

    this.messagesSubscription = this.chatService.messages$.subscribe(msg => {
      if (!this.selectedUser) {
        console.log('⏭️ Brak wybranego użytkownika, pomijam wiadomość');
        return;
      }

      const senderId = msg.sender?.id;
      const receiverId = Number(msg.receiver);
      const selectedUserId = this.selectedUser.id;

      const isRelevant = senderId === selectedUserId || receiverId === selectedUserId;

      if (!isRelevant) {
        console.log('⏭️ Wiadomość nie dotyczy wybranego użytkownika, pomijam');
        return;
      }

      const userIdFromUrl = this.route.snapshot.queryParams['userId'];

      if (userIdFromUrl && this.matches$) {
        const userToSelect$ = this.matches$.pipe(
          map((matches$: any[]) => matches$.find(m => m.id == userIdFromUrl))
        );

        if (userToSelect$) {
          this.selectUser(userToSelect$);
        }
      }

      const me = this.authService.currentUser();
      msg.is_me = me ? msg.sender?.id === me.id : false;

      console.log('✅ Dodaję wiadomość do tablicy:', msg);
      this.messages.push(msg);
      this.cdr.detectChanges();
      this.scrollToBottom();
    });
  }

  ngAfterViewChecked() {
  }

  getProfileImage(path: string | null): string {
    if(!path) return '/assets/placeholder-user.png';
    if (path.startsWith('http')) return path;
    return `${this.BACKEND_URL}${path}`;
  }

  selectUser(user: any) {
    if (this.selectedUser?.id === user.id) return;
    this.selectedUser = user;
    this.messages = [];



    this.chatService.getMessagesHistory(user.id).subscribe(res => {
      const me = this.authService.currentUser();

      this.messages = res.map(msg => ({
        ...msg,
        is_me: me ? msg.sender.id === me.id : false
      }));

      this.cdr.detectChanges();
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
      setTimeout(() => {
        if (this.messagesContainer) {
          this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
        }
      }, 50);
    } catch(err) { }
  }

  ngOnDestroy() {
    this.chatService.disconnect();
    if (this.messagesSubscription) {
      this.messagesSubscription.unsubscribe();
    }
  }
}
