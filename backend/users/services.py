def sync_user_profile_image(user):
    first_photo = user.photos.order_by("order", "id").first()
    user.profile_image = first_photo.image if first_photo else None
    user.save(update_fields=["profile_image"])


def can_view_user_profile(viewer, target):
    if viewer.id == target.id:
        return True

    from interactions.models import Match

    low_id, high_id = sorted([viewer.id, target.id])
    return Match.objects.filter(user1_id=low_id, user2_id=high_id, is_active=True).exists()
