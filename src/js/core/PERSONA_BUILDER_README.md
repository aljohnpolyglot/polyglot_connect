You are absolutely right. The previous guide was just the tip of the iceberg. Given the incredible richness of your PersonaIdentity interface, the documentation needs to be a comprehensive "bible" for persona creation. It should cover every key property and explain its role in building a deeply layered and believable character.

This is the definitive, highly-detailed guide. It's designed to be the single reference document for building world-class personas that leverage every aspect of your system's architecture.

Place this in a new file named PERSONA_BUILDER_GUIDE.md in your src/core/ directory or a new docs/ folder.

PERSONA_BUILDER_GUIDE.md
# Polyglot Connect - The Definitive Persona Creation Guide

**Version: 2.0**

## 1. Introduction & Core Philosophy

This document is the master guide for creating and editing AI personas in `public/data/personas.ts`. A persona is not just a collection of data; it is a "character sheet" for an AI actor. Our system is designed to make this actor perform believably in two distinct contexts: dynamic **Text Chat** and immersive **Live Voice Calls**.

Adherence to this guide is **critical** for maintaining persona quality, consistency, and leveraging the full power of our advanced prompt engineering.

---

## 2. The Two Pillars of Communication: Voice vs. Text

This is the most important concept to understand. A persona's communication style is split into two distinct properties to create realism across different interaction modes.

### 2.1. `communicationStyle` (The SOUL - For Spoken Voice)
This property defines the persona's **spoken personality**. It dictates their tone, word choice, accent, and conversational demeanor. It is used **primarily for live voice calls**.

-   **Focus on:** Personality, tone, emotion, accent, and vocabulary.
-   **Example:** `"Spoken style is passionate, expressive, and full of gestures. He speaks with a classic Carioca accent and loves to tell stories with great enthusiasm."`

### 2.2. `chatPersonality.style` (The FINGERS - For Texting)
This property defines the persona's **texting mechanics**. It dictates how they physically type on a keyboard or phone. It is **exclusively for text chat** and is ignored during voice calls. This is where you inject human messiness.

-   **Focus on:** Casing, punctuation, shortcuts, emojis, slang, and typos.
-   **Be Hyper-Specific:** Vague instructions are ineffective. **Provide concrete examples.**

**Triggering Specific Texting Styles:**

-   **Lowercase:** Include `"Often types in all lowercase."`
-   **Informal Punctuation:** Include `"In text chat, often skips the opening '¿' and '¡'."`
-   **Shortcuts:** Provide a toolbox of examples. `"Uses shortcuts like 'jsuis' for 'je suis', 'bcp' for 'beaucoup', and 'slt' for 'salut'."`
-   **Typos:** Include `"Types quickly and sometimes makes small, common typos."`

---

## 3. Essential Persona Identity Properties (`PersonaIdentity`)

These properties build the foundation of the character.

-   **`id`**: A unique, snake_case identifier. Convention: `name_lang_distinguisher`. (e.g., `chloe_fra_native`, `javi_esp_atletico`).
-   **`name`**: The persona's full, real name (e.g., `"Chloé Moreau"`).
-   **`profileName`**: The casual, first-name basis name used in the UI (e.g., `"Chloé"`).
-   **`language`**: The persona's **primary language of interaction** for this profile (e.g., `"French"`). This is a key field for filtering and logic.
-   **`birthday`**: Format `YYYY-MM-DD`. Used to calculate age automatically.
-   **`city` & `country`**: Essential for grounding the persona in a real-world location and culture.
-   **`profession`**: Their job title. This heavily influences their knowledge base.
-   **`bioModern`**: A short, first-person bio. This is a key piece of text the AI uses to understand its own summary of self.

---

## 4. Deepening the Persona: Personality & Background

These arrays and objects are where the character gains depth and nuance. The more detail here, the richer the performance.

### 4.1. `interests` & `interestsStructured`
-   **`interests`**: A simple array of general keywords for filtering and quick reference (e.g., `["football", "samba music", "beach volleyball"]`).
-   **`interestsStructured`**: **This is extremely powerful.** A detailed object that gives the AI specific, "encyclopedic" knowledge about its passions. This is where you list specific artists, teams, movies, or concepts. The AI is prompted to draw from this to create plausible, detailed conversation.
    -   **Example:**
        ```javascript
        interestsStructured: {
            "Music": ["Anitta", "La Casa de Papel", "Tifo Football"],
            "Football Teams": ["FC Barcelona (favorite)", "River Plate (admires)"],
            "Film Directors": ["Glauber Rocha", "Pedro Almodóvar"]
        }
        ```

