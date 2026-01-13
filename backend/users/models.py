from datetime import date

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Gender(models.TextChoices):
        MALE = "M", _("Mężczyzna")
        FEMALE = "F", _("Kobieta")
        OTHER = "O", _("Inna")

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50, blank=True)

    gender = models.CharField(max_length=1, choices=Gender.choices, default=Gender.MALE)
    birth_date = models.DateField(null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    profile_image = models.ImageField(
        upload_to="profile_images/",  # folder w MEDIA_ROOT
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
