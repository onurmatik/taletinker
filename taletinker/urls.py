from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from .api import api


urlpatterns = [
#    path("", FrontendAppView.as_view(), name="frontend_app"),
    path("admin**/", admin.site.urls),

    path("api/", api.urls),

    path("login/auth/", profile_views.login_view, name="email_auth"),
    path("logout/", profile_views.CustomLogoutView.as_view(), name="logout"),

    path("payment/session", profile_views.stripe_checkout_session, name="payment_session"),
    path("payment/result", profile_views.stripe_payment_result, name="payment_result"),
    path("payment/config", profile_views.get_stripe_config, name="get_stripe_config"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


admin.site.index_title = 'Photo Forge'
admin.site.site_header = 'Photo Forge administration'
admin.site.site_title = 'Photo Forge'
