from django.contrib.auth import views as auth_views
from django.shortcuts import render


class LogoutView(auth_views.LogoutView):
    """Allow logout via GET for simplicity."""

    http_method_names = ["get", "post", "options"]

    def get(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)
