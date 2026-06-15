from datetime import date

from django.core.management.base import BaseCommand
from interactions.models import Match
from interactions.services import perform_like

from users.models import User


class Command(BaseCommand):
    help = "Create sample users for testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Delete and recreate sample users (resets their data)",
        )

    def handle(self, *args, **options):
        sample_emails = [
            "admin@admin.com",
            "john@example.com",
            "anna@example.com",
            "mike@example.com",
            "sara@example.com",
            "alex@example.com",
        ]

        if options["force"]:
            deleted_count = User.objects.filter(email__in=sample_emails).delete()[0]
            if deleted_count > 0:
                self.stdout.write(self.style.WARNING(f"Deleted {deleted_count} existing sample users"))
        elif User.objects.filter(email__in=sample_emails).exists():
            self.stdout.write(self.style.SUCCESS("Sample users already exist, skipping seed."))
            return

        self.stdout.write("Starting create_sample_users command...")
        users_data = [
            {
                "email": "admin@admin.com",
                "first_name": "Admin",
                "gender": "M",
                "gender_preference": "A",
                "birth_date": date(1980, 1, 1),
                "bio": "Administrator systemu.",
                "min_preferred_age": 18,
                "max_preferred_age": 99,
                "is_staff": True,
                "is_superuser": True,
            },
            {
                "email": "john@example.com",
                "first_name": "John",
                "gender": "M",
                "gender_preference": "F",
                "birth_date": date(1990, 5, 15),
                "bio": "Lubie sport i podroze.",
                "min_preferred_age": 25,
                "max_preferred_age": 35,
            },
            {
                "email": "anna@example.com",
                "first_name": "Anna",
                "gender": "F",
                "gender_preference": "M",
                "birth_date": date(1988, 3, 22),
                "bio": "Milosniczka ksiazek i kawy.",
                "min_preferred_age": 28,
                "max_preferred_age": 40,
            },
            {
                "email": "mike@example.com",
                "first_name": "Mike",
                "gender": "M",
                "gender_preference": "A",
                "birth_date": date(1992, 7, 10),
                "bio": "Programista i entuzjasta technologii.",
                "min_preferred_age": 24,
                "max_preferred_age": 38,
            },
            {
                "email": "sara@example.com",
                "first_name": "Sara",
                "gender": "F",
                "gender_preference": "A",
                "birth_date": date(1995, 12, 5),
                "bio": "Artystka i milosniczka muzyki.",
                "min_preferred_age": 25,
                "max_preferred_age": 35,
            },
            {
                "email": "alex@example.com",
                "first_name": "Alex",
                "gender": "O",
                "gender_preference": "A",
                "birth_date": date(1993, 9, 18),
                "bio": "Podroznik i fotograf.",
                "min_preferred_age": 26,
                "max_preferred_age": 42,
            },
        ]

        for user_data in users_data:
            user, created = User.objects.get_or_create(email=user_data["email"], defaults=user_data)
            if created:
                password = "admin" if user_data["email"] == "admin@admin.com" else "password123"
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created user: {user.email}"))
            else:
                self.stdout.write(f"User already exists: {user.email}")

        john = User.objects.get(email="john@example.com")
        anna = User.objects.get(email="anna@example.com")
        mike = User.objects.get(email="mike@example.com")
        sara = User.objects.get(email="sara@example.com")

        self._ensure_match(john, anna)
        self._ensure_match(mike, sara)

        self.stdout.write(self.style.SUCCESS("Sample users creation completed!"))

    def _ensure_match(self, user_a, user_b):
        low_id, high_id = sorted([user_a.pk, user_b.pk])
        if Match.objects.filter(user1_id=low_id, user2_id=high_id, is_active=True).exists():
            self.stdout.write(f"Match already exists: {user_a.email} & {user_b.email}")
            return

        perform_like(user_a, user_b)
        perform_like(user_b, user_a)
        self.stdout.write(self.style.SUCCESS(f"Created match: {user_a.email} & {user_b.email}"))
