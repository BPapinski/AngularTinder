from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
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

        if is_match:
            channel_layer = get_channel_layer()
            for user, other in [(request.user, target_user), (target_user, request.user)]:
                async_to_sync(channel_layer.group_send)(
                    f"notifications_{user.id}",
                    {
                        "type": "new_match_notification",
                        "with_user_id": other.id,
                        "with_user_name": other.first_name,
                    },
                )

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
        print(f"[DEBUG] User {request.user.id} has {queryset.count()} matches")

        serializer = self.serializer_class(queryset, many=True, context={"request": request})
        return Response(serializer.data)


class ResetMatchesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        from interactions.models import Interaction

        deleted_matches = Match.objects.filter(Q(user1=request.user) | Q(user2=request.user)).delete()[0]

        deleted_interactions = Interaction.objects.filter(Q(user=request.user) | Q(target_user=request.user)).delete()[
            0
        ]

        return Response(
            {
                "deleted_matches": deleted_matches,
                "deleted_interactions": deleted_interactions,
            }
        )
