from django.contrib import admin

from .models import ChatMessage, ChatMessageReaction

admin.site.register(ChatMessage)
admin.site.register(ChatMessageReaction)
