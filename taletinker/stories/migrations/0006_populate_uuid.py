import uuid
from django.db import migrations

def populate_uuids(apps, schema_editor):
    Story = apps.get_model("stories", "Story")
    for story in Story.objects.all():
        story.uuid = uuid.uuid4()
        story.save(update_fields=["uuid"])

class Migration(migrations.Migration):

    dependencies = [
        ("stories", "0005_add_uuid_field"),
    ]

    operations = [
        migrations.RunPython(populate_uuids, reverse_code=migrations.RunPython.noop),
    ]
