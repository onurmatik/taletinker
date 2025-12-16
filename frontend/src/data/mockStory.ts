/**
 * Mock data and logic for the story generator.
 * Simulates AI suggestions for the next sentence.
 */

export const INITIAL_SENTENCES = [
  "The old clock tower struck midnight, but the silence that followed was heavier than usual.",
  "In a city where it never stopped raining, a dry patch of pavement was a suspicious omen.",
  "The envelope had no return address, only a single red wax seal.",
  "Everyone knew the forest was forbidden, which is exactly why Elara stood at its edge.",
  "The spaceship's AI hummed a lullaby that no one had programmed into it."
];

export const KIDS_INITIAL_SENTENCES = [
  "Once upon a time, in a land made entirely of candy, a little gummy bear woke up with a big idea.",
  "The friendly dragon sneezed, and instead of fire, bubbles came out!",
  "Max the puppy found a magical bone that could talk.",
  "In the middle of the fluffy cloud kingdom, a rainbow bridge suddenly appeared.",
  "The robot toy winked at Timmy and whispered, 'Let's go on an adventure!'"
];

export const SUGGESTIONS = [
  "Suddenly, a shadow detached itself from the wall and began to move.",
  "A distant scream shattered the calm, echoing through the empty streets.",
  "He realized too late that he wasn't alone in the room.",
  "The ground beneath them began to tremble, faint at first, then violent.",
  "A strange blue light flickered in the distance, beckoning them closer.",
  "She found a key in her pocket that she didn't remember picking up.",
  "The door creaked open, revealing a staircase that descended into darkness.",
  "A gust of wind blew out the candle, plunging them into absolute blackness.",
  "Someone whispered his name, but the voice came from inside his own head.",
  "The device beeped once, then displayed a countdown starting from ten."
];

export const KIDS_SUGGESTIONS = [
  "Suddenly, a flock of colorful butterflies lifted them into the sky.",
  "A squirrel wearing a tiny hat offered them an acorn.",
  "The magical door opened to reveal a room full of puppies.",
  "They found a treasure chest filled with chocolate coins.",
  "A friendly giant offered to give them a ride on his shoulder.",
  "The stars above began to dance and form a smiley face.",
  "A talking tree told them a funny joke.",
  "They hopped on a cloud and floated to the castle.",
  "The river turned into strawberry milkshake!",
  "A group of bunnies invited them to a tea party."
];

export const ENDINGS = [
  "And in that moment, they knew everything had changed forever.",
  "The mystery would remain unsolved, buried beneath the sands of time.",
  "They walked into the sunrise, leaving the past behind them.",
  "It was the end of their journey, but the beginning of a new legend.",
  "Darkness swallowed the world, and silence reigned supreme."
];

export const KIDS_ENDINGS = [
  "And they all lived happily ever after, eating cookies and drinking milk.",
  "It was the best adventure ever, and they couldn't wait for the next one.",
  "They fell asleep with smiles on their faces, dreaming of their magical day.",
  "The magical world would always be there, waiting for their return.",
  "And so, they became the best of friends forever."
];

// Mock saved stories for the library view
export const MOCK_SAVED_STORIES = [
  {
    id: "story-1",
    title: "The Silent Clock Tower",
    date: "Oct 12, 2023",
    isKidSafe: false,
    lines: [
      "The old clock tower struck midnight, but the silence that followed was heavier than usual.",
      "A distant scream shattered the calm, echoing through the empty streets.",
      "He realized too late that he wasn't alone in the room.",
      "Someone whispered his name, but the voice came from inside his own head.",
      "The mystery would remain unsolved, buried beneath the sands of time."
    ],
    alternatives: {
      1: ["The clock's hands started spinning backwards, faster and faster.", "A single raven cawed from the darkness above."],
      3: ["The voice was familiar, yet twisted into something malicious.", "He spun around, but the room was completely empty."]
    }
  },
  {
    id: "story-2",
    title: "Forbidden Forest",
    date: "Nov 05, 2023",
    isKidSafe: false,
    lines: [
      "Everyone knew the forest was forbidden, which is exactly why Elara stood at its edge.",
      "A strange blue light flickered in the distance, beckoning them closer.",
      "She found a key in her pocket that she didn't remember picking up.",
      "The door creaked open, revealing a staircase that descended into darkness.",
      "It was the end of their journey, but the beginning of a new legend."
    ],
    alternatives: {
      1: ["The trees whispered secrets that the wind carried away.", "A pair of glowing yellow eyes watched her from the undergrowth."],
      2: ["The path ahead was blocked by a wall of thorns.", "She heard footsteps crunching on the dry leaves behind her."]
    }
  },
  {
    id: "story-3",
    title: "The Rain City",
    date: "Yesterday",
    isKidSafe: false,
    lines: [
      "In a city where it never stopped raining, a dry patch of pavement was a suspicious omen.",
      "Suddenly, a shadow detached itself from the wall and began to move.",
      "The ground beneath them began to tremble, faint at first, then violent.",
      "Darkness swallowed the world, and silence reigned supreme."
    ],
    alternatives: {
      1: ["A man in a trench coat watched from across the street.", "The rain turned to ash as it fell."]
    }
  },
  {
    id: "story-4",
    title: "The Candy Kingdom",
    date: "Today",
    isKidSafe: true,
    lines: [
      "Once upon a time, in a land made entirely of candy, a little gummy bear woke up with a big idea.",
      "The friendly dragon sneezed, and instead of fire, bubbles came out!",
      "They found a treasure chest filled with chocolate coins.",
      "And they all lived happily ever after, eating cookies and drinking milk."
    ],
    alternatives: {
      1: ["The gummy bear decided to build a castle made of marshmallows.", "A river of chocolate flowed past his house."]
    }
  },
  {
    id: "story-5",
    title: "Max's Magic Bone",
    date: "Last Week",
    isKidSafe: true,
    lines: [
      "Max the puppy found a magical bone that could talk.",
      "A squirrel wearing a tiny hat offered them an acorn.",
      "The robot toy winked at Timmy and whispered, 'Let's go on an adventure!'",
      "They fell asleep with smiles on their faces, dreaming of their magical day."
    ],
    alternatives: {
      1: ["The bone started to glow with a bright green light.", "Max wagged his tail so hard he almost took off like a helicopter."]
    }
  }
];

// Helper to get random suggestions
export function getMockSuggestions(count: number = 2, isKidsMode: boolean = false): string[] {
  const source = isKidsMode ? KIDS_SUGGESTIONS : SUGGESTIONS;
  const shuffled = [...source].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Helper to check if story can end
export function canEndStory(pathLength: number): boolean {
  return pathLength >= 5;
}

export function getRandomEnding(isKidsMode: boolean = false): string {
  const source = isKidsMode ? KIDS_ENDINGS : ENDINGS;
  const index = Math.floor(Math.random() * source.length);
  return source[index];
}
