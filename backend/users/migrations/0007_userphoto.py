import users.models
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0006_alter_user_min_preferred_age"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserPhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to=users.models.user_photo_path)),
                ("order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="photos",
                        to="users.user",
                    ),
                ),
            ],
            options={
                "ordering": ["order", "id"],
            },
        ),
    ]
