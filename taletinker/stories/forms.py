from django import forms
from django.conf import settings


THEME_CHOICES = [
    ("family", "Family"),
    ("friendship", "Friendship"),
    ("nature", "Nature"),
    ("animals", "Animals"),
    ("courage", "Courage"),
    ("technology", "Technology"),
    ("dinosaurs", "Dinosaurs"),
    ("machines", "Machines"),
    ("joyful", "Joyful"),
    ("soothing", "Soothing"),
    ("support", "Supportive"),
]


class StoryCreationForm(forms.Form):

    realism = forms.IntegerField(
        min_value=1,
        max_value=5,
        initial=3,
        widget=forms.NumberInput(
            attrs={
                "type": "range",
                "class": "form-range",
                "step": 1,
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
                "class": "form-range",
                "step": 1,
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
                "class": "form-range",
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

    extra_instructions = forms.CharField(
        widget=forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        required=False,
        label="Extra Instructions",
    )

    story_length = forms.IntegerField(
        min_value=1,
        max_value=5,
        initial=1,
        widget=forms.NumberInput(
            attrs={
                "type": "range",
                "step": 1,
                "class": "form-range",
                "list": "length-ticks",
            }
        ),
        label="Story Length",
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

    search = forms.CharField(
        required=False,
        widget=forms.TextInput(
            attrs={"class": "form-control", "placeholder": "Search"}
        ),
        label="Search",
    )
