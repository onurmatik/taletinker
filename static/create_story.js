// JavaScript for the create_story page
// Requires Django's jsi18n catalog to be loaded beforehand.

document.addEventListener('DOMContentLoaded', () => {
    // 1. CHIPS
    document.querySelectorAll('.chip').forEach(chip => {
        const input = chip.querySelector('input');
        chip.classList.toggle('selected', input.checked);
        chip.addEventListener('click', () => {
            input.checked = !input.checked;
            chip.classList.toggle('selected', input.checked);
        });
    });

    // 3. RANDOM IDEA GENERATOR
    const ideaBtn = document.getElementById('random-idea-btn');
    if (ideaBtn) {
        const adjectives = [
            gettext('Silly'),
            gettext('Brave'),
            gettext('Curious'),
            gettext('Sleepy'),
            gettext('Hungry'),
            gettext('Zippy')
        ];
        const creatures = [
            gettext('Dragon'),
            gettext('Robot'),
            gettext('Wizard'),
            gettext('Panda'),
            gettext('Unicorn'),
            gettext('Spark'),
            gettext('Noodle')
        ];
        const actions = [
            gettext('finds a lost treasure'),
            gettext('learns to dance'),
            gettext('builds a sandcastle'),
            gettext('joins a circus'),
            gettext('flies to the moon')
        ];
        function pick(list){ return list[Math.floor(Math.random()*list.length)]; }
        ideaBtn.addEventListener('click', () => {
            const idea = `${pick(adjectives)} ${pick(creatures)} ${pick(actions)}`;
            document.getElementById('id_extra_instructions').value = idea;
        });
    }

    // 4. AJAX GENERATE STORY
    const form = document.getElementById('create-form');
    const spinner = document.getElementById('spinner');

    form.addEventListener('submit', async e => {
        e.preventDefault(); spinner.style.display = 'inline-block';

        const data = {
            realism: +form.realism.value,
            didactic: +form.didactic.value,
            age: +form.age.value,
            themes: [...form.querySelectorAll('input[name="themes"]:checked')].map(el => el.value),
            extra_instructions: form.extra_instructions.value,
            story_length: form.story_length.value,
            language: window.LANGUAGE_CODE,
        };

        try{
            const resp = await fetch('/api/create',{
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify(data)
            });
            const json = await resp.json();
            form.story_text.value = json.text;
            document.getElementById('story_title').value = json.title;
        }catch(err){
            console.error(err); spinner.style.display='none'; return;
        }

        spinner.style.display='none';
        form.submit();
    });
});
