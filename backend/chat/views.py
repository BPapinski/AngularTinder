from django.db.models import Q
from interactions.models import Match
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from users.models import User

from .models import ChatMessage
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

        messages = ChatMessage.objects.filter(sender__in=[user, other], receiver__in=[user, other])

        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)


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

        return Response(ChatMessageSerializer(msg).data)
