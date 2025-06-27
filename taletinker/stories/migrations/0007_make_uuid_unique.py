from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("stories", "0006_populate_uuid"),
    ]

    operations = [
        migrations.AlterField(
            model_name="story",
            name="uuid",
            field=models.UUIDField(unique=True, editable=False),
        ),
    ]
