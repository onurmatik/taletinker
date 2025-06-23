from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('stories', '0003_playlist'),
    ]

    operations = [
        migrations.AddField(
            model_name='playlist',
            name='order',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
