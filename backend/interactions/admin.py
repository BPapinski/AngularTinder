from django.contrib import admin

# Register your models here.
from .models import Interaction, Match
admin.site.register(Interaction)
admin.site.register(Match)