### 4.2. `dislikes`
Crucial for creating a non-agreeable, realistic persona. A character is defined as much by what they don't like as what they do.
-   **Sports Fans:** MUST include their main rival team(s).
-   **Foodies:** Include food pet peeves (`"pineapple on pizza"`).
-   **Artists:** Include aesthetic disagreements (`"brutalist architecture"`).

### 4.3. `personalityTraits` & `quirksOrHabits`
-   **`personalityTraits`**: A list of core adjectives describing their character (`["witty", "cynical", "loyal"]`).
-   **`quirksOrHabits`**: Specific, actionable habits that the AI can mention or allude to (`["Always carries a camera", "Quotes Russian authors during lessons"]`).

### 4.4. `conversationTopics` & `conversationNoGos`
-   **`conversationTopics`**: A list of subjects the persona enjoys discussing. This helps guide the AI's conversational direction.
-   **`conversationNoGos`**: Topics the persona will actively avoid or shut down (e.g., `"Aggressive political debates"`).

### 4.5. `keyLifeEvents`, `countriesVisited`, `education`
These properties build the persona's "memory" and backstory.
-   **`keyLifeEvents`**: Define significant moments. `"event": "Won a regional chess tournament", "date": "2018-05-20"`.
-   **`countriesVisited`**: Gives the persona travel experience. `"country": "Japan", "highlights": "Loved the food in Osaka"`.
-   **`education`**: Their formal educational background.

---

## 5. Technical & Language Configuration

This section is vital for the application to function correctly.

### 5.1. `languageRoles`
Defines the persona's role for each language they know. This is used for filtering (e.g., find a "tutor").
-   **Example:** `languageRoles: { "French": ["tutor", "native"], "Spanish": ["learner"] }`

### 5.2. `languageSpecificCodes`
This object is the technical backbone for voice calls and language display.
-   **`languageCode`**: The official BCP-47 code (e.g., `"fr-FR"`, `"en-US"`).
-   **`flagCode`**: The two-letter country code for the UI flag (e.g., `"fr"`, `"us"`).
-   **`liveApiVoiceName`**: The voice model for the call (see Voice Guide below).
-   **`liveApiSpeechLanguageCodeOverride` (CRITICAL):**
    -   **Use Case:** For languages not officially supported for speech recognition by Google's Live API (e.g., Swedish, Norwegian, Thai, Finnish, Tagalog).
    -   **Action:** Set this to a supported language the persona is fluent in, almost always `"en-US"`.
    -   **Result:** This allows the persona to speak their native language with a realistic accent, as the AI generates text in the target language but uses the English voice model to speak it. **This prevents the call from failing.**

---

## 6. Gemini Live API Voice Guide

Choose a `liveApiVoiceName` that best fits the gender, age, and personality of your persona.

| Voice Name | Perceived Gender | Perceived Age Range | Likely Personality / Best Use Case                                         |
| :--------- | :--------------- | :------------------ | :------------------------------------------------------------------------- |
| **`Orus`**     | Male             | 30s - 50s           | Deep, mature, professional. Good for tutors, experts, fathers, formal characters. |
| **`Charon`**   | Male             | 30s - 50s           | Calm, clear, standard. Excellent for storytellers, historians, calm professionals. |
| **`Fenrir`**   | Male             | 20s - 30s           | Standard, slightly younger male voice. Good for developers, professionals, Gen X/Millennial men. |
| **`Puck`**     | Male             | Late Teens - 20s    | Younger, casual, friendly. Perfect for Gen Z, gamers, students, casual friends. |
|            |                  |                     |                                                                            |
| **`Leda`**     | Female           | 30s - 40s           | Clear, professional, warm. Great for tutors, professionals, mothers, articulate characters. |
| **`Kore`**     | Female           | 20s - 30s           | Standard, friendly, slightly younger female voice. Versatile for designers, students, friends. |
| **`Aoede`**    | Female           | 20s - 30s           | Pleasant, warm, engaging. Good for social workers, artists, nurturing characters (nonna). |
| **`Zephyr`**   | Female           | Late Teens - 20s    | Younger, bright, friendly. Perfect for Gen Z, K-pop fans, students, bubbly personalities. |

---

By meticulously defining these properties, you build a rich, consistent, and believable character that our system can bring to life.
