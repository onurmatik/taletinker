"""
URL configuration for taletinker project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from taletinker.stories.views import (
    create_story,
    story_detail,
    story_list,
    add_to_playlist,
    add_filtered_to_playlist,
)
from taletinker.accounts.views import LogoutView
from taletinker.api import api as ninja_api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('create/', create_story, name='create_story'),
    path('story/<int:story_id>/', story_detail, name='story_detail'),
    path('playlist/add/<int:story_id>/', add_to_playlist, name='add_to_playlist'),
    path('playlist/add_all/', add_filtered_to_playlist, name='add_filtered_to_playlist'),
    path('api/', ninja_api.urls),
    path('', story_list, name='story_list'),
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
