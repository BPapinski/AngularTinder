from rest_framework import serializers

from users.models import User

from .models import ChatMessage


class UserShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "profile_image"]


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserShortSerializer(read_only=True)
    receiver = UserShortSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = "__all__"
