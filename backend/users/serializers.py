from datetime import date

from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
            "first_name",
            "gender",
            "birth_date",
            "bio",
            "profile_image",
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
            "gender_preference",
            "birth_date",
            "age",
            "min_preferred_age",
            "max_preferred_age",
            "bio",
            "profile_image",
            "created_at",
        ]
        read_only_fields = ["id", "email", "age", "created_at"]

    def validate(self, attrs):
        min_age = attrs.get("min_preferred_age", getattr(self.instance, "min_preferred_age", None))
        max_age = attrs.get("max_preferred_age", getattr(self.instance, "max_preferred_age", None))

        if min_age is not None and max_age is not None and min_age > max_age:
            raise serializers.ValidationError(
                {"min_preferred_age": "Minimalny wiek nie może być większy niż maksymalny."}
            )

        birth_date = attrs.get("birth_date", getattr(self.instance, "birth_date", None))
        if birth_date:
            from datetime import date

            today = date.today()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            if age < 18:
                raise serializers.ValidationError({"birth_date": "Musisz mieć co najmniej 18 lat."})
            if age > 120:
                raise serializers.ValidationError({"birth_date": "Podana data urodzenia jest nieprawidłowa."})

        return attrs
