from datetime import date

from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    age = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
            "first_name",
            "gender",
            "gender_preference",
            "birth_date",
            "bio",
            "profile_image",
            "min_preferred_age",
            "max_preferred_age",
            "age",
        )
        extra_kwargs = {
            "first_name": {"required": True},
            "birth_date": {"required": True},
        }

    def validate_birth_date(self, value):
        """
        Sprawdza, czy użytkownik ma ukończone 18 lat.
        """
        if value:
            today = date.today()
            age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
            if age < 18:
                raise serializers.ValidationError("Musisz mieć ukończone 18 lat, aby się zarejestrować.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "gender",
            "birth_date",
            "age",
            "bio",
            "profile_image",
            "gender_preference",
            "min_preferred_age",
            "max_preferred_age",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "email"]

    def to_internal_value(self, data):
        data = data.copy()
        for field in ("min_preferred_age", "max_preferred_age"):
            if data.get(field) == "":
                data[field] = None
        return super().to_internal_value(data)
