from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from .profiles import views as profiles_views
from .api import api

urlpatterns = [
#    path("", FrontendAppView.as_view(), name="frontend_app"),
    path("admin-qweasd123/", admin.site.urls),

    path("api/", api.urls),

    path("auth/login/", profiles_views.login_view, name="email_auth"),
    path("auth/logout/", profiles_views.CustomLogoutView.as_view(), name="logout"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


admin.site.index_title = 'Tale Tinker'
admin.site.site_header = 'Tale Tinker administration'
admin.site.site_title = 'Tale Tinker'
