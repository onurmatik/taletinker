from django.shortcuts import redirect
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.views import LogoutView
from django.utils.translation import gettext as _
from django.conf import settings
from sesame.utils import get_user


def login_view(request):
    # Parse the token from the request to authenticate the user
    user = get_user(request)
    if user is not None:
        # Perform login logic
        login(request, user)
        # Add a success message
        messages.success(request, _("You have been successfully logged in."))
        
        if settings.DEBUG:
            return redirect("http://localhost:5173")
            
    else:
        # Login failed
        messages.error(request, _("We couldn't validate your token. Please try again."))
    return redirect('/')


class CustomLogoutView(LogoutView):
    http_method_names = ["get", "post", "options"]

    def dispatch(self, request, *args, **kwargs):
        messages.info(request, _('You have been successfully logged out.'))
        return super().dispatch(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)

