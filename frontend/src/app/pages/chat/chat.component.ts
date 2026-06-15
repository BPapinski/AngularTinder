import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
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
  reactionOptions = [
    { key: 'thumbs_up', label: '👍' },
    { key: 'thumbs_down', label: '👎' },
    { key: 'heart', label: '❤️' },
    { key: 'laugh', label: '😂' },
  ];

  private messagesSubscription: Subscription | null = null;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    protected notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.matches$ = this.chatService.getMatches();

    this.messagesSubscription = this.chatService.messages$.subscribe(msg => {
      if (!this.selectedUser) return;

      if (msg._event === 'reaction') {
        this.applyReactionUpdate(msg);
        return;
      }

      const senderId = Number(msg.sender?.id);
      const receiverId = Number(msg.receiver);
      const selectedUserId = Number(this.selectedUser.id);
      const isRelevant = senderId === selectedUserId || receiverId === selectedUserId;

      if (!isRelevant) return;
      if (msg.id && this.messages.some(m => m.id === msg.id)) return;

      const me = this.authService.currentUser();
      msg.is_me = me ? senderId === me.id : false;

      this.messages.push(this.normalizeMessageForView(msg));
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

  openPartnerProfile() {
    if (!this.selectedUser) return;
    this.router.navigate(['/profile', this.selectedUser.id], {
      state: { fromMatch: true },
    });
  }

  selectUser(user: any) {
    if (this.selectedUser?.id === user.id) return;
    this.selectedUser = user;
    this.messages = [];
    this.notificationService.activeChatUserId.set(user.id);
    this.notificationService.markRead(user.id);

    this.chatService.getMessagesHistory(user.id).subscribe(res => {
      const me = this.authService.currentUser();

      this.messages = res.map(msg => this.normalizeMessageForView(msg, me?.id));

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

  toggleReaction(message: any, reaction: string) {
    if (!message?.id) return;

    const request$ = message.my_reaction === reaction
      ? this.chatService.removeReaction(message.id)
      : this.chatService.setReaction(message.id, reaction);

    request$.subscribe({
      next: (updatedMessage) => this.replaceMessage(this.normalizeMessageForView(updatedMessage)),
      error: (err) => console.error('Failed to update reaction:', err),
    });
  }

  getReactionLabel(reaction: string): string {
    return this.reactionOptions.find(option => option.key === reaction)?.label || reaction;
  }

  getVisibleReactions(message: any): string[] {
    const reactions = message.reactions || [];
    return Array.from(new Set(reactions.map((item: any) => item.reaction)));
  }

  getReactionCount(message: any, reaction: string): number {
    return (message.reactions || []).filter((item: any) => item.reaction === reaction).length;
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

  private normalizeMessageForView(message: any, currentUserId?: number) {
    const me = this.authService.currentUser();
    const meId = currentUserId ?? me?.id;
    const senderId = message.sender?.id;

    return {
      ...message,
      reactions: message.reactions || [],
      my_reaction: message.my_reaction || null,
      is_me: meId ? senderId === meId : message.is_me || false,
    };
  }

  private replaceMessage(updatedMessage: any) {
    const index = this.messages.findIndex(message => message.id === updatedMessage.id);
    if (index === -1) return;

    this.messages[index] = {
      ...this.messages[index],
      ...updatedMessage,
    };
    this.cdr.detectChanges();
  }

  private applyReactionUpdate(update: any) {
    const index = this.messages.findIndex(message => message.id === update.id);
    if (index === -1) return;

    const me = this.authService.currentUser();
    const myReaction = update.reactions?.find((item: any) => Number(item.user_id) === Number(me?.id))?.reaction ?? null;

    this.messages[index] = {
      ...this.messages[index],
      reactions: update.reactions || [],
      my_reaction: myReaction,
    };
    this.cdr.detectChanges();
  }
}
