from rest_framework import serializers

from apps.admin.models import Module, Feature, PlanFeature, BusinessFeatureOverride
from apps.admin.models import SupportTicket, TicketReply
from apps.billing.models import Plan
from apps.business.models import Business
from apps.authentication.models import User


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = [
            "id",
            "code",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = [
            "id",
            "module",
            "code",
            "name",
            "description",
            "is_active",
            "is_beta",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PlanFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanFeature
        fields = [
            "id",
            "plan",
            "feature",
            "is_enabled",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class BusinessFeatureOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessFeatureOverride
        fields = [
            "id",
            "business",
            "feature",
            "state",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SupportTicketListSerializer(serializers.ModelSerializer):
    requester = serializers.SerializerMethodField()
    replies_count = serializers.IntegerField(source="replies.count", read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "subject",
            "status",
            "priority",
            "requester",
            "replies_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_requester(self, obj):
        requester = obj.requester
        return {
            "id": str(requester.id),
            "email": requester.email,
            "first_name": requester.first_name,
            "last_name": requester.last_name,
        }


class SupportTicketDetailSerializer(serializers.ModelSerializer):
    requester = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "subject",
            "description",
            "status",
            "priority",
            "requester",
            "replies",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_requester(self, obj):
        requester = obj.requester
        return {
            "id": str(requester.id),
            "email": requester.email,
            "first_name": requester.first_name,
            "last_name": requester.last_name,
        }

    def get_replies(self, obj):
        replies = obj.replies.select_related("author").all()
        return TicketReplySerializer(replies, many=True).data


class SupportTicketWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "subject",
            "description",
            "status",
            "priority",
            "requester",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data.pop("requester", None)
        validated_data["requester"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("requester", None)
        return super().update(instance, validated_data)


class TicketReplySerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    ticket = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = TicketReply
        fields = ["id", "ticket", "author", "message", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_author(self, obj):
        author = obj.author
        return {
            "id": str(author.id),
            "email": author.email,
            "first_name": author.first_name,
            "last_name": author.last_name,
        }

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data.pop("author", None)
        validated_data["author"] = request.user
        ticket = self.context.get("ticket")
        if ticket is not None:
            validated_data["ticket"] = ticket
        return super().create(validated_data)
