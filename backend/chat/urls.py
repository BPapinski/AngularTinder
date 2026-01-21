from django.urls import path

from .views import ChatMessagesView, MyMatchesView, SendMessageView

urlpatterns = [
    path("matches/", MyMatchesView.as_view()),
    path("messages/<int:user_id>/", ChatMessagesView.as_view()),
    path("send/", SendMessageView.as_view()),
]
