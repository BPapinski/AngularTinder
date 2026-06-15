from django.urls import path

from .feed_views import DatingFeedView
from .views import DislikeUserView, LikeUserView, ResetMatchesView, UnmatchUserView, UserMatchesView

urlpatterns = [
    path("like/<int:user_id>/", LikeUserView.as_view(), name="like-user"),
    path("dislike/<int:user_id>/", DislikeUserView.as_view(), name="reject-user"),
    path("feed/", DatingFeedView.as_view(), name="dating-feed"),
    path("matches/", UserMatchesView.as_view(), name="user-matches"),
    path("unmatch/<int:user_id>/", UnmatchUserView.as_view(), name="unmatch-user"),
    path("reset/", ResetMatchesView.as_view(), name="reset-matches"),
]
