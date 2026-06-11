import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  matches$: Observable<any[]> | null = null;
  messages: any[] = [];
  selectedUser: any = null;
  newMessage = '';

  private messagesSubscription: Subscription | null = null;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private route: ActivatedRoute,
    protected notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.matches$ = this.chatService.getMatches();

    this.messagesSubscription = this.chatService.messages$.subscribe(msg => {
      if (!this.selectedUser) return;

      const senderId = msg.sender?.id;
      const receiverId = Number(msg.receiver);
      const selectedUserId = this.selectedUser.id;
      const isRelevant = senderId === selectedUserId || receiverId === selectedUserId;

      if (!isRelevant) return;
      if (msg.id && this.messages.some(m => m.id === msg.id)) return;

      const me = this.authService.currentUser();
      msg.is_me = me ? senderId === me.id : false;

      this.messages.push(msg);
      this.cdr.detectChanges();
      this.scrollToBottom();

      if (!msg.is_me) {
        this.notificationService.markRead(senderId);
        this.chatService.markRead(senderId);
      }
    });

    const userIdFromUrl = this.route.snapshot.queryParams['userId'];
    if (userIdFromUrl) {
      this.chatService.getMatches().subscribe(matches => {
        const user = matches.find(m => m.id == userIdFromUrl);
        if (user) this.selectUser(user);
      });
    }
  }

  getProfileImage(path: string | null): string {
    if (!path) return '/assets/placeholder-user.svg';
    if (path.startsWith('http')) return path;
    return `${environment.apiUrl.replace('/api', '')}${path}`;
  }

  goBack() {
    this.chatService.disconnect();
    this.notificationService.activeChatUserId.set(null);
    this.selectedUser = null;
    this.messages = [];
  }

  selectUser(user: any) {
    if (this.selectedUser?.id === user.id) return;
    this.selectedUser = user;
    this.messages = [];
    this.notificationService.activeChatUserId.set(user.id);
    this.notificationService.markRead(user.id);

    this.chatService.getMessagesHistory(user.id).subscribe(res => {
      const me = this.authService.currentUser();

      this.messages = res.map(msg => ({
        ...msg,
        is_me: me ? msg.sender.id === me.id : false
      }));

      this.cdr.detectChanges();
      this.scrollToBottom();
      this.notificationService.refresh();
    });

    this.chatService.connect(user.id);
  }

  send() {
    if (!this.newMessage.trim()) return;
    this.chatService.sendMessage(this.newMessage);
    this.newMessage = '';
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  ngOnDestroy() {
    this.chatService.disconnect();
    this.notificationService.activeChatUserId.set(null);
    this.messagesSubscription?.unsubscribe();
  }
}
