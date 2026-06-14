from rest_framework import serializers
from users.models import User

from .models import ChatMessage, ChatMessageReaction


class UserShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "profile_image"]


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserShortSerializer(read_only=True)
    receiver = UserShortSerializer(read_only=True)
    reactions = serializers.SerializerMethodField()
    my_reaction = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = "__all__"

    def get_reactions(self, obj):
        return ChatMessageReactionSerializer(obj.reactions.select_related("user"), many=True).data

    def get_my_reaction(self, obj):
        request = self.context.get("request")
        if not request or not request.user or request.user.is_anonymous:
            return None

        reaction = obj.reactions.filter(user=request.user).first()
        return reaction.reaction if reaction else None


class ChatMessageReactionSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_name = serializers.CharField(source="user.first_name", read_only=True)

    class Meta:
        model = ChatMessageReaction
        fields = ["id", "user_id", "user_name", "reaction", "created_at", "updated_at"]
