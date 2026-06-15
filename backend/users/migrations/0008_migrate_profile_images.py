from django.db import migrations


def migrate_profile_images_to_photos(apps, schema_editor):
    User = apps.get_model("users", "User")
    UserPhoto = apps.get_model("users", "UserPhoto")

    for user in User.objects.exclude(profile_image="").exclude(profile_image__isnull=True):
        if user.profile_image and not UserPhoto.objects.filter(user_id=user.id).exists():
            UserPhoto.objects.create(user_id=user.id, image=user.profile_image, order=0)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0007_userphoto"),
    ]

    operations = [
        migrations.RunPython(migrate_profile_images_to_photos, migrations.RunPython.noop),
    ]
