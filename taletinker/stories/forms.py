from django import forms

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

LANGUAGE_CHOICES = [
    ("en", "English"),
    ("es", "Spanish"),
    ("fr", "French"),
    ("de", "German"),
]

LENGTH_CHOICES = [
    ("short", "Short"),
    ("medium", "Medium"),
    ("long", "Long"),
]


class StoryCreationForm(forms.Form):
    realism = forms.IntegerField(
        min_value=0,
        max_value=100,
        initial=50,
        widget=forms.NumberInput(attrs={"type": "range", "class": "form-range"}),
        label="Realistic ↔ Fantastic",
    )

    didactic = forms.IntegerField(
        min_value=0,
        max_value=100,
        initial=50,
        widget=forms.NumberInput(attrs={"type": "range", "class": "form-range"}),
        label="Didactic ↔ Fun",
    )

    age = forms.IntegerField(
        min_value=3,
        max_value=10,
        initial=5,
        widget=forms.NumberInput(
            attrs={"type": "range", "step": 1, "class": "form-range"}
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
        choices=LANGUAGE_CHOICES, widget=forms.Select(attrs={"class": "form-select"})
    )
