from datetime import date

from users.models import User

from .models import Interaction, Match


def perform_like(sender, receiver):
    interaction, created = Interaction.objects.update_or_create(
        user=sender, target_user=receiver, defaults={"action": Interaction.LIKE}
    )

    is_match = False

    has_liked_back = Interaction.objects.filter(
        user=receiver,
        target_user=sender,
        action__in=[Interaction.LIKE, Interaction.SUPERLIKE],
    ).exists()

    if has_liked_back:
        u1, u2 = sorted([sender, receiver], key=lambda u: u.pk)

        match, match_created = Match.objects.get_or_create(user1=u1, user2=u2)
        is_match = True

    return is_match


def perform_dislike(sender, receiver):
    Interaction.objects.update_or_create(user=sender, target_user=receiver, defaults={"action": Interaction.DISLIKE})


def get_dating_feed(user):
    interacted_users_ids = Interaction.objects.filter(user=user).values_list("target_user_id", flat=True)

    profiles = User.objects.exclude(id__in=interacted_users_ids).exclude(id=user.id)

    if user.gender_preference != User.GenderPreference.ANY:
        profiles = profiles.filter(gender=user.gender_preference)

    today = date.today()

    if user.min_preferred_age is not None:
        max_birth_date = date(
            today.year - user.min_preferred_age,
            today.month,
            today.day,
        )
        profiles = profiles.filter(birth_date__lte=max_birth_date)

    return profiles
