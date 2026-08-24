from rest_framework import serializers

from apps.employee.models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            "id",
            "business",
            "name",
            "code",
            "hire_date",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["business", "created_at", "updated_at"]

    def validate_code(self, value):
        if value:
            business = self.context.get("business")
            if business is None and self.instance is not None:
                business = self.instance.business
            if business is not None:
                qs = Employee.objects.filter(business=business, code=value)
                if self.instance is not None:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError(
                        "Employee with this code already exists for the business."
                    )
        return value
