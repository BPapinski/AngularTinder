from datetime import date, timedelta

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


def perform_unmatch(user, other_user):
    from django.db.models import Q

    from chat.models import ChatMessage

    u1, u2 = sorted([user, other_user], key=lambda u: u.pk)
    Match.objects.filter(user1=u1, user2=u2).delete()

    Interaction.objects.filter(user=user, target_user=other_user).delete()
    Interaction.objects.filter(user=other_user, target_user=user).delete()

    ChatMessage.objects.filter(Q(sender=user, receiver=other_user) | Q(sender=other_user, receiver=user)).delete()


def get_dating_feed(user):
    interacted_users_ids = Interaction.objects.filter(user=user).values_list("target_user_id", flat=True)

    profiles = User.objects.exclude(id__in=interacted_users_ids).exclude(id=user.id)

    if user.gender_preference != User.GenderPreference.ANY:
        profiles = profiles.filter(gender=user.gender_preference)

    today = date.today()

    if user.min_preferred_age is not None:
        max_birth_date = subtract_years(today, user.min_preferred_age)
        profiles = profiles.filter(birth_date__lte=max_birth_date)

    if user.max_preferred_age is not None:
        min_birth_date = subtract_years(today, user.max_preferred_age + 1) + timedelta(days=1)
        profiles = profiles.filter(birth_date__gte=min_birth_date)

    return profiles.prefetch_related("photos")


def subtract_years(value, years):
    try:
        return value.replace(year=value.year - years)
    except ValueError:
        return value.replace(year=value.year - years, day=28)
