```
 _      ___ __     __ _____ 
| |    |_ _|\ \   / /| ____|
| |___  | |  \ \ / / |  _|  
|_____||___|  \_\_/  |_____|
 ____   _   _ __   __ __  __  _____  _  _ 
|  _ \ | | | | \\ // |  \/  || ____|| || |
| |_) || |_| |  V V  | |\/| ||  _|  |_||_|
|_| \_\|_| |_|  |_|  |_|  |_||_____|(_)(_)
```



Created By Max Warren

A simple web app that finds rhymes for words using a phonetic dictionary.

## Features

- Sort results alphabetically or by syllable count

## How It Works

- Loads a CMU Pronouncing Dictionary file (`dict.txt`)
- Parses phonemes and syllables
- Matches rhymes using stressed vowel sounds
- Renders results dynamically in the browser

## File Structure

- `index.html` – Main app UI and logic
- `dict.txt` – Required dictionary file (CMU format)

## Setup

1. Place `dict.txt` in the same folder as `index.html`
2. Open `index.html` in a browser with a local sever

## Note

- Works entirely in-browser with one inital network load, no requests per word.