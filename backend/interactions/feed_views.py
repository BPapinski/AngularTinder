from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .services import get_dating_feed
from .serializers import DatingCardSerializer

class DatingFeedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    
    # Zwraca 20 profili z którymi użytkownik nie miał jeszcze interakcji -> do wyswietlenia w feedzie
    # jak przeleci przez te 20 profili trzeba kolejny raz wysłać zapytanie - uztkownik dostanie kolejne 20 profili
    def get(self, request):
        candidates = get_dating_feed(request.user)

        # 2. Optymalizacja i Limitowanie (Pagination)
        # Nie chcemy wysyłać 1000 użytkowników na raz. 
        # Bierzemy np. pierwszych 20.
        # select_related/prefetch_related użyj jeśli masz osobne tabele na zdjęcia/zainteresowania
        candidates_batch = candidates[:20]

        if not candidates_batch:
             return Response(
                 {"message": "No more profiles available."}, 
                 status=status.HTTP_200_OK
             )

        serializer = DatingCardSerializer(candidates_batch, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)