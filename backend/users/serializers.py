from rest_framework import serializers
from .models import User
from datetime import date


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
            "age"
        )
        extra_kwargs = {
            'first_name': {'required': True},
            'birth_date': {'required': True},
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
