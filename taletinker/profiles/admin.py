from django.contrib import admin
from django.contrib import messages
from .models import UserCredit, Payment


@admin.register(UserCredit)
class UserCreditAdmin(admin.ModelAdmin):
    list_display = ['user', 'available', 'locked', 'used']
    actions = ['add_credit']

    def add_credit(self, request, qs):
        for user_credit in qs:
            user_credit.add_credit(10)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount_paid', 'credit_bought', 'created']

