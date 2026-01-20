from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Match
from .serializers import MatchSerializer
from .services import perform_dislike, perform_like

User = get_user_model()


class LikeUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        target_user = get_object_or_404(User, pk=user_id)

        if target_user == request.user:
            return Response({"error": "You cannot like yourself"}, status=400)

        is_match = perform_like(request.user, target_user)

        return Response({"status": "liked", "is_match": is_match}, status=status.HTTP_200_OK)


class DislikeUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        target_user = get_object_or_404(User, pk=user_id)

        if target_user == request.user:
            return Response(
                {"error": "You cannot reject yourself"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        perform_dislike(request.user, target_user)

        return Response(
            {"status": "rejected", "message": "User has been skipped."},
            status=status.HTTP_200_OK,
        )


class UserMatchesView(APIView):
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Match.objects.filter(Q(user1=request.user) | Q(user2=request.user), is_active=True)

        serializer = self.serializer_class(queryset, many=True, context={"request": request})
        return Response(serializer.data)
