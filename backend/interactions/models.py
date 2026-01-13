from django.db import models
from django.conf import settings

class Interaction(models.Model):
    LIKE = 'LIKE'
    DISLIKE = 'DISLIKE'
    SUPERLIKE = 'SUPERLIKE'
    
    ACTION_CHOICES = [
        (LIKE, 'Like'),
        (DISLIKE, 'Dislike'),
        (SUPERLIKE, 'Super Like'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='actions_made'
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='actions_received'
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'target_user')
        indexes = [
            models.Index(fields=['user', 'action']),
        ]

    def __str__(self):
        return f"{self.user} -> {self.action} -> {self.target_user}"


class Match(models.Model):
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='matches_1'
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='matches_2'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user1', 'user2')

    def __str__(self):
        return f"Match: {self.user1} & {self.user2}"