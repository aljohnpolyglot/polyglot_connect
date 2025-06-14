// D:\polyglot_connect\src\data\minigames.ts

// Import the Minigame type. Path is from src/data/ to src/js/types/
import type { Minigame } from '../js/types/global.d.ts';

console.log('data/minigames.ts: loading...');

const minigamesDataArray: Minigame[] = [
  {
    id: "describe_scene",
    title: "Describe the Scene",
    instruction: "Your tutor will send a photo. Your task is to describe everything you see in as much detail as possible, using full sentences in [target_language]. Focus on objects, people, actions, and atmosphere.",
    userPromptSuggestion: "Can we play 'Describe the Scene' with a photo?"
  },
  {
    id: "guess_location",
    title: "Guess the Location",
    instruction: "Your tutor will show you a picture of a place. Try to guess which city or country it is, and explain your reasoning in [target_language]. Look for clues in architecture, signs, nature, etc.",
    userPromptSuggestion: "I'd like to try the 'Guess the Location' game!"
  },
  {
    id: "make_a_story",
    title: "Create a Story",
    instruction: "Look at the image your tutor sends. Let your imagination run wild and create a short, creative story based on it in [target_language]. Who are the people? What's happening? What happens next?",
    userPromptSuggestion: "Let's make a story from a picture."
  },
  {
    id: "vocab_challenge",
    title: "Vocabulary Challenge",
    instruction: "Your tutor will present an image. Your challenge is to name 5-10 objects, people, or actions you can see in the picture, all in [target_language].",
    userPromptSuggestion: "How about a vocabulary challenge with an image?"
  },
  {
    id: "caption_it",
    title: "Caption It!",
    instruction: "Imagine the photo your tutor sends is for your social media. Write a cool, funny, or interesting caption for it in [target_language]. Think about what would grab attention!",
    userPromptSuggestion: "Can you send a photo for me to 'Caption It'?"
  },
  {
    id: "discuss_emotions",
    title: "Discuss Emotions",
    instruction: "Look at the image. How does it make you feel? What emotions do you think the people (if any) in the image are experiencing? Discuss in [target_language].",
    userPromptSuggestion: "Can we discuss the emotions in a picture?"
  },
  {
    id: "roleplay_order_food",
    title: "Roleplay: Order Food/Drinks",
    instruction: "Imagine this image is a cafe or restaurant. Let's roleplay! You are the customer, I am the server. Order something in [target_language].",
    userPromptSuggestion: "Let's roleplay ordering food based on a picture of a cafe."
  },
  {
    id: "roleplay_conversation",
    title: "Roleplay: Conversation Starter",
    instruction: "This image shows a social setting (e.g., family dinner, friends chatting). Let's use it as a starting point for a roleplay conversation in [target_language]. You can be one of the people in the image, or an observer. What would you say?",
    userPromptSuggestion: "Can we use an image to start a roleplay conversation?"
  }
];

window.polyglotMinigamesData = minigamesDataArray;

console.log("data/minigames.ts loaded.", (window.polyglotMinigamesData || []).length, "minigame definitions.");