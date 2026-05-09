from django.test import TestCase, override_settings


@override_settings(ALLOWED_HOSTS=["testserver", "localhost"])
class FrontendRouteTests(TestCase):
    def test_home_serves_django_frontend(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "static/js/app.js")
        self.assertContains(response, "static/css/app.css")

    def test_story_route_serves_html_for_browser_requests(self):
        response = self.client.get("/stories/example-story")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "TALE_TINKER_INITIAL_STORY_ID")

    def test_story_route_still_rewrites_json_api_compat_requests(self):
        response = self.client.get(
            "/stories/not-a-real-story",
            HTTP_ACCEPT="application/json",
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.wsgi_request.path_info, "/api/stories/not-a-real-story")
