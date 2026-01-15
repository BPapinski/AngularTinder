from datetime import date

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


def user_directory_path(instance, filename):
    # Plik zapisany w: MEDIA_ROOT/profile_images/<user_id>/<filename>
    return f"profile_images/user_{instance.id}/{filename}"


class User(AbstractBaseUser, PermissionsMixin):
    class Gender(models.TextChoices):
        MALE = "M", _("Mężczyzna")
        FEMALE = "F", _("Kobieta")
        OTHER = "O", _("Inna")

    class GenderPreference(models.TextChoices):
        MALE = "M", _("Mężczyzna")
        FEMALE = "F", _("Kobieta")
        ANY = "A", _("Dowolna")

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50, blank=True)

    gender = models.CharField(max_length=1, choices=Gender.choices, default=Gender.MALE)
    gender_preference = models.CharField(max_length=1, choices=GenderPreference.choices, default=GenderPreference.ANY)

    min_preferred_age = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Minimalny wiek partnera",
    )

    max_preferred_age = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Maksymalny wiek partnera",
    )

    birth_date = models.DateField(null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    profile_image = models.ImageField(
        upload_to=user_directory_path,
        null=True,
        blank=True,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def age(self):
        if not self.birth_date:
            return None
        today = date.today()
        return (
            today.year
            - self.birth_date.year
            - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
        )
