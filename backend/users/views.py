from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import RegisterSerializer, UserProfileSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer


class ProtectedTestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "Authorized access works", "user": request.user.email})


class UserProfileView(GenericAPIView):
    """
    Obsługuje pobieranie i edycję profilu użytkownika.
    - GET: Pobiera dane (własne lub innego użytkownika po ID).
    - PATCH: Częściowa aktualizacja (tylko własny profil).
    - PUT: Pełna aktualizacja (tylko własny profil).
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    # Parsery są kluczowe, aby Swagger pozwolił przesyłać pliki (zdjęcia) oraz JSON
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

    def get(self, request, user_id=None):
        user = self.get_object(user_id)
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def patch(self, request, user_id=None):
        """
        Edycja częściowa (np. zmiana tylko Bio lub Zdjęcia).
        """
        user = self.get_object(user_id)

        # Zabezpieczenie: Czy próbujesz edytować kogoś innego?
        if user.id != request.user.id:
            return Response({"detail": "Nie możesz edytować cudzego profilu."}, status=status.HTTP_403_FORBIDDEN)

        # partial=True pozwala przesłać tylko wybrane pola
        serializer = self.get_serializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, user_id=None):
        """
        Edycja pełna (wymaga przesłania wszystkich wymaganych pól).
        """
        user = self.get_object(user_id)

        # Zabezpieczenie
        if user.id != request.user.id:
            return Response({"detail": "Nie możesz edytować cudzego profilu."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(user, data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
