import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  matches: any[] = [];
  messages: any[] = [];
  selectedUser: any = null;
  newMessage = '';

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.chatService.getMatches().subscribe(res => {
      this.matches = res.length ? res : this.mockMatches();
    });
  }

  selectUser(user: any) {
    this.selectedUser = user;
    this.chatService.getMessages(user.id).subscribe(res => {
      this.messages = res.length ? res : this.mockMessages();
    });
  }

  send() {
    if (!this.newMessage.trim()) return;

    this.chatService.sendMessage(this.selectedUser.id, this.newMessage)
      .subscribe(msg => {
        this.messages.push(msg);
        this.newMessage = '';
      });
  }

  mockMatches() {
    return [
      { id: 1, first_name: 'Anna' },
      { id: 2, first_name: 'Kasia' }
    ];
  }

  mockMessages() {
    return [
      { sender: { first_name: 'Anna' }, content: 'Hej 😊' },
      { sender: { first_name: 'Ty' }, content: 'Cześć!' }
    ];
  }
}
