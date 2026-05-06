# BrewCheck

A web app that helps users assess gluten levels in beers, both those officially labeled gluten-free and those that aren't labeled gluten-free but may consistently test below 20 ppm, evidenced by at-home test results and community inputs. If you have questions, feedback, or want to contribute in some way, please reach out to me (samrispaud@gmail.com)!

You can use the app by visiting this site on any device: https://samrispaud.github.io/brewcheck/

## Why

I have celiac disease, and I love beer. Popular beers (Corona, Heineken, Modelo) aren't labeled gluten-free. But community testing has shown many of them actually test below 20 ppm, the FDA's threshold for the "gluten-free" label. When I started researching community test results, I found some but limited evidence buried deep across the internet. It wasn't accessible, and no one was looking across multiple test results and sources, so I decided to fix this. Enter BrewCheck.

BrewCheck takes a scientific approach: aggregate the best community test results, distill them into clear insights, and make them searchable from your phone. At a bar, looking at a draft list, or before buying a six-pack.

Use at your own risk. This is not medical advice but should be used to help people make their own decisions across the spectrum of gluten sensitivity, intolerance, and celiac disease. I hope that some folks will also find this and be motivated to contribute their findings if they have them, but they are not public yet.

## What it does

- **Search.** Type a beer name, or a question.
- **Voice search.** Tap the mic and say the name. Works on Chrome, Edge, and Safari. Firefox shows a fallback.
- **Menu scan.** Take or upload a photo of a beer menu. OCR runs in the browser via Tesseract.js — best-effort, 5–15 seconds on a phone.

Results are color-coded against the FDA's 20 ppm gluten-free threshold. Beers with inconsistent batch results are flagged separately.

## Data

250+ beers, sourced from:

- GlutenInBeer.blogspot.com
- LowGluten.org
- CookingAlDante.com
- SmartGurlSolutions.com
- NFA 2009 Research (Swedish Food Administration)

## Contributing

Questions, feedback, or interested in helping? Email samrispaud@gmail.com.
