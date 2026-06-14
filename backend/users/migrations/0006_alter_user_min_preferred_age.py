# Generated manually to set the default preferred minimum age.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_alter_user_profile_image"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="min_preferred_age",
            field=models.PositiveSmallIntegerField(
                blank=True,
                default=18,
                help_text="Minimalny wiek partnera",
                null=True,
            ),
        ),
    ]
