from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenVerifyView,
)

from .views import AccountDeleteView, ProtectedTestView, RegisterView, TokenRefreshView, UserProfileView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", TokenObtainPairView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("token/verify/", TokenVerifyView.as_view()),
    path("protected-test/", ProtectedTestView.as_view()),
    path("me/", UserProfileView.as_view(), name="user-profile"),
    path("me/delete/", AccountDeleteView.as_view(), name="account-delete"),
    path("<int:user_id>/", UserProfileView.as_view(), name="user-profile-detail"),
]
