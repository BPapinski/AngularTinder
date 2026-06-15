from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def build_message_payload(msg, sender, receiver_id):
    return {
        "id": msg.id,
        "sender": {
            "id": sender.id,
            "first_name": sender.first_name,
        },
        "receiver": receiver_id,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


async def broadcast_chat_message(msg, sender, receiver_id):
    channel_layer = get_channel_layer()
    sender_id = sender.id
    room_group_name = f"chat_{min(sender_id, receiver_id)}_{max(sender_id, receiver_id)}"
    payload = build_message_payload(msg, sender, receiver_id)

    await channel_layer.group_send(
        room_group_name,
        {
            "type": "chat_message",
            "message": payload,
        },
    )

    await channel_layer.group_send(
        f"notifications_{receiver_id}",
        {
            "type": "new_message_notification",
            "from_user_id": sender.id,
            "from_user_name": sender.first_name,
            "content": msg.content,
            "message_id": msg.id,
            "created_at": msg.created_at.isoformat(),
        },
    )


def build_reaction_payload(message):
    from .serializers import ChatMessageReactionSerializer

    reactions = ChatMessageReactionSerializer(
        message.reactions.select_related("user"),
        many=True,
    ).data
    return {
        "type": "message_reaction",
        "id": message.id,
        "reactions": reactions,
    }


def broadcast_message_reaction(message):
    channel_layer = get_channel_layer()
    sender_id = message.sender_id
    receiver_id = message.receiver_id
    room_group_name = f"chat_{min(sender_id, receiver_id)}_{max(sender_id, receiver_id)}"
    payload = build_reaction_payload(message)

    async_to_sync(channel_layer.group_send)(
        room_group_name,
        {
            "type": "chat_reaction",
            "payload": payload,
        },
    )
