from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenVerifyView,
)

from .views import (
    AccountDeleteView,
    ProtectedTestView,
    RegisterView,
    TokenRefreshView,
    UserPhotoDetailView,
    UserPhotosReorderView,
    UserPhotosView,
    UserProfileView,
)

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", TokenObtainPairView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("token/verify/", TokenVerifyView.as_view()),
    path("protected-test/", ProtectedTestView.as_view()),
    path("me/", UserProfileView.as_view(), name="user-profile"),
    path("me/delete/", AccountDeleteView.as_view(), name="account-delete"),
    path("me/photos/", UserPhotosView.as_view(), name="user-photos"),
    path("me/photos/reorder/", UserPhotosReorderView.as_view(), name="user-photos-reorder"),
    path("me/photos/<int:photo_id>/", UserPhotoDetailView.as_view(), name="user-photo-detail"),
    path("<int:user_id>/photos/", UserPhotosView.as_view(), name="user-photos-detail"),
    path("<int:user_id>/", UserProfileView.as_view(), name="user-profile-detail"),
]
