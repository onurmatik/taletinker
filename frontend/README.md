# TaleTinker App

An interactive story generator that allows users to collaboratively build a narrative with AI assistance. The story progresses one sentence at a time, offering branching paths and automatic progression.

## Features
- **Interactive Storytelling**: Choose from AI suggestions or write your own continuation.
- **Timer Mechanism**: Auto-selects an option if no choice is made within the time limit.
- **Branching Narratives**: Go back to any previous sentence to fork the story in a new direction.
- **Dynamic Theming**: Supports light and dark modes with a focus on readability (serif fonts).

## Component Props

The main `TaleTinkerApp` component does not accept any props as it is a self-contained page-level application.

## Usage

```tsx
import { TaleTinkerApp } from '@/sd-components/02ff525f-fd2d-402e-b333-be77822c2da4';

export default function Page() {
  return <TaleTinkerApp />;
}
```

## Dependencies
- `framer-motion`: For smooth animations.
- `lucide-react`: For icons.
- `clsx`, `tailwind-merge`: For utility classes.
