import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django_asgi_app = get_asgi_application()

# Importy poniżej muszą mieć 'noqa: E402', aby Ruff/Flake8 ich nie przesuwał ani nie zgłaszał
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

import chat.routing  # noqa: E402
from chat.middleware import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(URLRouter(chat.routing.websocket_urlpatterns)),
    }
)
