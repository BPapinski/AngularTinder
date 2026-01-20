from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import ChatMessage
from .serializers import ChatMessageSerializer, UserShortSerializer
from interactions.models import Match
from users.models import User


class MyMatchesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        matches = Match.objects.filter(is_active=True).filter(
            user1=user
        ) | Match.objects.filter(is_active=True).filter(user2=user)

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

        messages = ChatMessage.objects.filter(
            sender__in=[user, other],
            receiver__in=[user, other]
        )

        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sender = request.user
        receiver_id = request.data.get("receiver_id")
        content = request.data.get("content")

        receiver = User.objects.get(id=receiver_id)

        msg = ChatMessage.objects.create(
            sender=sender,
            receiver=receiver,
            content=content
        )

        return Response(ChatMessageSerializer(msg).data)
