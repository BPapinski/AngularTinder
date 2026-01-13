from django.db import transaction
from django.db.models import Q
from .models import Interaction, Match
from users.models import User

# Funkcja do obsługi "like" i sprawdzania matchy

def perform_like(sender, receiver):
    interaction, created = Interaction.objects.update_or_create(
        user=sender,
        target_user=receiver,
        defaults={'action': Interaction.LIKE}
    )

    is_match = False
    
    # 2. Sprawdź czy druga strona też dała like
    has_liked_back = Interaction.objects.filter(
        user=receiver,
        target_user=sender,
        action__in=[Interaction.LIKE, Interaction.SUPERLIKE]
    ).exists()

    if has_liked_back:
        # 3. Sprawdź czy match już istnieje (zabezpieczenie)
        # Sortujemy ID, aby uniknąć duplikatów (A-B i B-A to ten sam match)
        u1, u2 = sorted([sender, receiver], key=lambda u: u.pk)
        
        match, match_created = Match.objects.get_or_create(
            user1=u1, 
            user2=u2
        )
        is_match = True
        
        # Tu możesz wywołać powiadomienie (np. WebSocket lub Push)
        # send_match_notification(match)

    return is_match


# Zwraca profile z którymi użytkownik nie miał jeszcze interakcji -> do wyswietlenia w feedzie

def get_dating_feed(user):
    interacted_users_ids = Interaction.objects.filter(
        user=user
    ).values_list('target_user_id', flat=True)

    profiles = User.objects.exclude(
        id__in=interacted_users_ids
    ).exclude(
        id=user.id
    )
    
    # Tutaj warto dodać logikę filtrowania po wieku, lokalizacji itp.
    return profiles