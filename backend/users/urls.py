from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

from .views import ProtectedTestView, RegisterView, UserProfileView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", TokenObtainPairView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("token/verify/", TokenVerifyView.as_view()),
    path("protected-test/", ProtectedTestView.as_view()),
    path("me/", UserProfileView.as_view(), name="user-profile"),
]
