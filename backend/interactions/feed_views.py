from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import DatingCardSerializer
from .services import get_dating_feed


class DatingFeedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        candidates = get_dating_feed(request.user)

        candidates_batch = candidates[:20]

        if not candidates_batch:
            return Response({"message": "No more profiles available."}, status=status.HTTP_200_OK)

        serializer = DatingCardSerializer(candidates_batch, many=True, context={"request": request})

        return Response(serializer.data, status=status.HTTP_200_OK)
