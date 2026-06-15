from asgiref.sync import async_to_sync
from django.db.models import Q
from django.shortcuts import get_object_or_404
from interactions.models import Match
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from users.models import User

from .broadcast import broadcast_chat_message, broadcast_message_reaction
from .models import ChatMessage, ChatMessageReaction
from .serializers import ChatMessageSerializer, UserShortSerializer


class MyMatchesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        matches = Match.objects.filter(is_active=True).filter(Q(user1=user) | Q(user2=user))

        users = []
        for m in matches:
            other = m.user2 if m.user1 == user else m.user1
            users.append(other)

        serializer = UserShortSerializer(users, many=True)
        return Response(serializer.data)


class ChatMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        user = request.user
        other = User.objects.get(id=user_id)

        if (
            not Match.objects.filter(is_active=True)
            .filter(Q(user1=user, user2=other) | Q(user1=other, user2=user))
            .exists()
        ):
            raise PermissionDenied("No match")

        ChatMessage.objects.filter(sender=other, receiver=user, is_read=False).update(is_read=True)

        messages = ChatMessage.objects.filter(sender__in=[user, other], receiver__in=[user, other])

        serializer = ChatMessageSerializer(messages, many=True, context={"request": request})
        return Response(serializer.data)


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = ChatMessage.objects.filter(receiver=request.user, is_read=False).count()
        return Response({"unread": count})


class UnreadPerUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Count

        rows = (
            ChatMessage.objects.filter(receiver=request.user, is_read=False)
            .values("sender_id", "sender__first_name")
            .annotate(count=Count("id"))
        )
        return Response(
            [
                {"user_id": row["sender_id"], "user_name": row["sender__first_name"], "count": row["count"]}
                for row in rows
            ]
        )


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        updated = ChatMessage.objects.filter(sender_id=user_id, receiver=request.user, is_read=False).update(
            is_read=True
        )
        return Response({"marked_read": updated})


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sender = request.user
        receiver_id = request.data.get("receiver_id")
        content = request.data.get("content")

        receiver = User.objects.get(id=receiver_id)

        if (
            not Match.objects.filter(is_active=True)
            .filter(Q(user1=sender, user2=receiver) | Q(user1=receiver, user2=sender))
            .exists()
        ):
            raise PermissionDenied("No match")

        msg = ChatMessage.objects.create(sender=sender, receiver=receiver, content=content)

        async_to_sync(broadcast_chat_message)(msg, sender, receiver.id)

        return Response(ChatMessageSerializer(msg, context={"request": request}).data)


class MessageReactionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        message = get_object_or_404(ChatMessage, id=message_id)
        self._check_participant(request.user, message)

        reaction = request.data.get("reaction")
        valid_reactions = {choice[0] for choice in ChatMessageReaction.Reaction.choices}
        if reaction not in valid_reactions:
            return Response({"reaction": "Nieprawidlowa reakcja."}, status=status.HTTP_400_BAD_REQUEST)

        ChatMessageReaction.objects.update_or_create(
            message=message,
            user=request.user,
            defaults={"reaction": reaction},
        )

        message.refresh_from_db()
        broadcast_message_reaction(message)
        return Response(ChatMessageSerializer(message, context={"request": request}).data)

    def delete(self, request, message_id):
        message = get_object_or_404(ChatMessage, id=message_id)
        self._check_participant(request.user, message)

        ChatMessageReaction.objects.filter(message=message, user=request.user).delete()
        message.refresh_from_db()
        broadcast_message_reaction(message)
        return Response(ChatMessageSerializer(message, context={"request": request}).data)

    def _check_participant(self, user, message):
        if message.sender_id != user.id and message.receiver_id != user.id:
            raise PermissionDenied("Nie mozesz reagowac na te wiadomosc.")
