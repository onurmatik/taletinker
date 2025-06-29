from django import forms
from django.conf import settings
from django.utils.translation import gettext_lazy as _


THEME_CHOICES = [
    ("family", _("Family")),
    ("friendship", _("Friendship")),
    ("nature", _("Nature")),
    ("animals", _("Animals")),
    ("courage", _("Courage")),
    ("technology", _("Technology")),
    ("dinosaurs", _("Dinosaurs")),
    ("machines", _("Machines")),
    ("joyful", _("Joyful")),
    ("soothing", _("Soothing")),
    ("support", _("Supportive")),
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
        label=_("Realistic ↔ Fantastic"),
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
        label=_("Didactic ↔ Fun"),
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
        label=_("Target Age"),
    )

    themes = forms.MultipleChoiceField(
        choices=THEME_CHOICES,
        required=False,
        widget=forms.CheckboxSelectMultiple,
    )

    extra_instructions = forms.CharField(
        widget=forms.TextInput(attrs={"class": "form-control"}),
        required=False,
        label=_("Topic"),
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
        label=_("Story Length"),
    )


AGE_FILTER_CHOICES = [("", _("Any Age"))] + [
    (str(i), str(i)) for i in range(3, 11)
]


class StoryFilterForm(forms.Form):
    """Filtering options for the story list."""

    age = forms.ChoiceField(
        choices=AGE_FILTER_CHOICES,
        required=False,
        widget=forms.Select(attrs={"class": "form-select"}),
        label=_("Age"),
    )

    theme = forms.ChoiceField(
        choices=[("", _("Any Theme"))] + THEME_CHOICES,
        required=False,
        widget=forms.Select(attrs={"class": "form-select"}),
        label=_("Theme"),
    )


    sort = forms.ChoiceField(
        choices=[("newest", _("Newest")), ("popular", _("Most Liked"))],
        required=False,
        widget=forms.Select(attrs={"class": "form-select"}),
        label=_("Sort By"),
    )

    search = forms.CharField(
        required=False,
        widget=forms.TextInput(
            attrs={"class": "form-control", "placeholder": _("Search")}
        ),
        label=_("Search"),
    )
