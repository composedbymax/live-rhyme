# Rhyming App

A simple web-based app that finds rhyming words using a pronunciation dictionary.

## How It Works

- The app loads a pronunciation dictionary file (`dict.txt`) in CMU format.
- When a user inputs a word and clicks the "Find Rhymes" button (or presses Enter), the app:
  1. Looks up the word's phonemes.
  2. Identifies the rhyme key (starting from the last stressed vowel sound).
  3. Finds and displays all other words with the same rhyme key.

## How to Use

1. Make sure `dict.txt` (CMU Pronouncing Dictionary format) is in the same directory as the HTML file.
2. Open `index.html` (or the HTML file) in a browser.
3. Type a word into the input field.
4. Click **Find Rhymes** or press **Enter**.
5. View a list of rhyming words below.

## Requirements

- Modern browser with JavaScript enabled.
- `dict.txt` file formatted like the CMU Pronouncing Dictionary:
