from __future__ import annotations


class ApiPrefixCompatMiddleware:
    """
    Rewrites stripped API paths (e.g. /stories/*, /auth/*) to /api/... for
    dev proxy setups that accidentally drop the /api prefix.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info or ""
        content_type = (request.META.get("CONTENT_TYPE") or "").lower()
        accept = (request.META.get("HTTP_ACCEPT") or "").lower()

        is_jsonish = "application/json" in content_type or "application/json" in accept
        is_stories_api = path == "/stories" or path.startswith("/stories/")
        is_auth_api = path == "/auth" or path.startswith("/auth/")

        # Keep browser-rendered auth pages untouched.
        is_known_page_route = path in {"/auth/login/", "/auth/logout/"}

        should_rewrite_auth = is_auth_api and (is_jsonish or not is_known_page_route)
        should_rewrite = (is_stories_api or should_rewrite_auth) and not path.startswith("/api/")

        if should_rewrite:
            rewritten = f"/api{path}"
            request.path_info = rewritten
            request.path = rewritten
            request.META["PATH_INFO"] = rewritten

        return self.get_response(request)
