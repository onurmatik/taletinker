from django.contrib import admin
from django.urls import path, include
from sesame.views import LoginView as SesameLoginView
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

from taletinker.stories.views import (
    create_story,
    story_detail,
    story_list,
    filter_stories,
    add_to_playlist,
    add_filtered_to_playlist,
    remove_from_playlist,
    reorder_playlist,
    play_playlist,
)
from taletinker.stories.feeds import LatestStoriesByLanguage
from taletinker.accounts.views import LogoutView, SignupView, EmailLoginView
from taletinker.api import api as ninja_api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', EmailLoginView.as_view(), name='login'),
    path('login/token/', SesameLoginView.as_view(), name='login_token'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('create/', create_story, name='create_story'),
    path('story/<uuid:story_uuid>/', story_detail, name='story_detail'),
    path('playlist/add/<int:story_id>/', add_to_playlist, name='add_to_playlist'),
    path('playlist/add_all/', add_filtered_to_playlist, name='add_filtered_to_playlist'),
    path('playlist/remove/<int:story_id>/', remove_from_playlist, name='remove_from_playlist'),
    path('playlist/reorder/', reorder_playlist, name='reorder_playlist'),
    path('playlist/play/', play_playlist, name='play_playlist'),
    path('rss/<str:language>/', LatestStoriesByLanguage(), name='story_feed'),
    path('i18n/', include('django.conf.urls.i18n')),
    path('api/', ninja_api.urls),
    path('search/', filter_stories, name='filter_stories'),
    path('', story_list, name='story_list'),
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
