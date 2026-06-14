from datetime import date

from interactions.models import Match
from rest_framework import serializers

from .models import User, UserPhoto
from .services import sync_user_profile_image


class UserPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = UserPhoto
        fields = ["id", "order", "image", "created_at"]
        read_only_fields = ["id", "order", "created_at"]

    def get_image(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        if obj.image:
            return obj.image.url
        return None


class UserPhotoReorderSerializer(serializers.Serializer):
    photo_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )


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

    def validate(self, attrs):
        min_age = attrs.get("min_preferred_age")
        max_age = attrs.get("max_preferred_age")

        if min_age is None:
            min_age = 18

        if min_age < 18:
            raise serializers.ValidationError({"min_preferred_age": "Minimalny wiek musi wynosic co najmniej 18."})

        if max_age is not None and max_age < 18:
            raise serializers.ValidationError({"max_preferred_age": "Maksymalny wiek musi wynosic co najmniej 18."})

        if max_age is not None and max_age < min_age:
            raise serializers.ValidationError(
                {"max_preferred_age": "Maksymalny wiek nie moze byc mniejszy niz minimalny."}
            )

        attrs["min_preferred_age"] = min_age
        return attrs

    def create(self, validated_data):
        profile_image = validated_data.pop("profile_image", None)
        user = User.objects.create_user(**validated_data)
        if profile_image:
            UserPhoto.objects.create(user=user, image=profile_image, order=0)
            sync_user_profile_image(user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()
    photos = serializers.SerializerMethodField()
    is_match = serializers.SerializerMethodField()

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
            "photos",
            "is_match",
            "gender_preference",
            "min_preferred_age",
            "max_preferred_age",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "email", "photos", "is_match"]

    def get_photos(self, obj):
        return UserPhotoSerializer(obj.photos.all(), many=True, context=self.context).data

    def get_is_match(self, obj):
        request = self.context.get("request")
        if not request or not getattr(request.user, "is_authenticated", False):
            return False

        viewer_id = request.user.id
        if viewer_id == obj.id:
            return False

        low_id, high_id = sorted([viewer_id, obj.id])
        return Match.objects.filter(user1_id=low_id, user2_id=high_id, is_active=True).exists()

    def to_internal_value(self, data):
        data = data.copy()
        for field in ("min_preferred_age", "max_preferred_age"):
            if data.get(field) == "":
                data[field] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        min_age = attrs.get("min_preferred_age", getattr(self.instance, "min_preferred_age", None))
        max_age = attrs.get("max_preferred_age", getattr(self.instance, "max_preferred_age", None))

        if min_age is not None and min_age < 18:
            raise serializers.ValidationError({"min_preferred_age": "Minimalny wiek musi wynosic co najmniej 18."})

        if max_age is not None and max_age < 18:
            raise serializers.ValidationError({"max_preferred_age": "Maksymalny wiek musi wynosic co najmniej 18."})

        if min_age is not None and max_age is not None and max_age < min_age:
            raise serializers.ValidationError(
                {"max_preferred_age": "Maksymalny wiek nie moze byc mniejszy niz minimalny."}
            )

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if request and getattr(request.user, "is_authenticated", False) and instance.id != request.user.id:
            for field in ("email", "gender_preference", "min_preferred_age", "max_preferred_age"):
                data.pop(field, None)
        return data


class AccountDeleteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context["request"].user

        if attrs["email"].lower() != user.email.lower():
            raise serializers.ValidationError({"email": "Podany email nie pasuje do konta."})

        if not user.check_password(attrs["password"]):
            raise serializers.ValidationError({"password": "Podane haslo jest nieprawidlowe."})

        return attrs
