import json
import traceback

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or self.user.is_anonymous:
            await self.close(code=4001)
            return

        self.group_name = f"notifications_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def new_message_notification(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "new_message",
                    "from_user_id": event["from_user_id"],
                    "from_user_name": event["from_user_name"],
                }
            )
        )

    async def new_match_notification(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "new_match",
                    "with_user_id": event["with_user_id"],
                    "with_user_name": event["with_user_name"],
                }
            )
        )


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.user = self.scope.get("user")

            if not self.user or self.user.is_anonymous:
                print("Odrzucono połączenie: Brak autoryzacji lub zły token")
                await self.close(code=4001)
                return

            self.other_id = self.scope["url_route"]["kwargs"]["user_id"]
            user_id = int(self.user.id)
            other_id = int(self.other_id)

            self.room_group_name = f"chat_{min(user_id, other_id)}_{max(user_id, other_id)}"

            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            print(f"DEBUG: Użytkownik {self.user.email} (ID: {self.user.id}) połączony!")

        except Exception as e:
            print("CRITICAL ERROR IN CONNECT:", e)
            traceback.print_exc()
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            content = data.get("content")
            print(f"DEBUG RECEIVE: Użytkownik {self.user.id} wysłał: {content}")

            msg = await self.create_message(self.user.id, self.other_id, content)
            print(f"DEBUG: Wiadomość zapisana w DB, ID: {msg.id}")

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "message": {
                        "id": msg.id,
                        "sender": {
                            "id": self.user.id,
                            "first_name": self.user.first_name,
                        },
                        "receiver": self.other_id,
                        "content": msg.content,
                        "created_at": msg.created_at.isoformat(),
                    },
                },
            )
            print(f"DEBUG: Wiadomość rozesłana do grupy: {self.room_group_name}")

            await self.channel_layer.group_send(
                f"notifications_{self.other_id}",
                {
                    "type": "new_message_notification",
                    "from_user_id": self.user.id,
                    "from_user_name": self.user.first_name,
                },
            )
        except Exception as e:
            print(f"ERROR IN RECEIVE: {e}")
            traceback.print_exc()

    async def chat_message(self, event):
        print(f"DEBUG CHAT_MESSAGE: Wysyłam wiadomość dla kanału {self.channel_name}: {event['message']}")
        await self.send(text_data=json.dumps(event["message"]))

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
