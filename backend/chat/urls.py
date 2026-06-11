from django.urls import path

from .views import ChatMessagesView, MarkReadView, MyMatchesView, SendMessageView, UnreadCountView, UnreadPerUserView

urlpatterns = [
    path("matches/", MyMatchesView.as_view()),
    path("messages/<int:user_id>/", ChatMessagesView.as_view()),
    path("send/", SendMessageView.as_view()),
    path("unread/", UnreadCountView.as_view()),
    path("unread-per-user/", UnreadPerUserView.as_view()),
    path("mark-read/<int:user_id>/", MarkReadView.as_view()),
]
