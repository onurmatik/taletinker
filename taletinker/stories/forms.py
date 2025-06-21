from django import forms
from django.conf import settings


THEME_CHOICES = [
    ("family", "Family"),
    ("friendship", "Friendship"),
    ("nature", "Nature"),
    ("animals", "Animals"),
    ("courage", "Courage"),
    ("technology", "Technology"),
]

PURPOSE_CHOICES = [
    ("joyful", "Joyful"),
    ("soothing", "Soothing"),
    ("support", "Supportive"),
]

LENGTH_CHOICES = [
    ("short", "Short"),
    ("medium", "Medium"),
    ("long", "Long"),
]


class StoryCreationForm(forms.Form):
    LABELS_REALISM = "realistic,moderately realistic,balanced,moderately fantastic,fantastic"
    LABELS_DIDACTIC = "didactic,mostly didactic,balanced,mostly fun,just for fun"

    realism = forms.IntegerField(
        min_value=1,
        max_value=5,
        initial=3,
        widget=forms.NumberInput(
            attrs={
                "type": "range",
                "class": "form-range range-bubble",
                "step": 1,
                "data-labels": LABELS_REALISM,
            }
        ),
        label="Realistic ↔ Fantastic",
    )

    didactic = forms.IntegerField(
        min_value=1,
        max_value=5,
        initial=3,
        widget=forms.NumberInput(
            attrs={
                "type": "range",
                "class": "form-range range-bubble",
                "step": 1,
                "data-labels": LABELS_DIDACTIC,
            }
        ),
        label="Didactic ↔ Fun",
    )

    age = forms.IntegerField(
        min_value=3,
        max_value=10,
        initial=5,
        widget=forms.NumberInput(
            attrs={
                "type": "range",
                "step": 1,
                "class": "form-range range-bubble",
                "list": "age-ticks",
            }
        ),
        label="Target Age",
    )

    themes = forms.MultipleChoiceField(
        choices=THEME_CHOICES,
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    purposes = forms.MultipleChoiceField(
        choices=PURPOSE_CHOICES,
        required=False,
        widget=forms.CheckboxSelectMultiple,
        label="Purpose",
    )

    characters = forms.CharField(
        required=False,
        label="Characters",
        widget=forms.TextInput(attrs={"class": "form-control"}),
    )
    extra_instructions = forms.CharField(
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        required=False,
        label="Extra Instructions",
    )

    story_length = forms.ChoiceField(
        choices=LENGTH_CHOICES,
        label="Story Length",
        widget=forms.Select(attrs={"class": "form-select"}),
    )
    language = forms.ChoiceField(
        choices=settings.LANGUAGES, widget=forms.Select(attrs={"class": "form-select"})
    )


AGE_FILTER_CHOICES = [("", "Any Age")] + [(str(i), str(i)) for i in range(3, 11)]


class StoryFilterForm(forms.Form):
    """Filtering options for the story list."""

    age = forms.ChoiceField(
        choices=AGE_FILTER_CHOICES,
        required=False,
        widget=forms.Select(attrs={"class": "form-select"}),
        label="Age",
    )

    theme = forms.ChoiceField(
        choices=[("", "Any Theme")] + THEME_CHOICES,
        required=False,
        widget=forms.Select(attrs={"class": "form-select"}),
        label="Theme",
    )

    language = forms.ChoiceField(
        choices=[("", "Any Language")] + settings.LANGUAGES,
        required=False,
        widget=forms.Select(attrs={"class": "form-select"}),
        label="Language",
    )

    sort = forms.ChoiceField(
        choices=[("newest", "Newest"), ("popular", "Most Liked")],
        required=False,
        widget=forms.Select(attrs={"class": "form-select"}),
        label="Sort By",
    )
