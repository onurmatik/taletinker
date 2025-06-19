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
        widget=forms.NumberInput(attrs={"type": "range"}),
        label="Realistic ↔ Fantastic",
    )

    didactic = forms.IntegerField(
        min_value=0,
        max_value=100,
        initial=50,
        widget=forms.NumberInput(attrs={"type": "range"}),
        label="Didactic ↔ Fun",
    )

    age = forms.IntegerField(
        min_value=3,
        max_value=10,
        initial=5,
        widget=forms.NumberInput(attrs={"type": "range", "step": 1}),
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

    characters = forms.CharField(required=False, label="Characters")
    extra_instructions = forms.CharField(
        widget=forms.Textarea,
        required=False,
        label="Extra Instructions",
    )

    story_length = forms.ChoiceField(choices=LENGTH_CHOICES, label="Story Length")
    language = forms.ChoiceField(choices=LANGUAGE_CHOICES)
