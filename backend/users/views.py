from django.db.models import Max
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView

from .models import User, UserPhoto
from .serializers import (
    AccountDeleteSerializer,
    RegisterSerializer,
    UserPhotoReorderSerializer,
    UserPhotoSerializer,
    UserProfileSerializer,
)
from .services import can_view_user_profile, sync_user_profile_image

MAX_USER_PHOTOS = 9


class TokenRefreshView(BaseTokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except User.DoesNotExist as err:
            raise InvalidToken("User no longer exists") from err


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer


class ProtectedTestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "Authorized access works", "user": request.user.email})


class AccountDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AccountDeleteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        request.user.delete()
        return Response({"detail": "Konto zostalo usuniete."}, status=status.HTTP_200_OK)


class UserProfileView(GenericAPIView):
    """
    Obsługuje pobieranie i edycję profilu użytkownika.
    - GET: Pobiera dane (własne lub innego użytkownika po ID).
    - PATCH: Częściowa aktualizacja (tylko własny profil).
    - PUT: Pełna aktualizacja (tylko własny profil).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, user_id=None):
        """
        Helper: zwraca obiekt użytkownika.
        - Jeśli podano user_id: szuka konkretnego usera (np. /api/users/5/).
        - Jeśli nie podano (None): zwraca zalogowanego (np. /api/users/me/).
        """
        if user_id is not None:
            return get_object_or_404(User, id=user_id)
        return self.request.user

    def ensure_can_view(self, request, user):
        if can_view_user_profile(request.user, user):
            return
        raise PermissionDenied("Nie masz dostepu do tego profilu.")

    def get(self, request, user_id=None):
        user = self.get_object(user_id)
        self.ensure_can_view(request, user)
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def patch(self, request, user_id=None):
        """
        Edycja częściowa (np. zmiana tylko Bio lub Zdjęcia).
        """
        user = self.get_object(user_id)

        if user.id != request.user.id:
            return Response(
                {"detail": "Nie możesz edytować cudzego profilu."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            user = serializer.save()
            self._sync_legacy_profile_image_upload(user, request)
            return Response(self.get_serializer(user).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, user_id=None):
        """
        Edycja pełna (wymaga przesłania wszystkich wymaganych pól).
        """
        user = self.get_object(user_id)

        if user.id != request.user.id:
            return Response(
                {"detail": "Nie możesz edytować cudzego profilu."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(user, data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            self._sync_legacy_profile_image_upload(user, request)
            return Response(self.get_serializer(user).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _sync_legacy_profile_image_upload(self, user, request):
        uploaded = request.FILES.get("profile_image")
        if not uploaded:
            return

        first_photo = user.photos.order_by("order", "id").first()
        if first_photo:
            first_photo.image = uploaded
            first_photo.save(update_fields=["image"])
        else:
            UserPhoto.objects.create(user=user, image=uploaded, order=0)
        sync_user_profile_image(user)


class UserPhotosView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, user_id=None):
        if user_id is None:
            user = request.user
        else:
            user = get_object_or_404(User, id=user_id)
            if not can_view_user_profile(request.user, user):
                raise PermissionDenied("Nie masz dostepu do tych zdjec.")

        photos = user.photos.all()
        serializer = UserPhotoSerializer(photos, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        if request.user.photos.count() >= MAX_USER_PHOTOS:
            return Response(
                {"detail": f"Mozesz dodac maksymalnie {MAX_USER_PHOTOS} zdjec."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "Brak pliku image."}, status=status.HTTP_400_BAD_REQUEST)

        max_order = request.user.photos.aggregate(max_order=Max("order"))["max_order"]
        next_order = 0 if max_order is None else max_order + 1
        photo = UserPhoto.objects.create(user=request.user, image=image, order=next_order)
        sync_user_profile_image(request.user)

        serializer = UserPhotoSerializer(photo, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserPhotoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, photo_id):
        photo = get_object_or_404(UserPhoto, id=photo_id, user=request.user)
        photo.image.delete(save=False)
        photo.delete()
        sync_user_profile_image(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserPhotosReorderView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = UserPhotoReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo_ids = serializer.validated_data["photo_ids"]

        photos = list(request.user.photos.filter(id__in=photo_ids))
        if len(photos) != len(photo_ids):
            return Response({"detail": "Nieprawidlowe identyfikatory zdjec."}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.photos.count() != len(photo_ids):
            return Response(
                {"detail": "Lista musi zawierac wszystkie zdjecia profilu."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        photo_map = {photo.id: photo for photo in photos}
        for index, photo_id in enumerate(photo_ids):
            photo_map[photo_id].order = index
        UserPhoto.objects.bulk_update(photos, ["order"])
        sync_user_profile_image(request.user)

        updated = UserPhotoSerializer(request.user.photos.all(), many=True, context={"request": request})
        return Response(updated.data)
