from django.urls import path
from .views import LikeUserView, DislikeUserView

urlpatterns = [
    path('like/<int:user_id>/', LikeUserView.as_view(), name='like-user'),
    path('dislike/<int:user_id>/', DislikeUserView.as_view(), name='reject-user'),
]
