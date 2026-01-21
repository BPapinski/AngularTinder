# config/asgi.py

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# 1. NAJPIERW inicjalizujemy Django. To ładuje aplikacje i modele.
django_asgi_app = get_asgi_application()

# 2. DOPIERO TERAZ importujemy rzeczy z naszych aplikacji (channels, chat itp.)
import chat.routing
from channels.routing import ProtocolTypeRouter, URLRouter
from chat.middleware import JWTAuthMiddleware

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(URLRouter(chat.routing.websocket_urlpatterns)),
    }
)
