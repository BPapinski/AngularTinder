from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class DatingCardSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)
    profile_image = serializers.SerializerMethodField()  # <- zmiana

    class Meta:
        model = User
        fields = ["id", "first_name", "age", "gender", "bio", "profile_image"]

    def get_profile_image(self, obj):
        request = self.context.get("request")
        if obj.profile_image and request:
            return request.build_absolute_uri(obj.profile_image.url)
        return None
