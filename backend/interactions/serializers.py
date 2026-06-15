from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Match

User = get_user_model()


class DatingCardSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)
    profile_image = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "first_name", "age", "gender", "bio", "profile_image", "photos"]

    def get_profile_image(self, obj):
        request = self.context.get("request")
        first_photo = obj.photos.order_by("order", "id").first()
        if first_photo and request:
            return request.build_absolute_uri(first_photo.image.url)
        if obj.profile_image and request:
            return request.build_absolute_uri(obj.profile_image.url)
        return None

    def get_photos(self, obj):
        request = self.context.get("request")
        urls = []
        for photo in obj.photos.all():
            if photo.image and request:
                urls.append(request.build_absolute_uri(photo.image.url))
        if not urls and obj.profile_image and request:
            urls.append(request.build_absolute_uri(obj.profile_image.url))
        return urls


class MatchSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = ["id", "user", "created_at", "is_active"]

    def get_user(self, obj):
        request = self.context["request"]
        other_user = obj.user2 if obj.user1 == request.user else obj.user1
        return MatchUserSerializer(
            other_user,
            context=self.context,
        ).data


class MatchUserSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "first_name", "age", "bio", "gender", "profile_image", "photos"]

    def get_profile_image(self, obj):
        request = self.context.get("request")
        first_photo = obj.photos.order_by("order", "id").first()
        if first_photo and request:
            return request.build_absolute_uri(first_photo.image.url)
        if obj.profile_image and request:
            return request.build_absolute_uri(obj.profile_image.url)
        return None

    def get_photos(self, obj):
        request = self.context.get("request")
        urls = []
        for photo in obj.photos.all():
            if photo.image and request:
                urls.append(request.build_absolute_uri(photo.image.url))
        if not urls and obj.profile_image and request:
            urls.append(request.build_absolute_uri(obj.profile_image.url))
        return urls
