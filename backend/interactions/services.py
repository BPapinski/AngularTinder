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
    
    has_liked_back = Interaction.objects.filter(
        user=receiver,
        target_user=sender,
        action__in=[Interaction.LIKE, Interaction.SUPERLIKE]
    ).exists()

    if has_liked_back:
        u1, u2 = sorted([sender, receiver], key=lambda u: u.pk)
        
        match, match_created = Match.objects.get_or_create(
            user1=u1, 
            user2=u2
        )
        is_match = True
        
        # Tu możesz wywołać powiadomienie (np. WebSocket lub Push)
        # send_match_notification(match)

    return is_match


# do wykonania "dislike"
def perform_dislike(sender, receiver):
    Interaction.objects.update_or_create(
        user=sender,
        target_user=receiver,
        defaults={'action': Interaction.DISLIKE}
    )



# Funkcja do pobierania feedu randkowego

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