from django.conf import settings
from django.db import models


class ChatMessage(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_messages",
    )
    content = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender} -> {self.receiver}: {self.content[:30]}"


class ChatMessageReaction(models.Model):
    class Reaction(models.TextChoices):
        THUMBS_UP = "thumbs_up", "Lapka w gore"
        THUMBS_DOWN = "thumbs_down", "Lapka w dol"
        HEART = "heart", "Serduszko"
        LAUGH = "laugh", "Smiech"

    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_reactions")
    reaction = models.CharField(max_length=20, choices=Reaction.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("message", "user")
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user} reacted {self.reaction} to message {self.message_id}"
