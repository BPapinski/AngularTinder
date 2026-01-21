# chat/middleware.py

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

# USUNIĘTE: User = get_user_model() <- To powodowało błąd!


@database_sync_to_async
def get_user(user_id):
    # DODANE: Importujemy model dopiero w momencie użycia, gdy Django jest gotowe
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)

        token = query_params.get("token", [None])[0]

        if token:
            try:
                access_token = AccessToken(token)  # type: ignore
                user_id = access_token["user_id"]
                scope["user"] = await get_user(user_id)
            except (InvalidToken, TokenError, Exception) as e:
                print(f"JWT Auth Error: {e}")
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
