from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class DatingCardSerializer(serializers.ModelSerializer):
    # Wiek bierzemy z property 'age' z modelu User
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "first_name", "age", "gender", "bio", "profile_image"]
