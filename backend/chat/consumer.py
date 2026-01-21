import json
import traceback

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.user = self.scope.get("user")

            # Logika Fake Usera (dla testów bez ciasteczek)
            if not self.user or self.user.is_anonymous:
                self.user = type("FakeUser", (), {"id": 1, "is_anonymous": False})()

            # Pobieranie ID z URL
            self.other_id = self.scope["url_route"]["kwargs"]["user_id"]

            # Tworzenie nazwy grupy
            # UWAGA: Upewnij się, że self.other_id to int lub rzutuj na int
            user_id = int(self.user.id)
            other_id = int(self.other_id)

            self.room_group_name = f"chat_{min(user_id, other_id)}_{max(user_id, other_id)}"

            print(f"DEBUG: Próba dołączenia do grupy {self.room_group_name}...")  # Log debugowania

            # Dołączanie do grupy (Tu często pada błąd Redisa)
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)

            print("DEBUG: Grupa dodana, akceptuję połączenie...")
            await self.accept()
            print("DEBUG: POŁĄCZONO!")

        except Exception as e:
            # To pozwoli Ci zobaczyć w logach Dockera co naprawdę się stało
            print("CRITICAL ERROR IN CONNECT:", e)
            traceback.print_exc()
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        content = data.get("content")

        msg = await self.create_message(self.user.id, self.other_id, content)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": {
                    "id": msg.id,
                    "sender": self.user.id,
                    "receiver": self.other_id,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                },
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    # --- wszystkie ORM-owe wywołania w metodach ---
    @database_sync_to_async
    def check_match(self, u1, u2):
        from django.db.models import Q
        from interactions.models import Match

        return (
            Match.objects.filter(is_active=True)
            .filter(Q(user1_id=u1, user2_id=u2) | Q(user1_id=u2, user2_id=u1))
            .exists()
        )

    @database_sync_to_async
    def create_message(self, sender_id, receiver_id, content):
        from .models import ChatMessage

        return ChatMessage.objects.create(sender_id=sender_id, receiver_id=receiver_id, content=content)
