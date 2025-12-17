/**
 * Mock data and logic for the story generator.
 * Simulates AI suggestions for the next sentence.
 * 
 * UPDATED: Defaulting to Kids/Safe content as requested.
 */

export const INITIAL_SENTENCES = [
  "Once upon a time, in a land made entirely of candy, a little gummy bear woke up with a big idea.",
  "The friendly dragon sneezed, and instead of fire, bubbles came out!",
  "Max the puppy found a magical bone that could talk.",
  "In the middle of the fluffy cloud kingdom, a rainbow bridge suddenly appeared.",
  "The robot toy winked at Timmy and whispered, 'Let's go on an adventure!'",
  "A tiny mouse found a helmet that was way too big for him, but perfect for a knight.",
  "The stars in the sky decided to come down and play hide and seek.",
  "Princess Lily found a door in the old oak tree that wasn't there yesterday."
];

export const SUGGESTIONS = [
  "Suddenly, a flock of colorful butterflies lifted them into the sky.",
  "A squirrel wearing a tiny hat offered them an acorn.",
  "The magical door opened to reveal a room full of puppies.",
  "They found a treasure chest filled with chocolate coins.",
  "A friendly giant offered to give them a ride on his shoulder.",
  "The stars above began to dance and form a smiley face.",
  "A talking tree told them a funny joke.",
  "They hopped on a cloud and floated to the castle.",
  "The river turned into strawberry milkshake!",
  "A group of bunnies invited them to a tea party.",
  "A dolphin jumped out of the water and said 'Hello!'",
  "The wind whispered a secret map into their ears."
];

export const ENDINGS = [
  "And they all lived happily ever after, eating cookies and drinking milk.",
  "It was the best adventure ever, and they couldn't wait for the next one.",
  "They fell asleep with smiles on their faces, dreaming of their magical day.",
  "The magical world would always be there, waiting for their return.",
  "And so, they became the best of friends forever.",
  "They laughed and laughed until their tummies hurt."
];

// Mock saved stories for the library view - ONLY keeping kid-safe/fun ones
export const MOCK_SAVED_STORIES = [
  {
    id: "story-4",
    rootId: "story-4",
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
    rootId: "story-5",
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
  },
  {
    id: "story-6",
    rootId: "story-6",
    title: "The Flying Bicycle",
    date: "Yesterday",
    isKidSafe: true,
    lines: [
        "Tommy's bicycle grew wings and started flapping.",
        "They soared over the playground and the school.",
        "A flock of birds raced them to the clouds.",
        "It was the best adventure ever, and they couldn't wait for the next one."
    ],
    alternatives: {}
  }
];

// Helper to get random suggestions
export function getMockSuggestions(count: number = 2): string[] {
  const shuffled = [...SUGGESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Helper to check if story can end
export function canEndStory(pathLength: number): boolean {
  return pathLength >= 5;
}

export function getRandomEnding(): string {
  const index = Math.floor(Math.random() * ENDINGS.length);
  return ENDINGS[index];
}
