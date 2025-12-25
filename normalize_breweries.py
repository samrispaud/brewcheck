#!/usr/bin/env python3
"""
Normalize brewery names and create separate breweries table.

Research sources:
- Stella Artois: Owned by Anheuser-Busch InBev (https://www.whoownsmybeer.com/beer/stella-artois/)
- Corona: Owned by Grupo Modelo (subsidiary of AB InBev) (https://en.wikipedia.org/wiki/Grupo_Modelo)
- Peroni: Owned by Asahi (https://en.wikipedia.org/wiki/Peroni_Brewery)
"""

import json
import uuid
from collections import defaultdict

# Brewery normalization mapping
# Format: "current_name" -> "canonical_name"
BREWERY_MAPPING = {
    # Anheuser-Busch InBev family
    "Anheuser-Busch": "Anheuser-Busch InBev",
    "AB InBev": "Anheuser-Busch InBev",
    "Stella Artois": "Anheuser-Busch InBev",  # Brewery field, not beer
    "Beck's Brewery": "Anheuser-Busch InBev",
    "Bass Brewers Ltd": "Anheuser-Busch InBev",
    "Budějovický Budvar": "Budweiser Budvar",  # Keep separate (Czech, not AB InBev)

    # Grupo Modelo (owned by AB InBev, but keep as separate brand)
    "Corona": "Grupo Modelo",
    "Cerveceria Modelo": "Grupo Modelo",
    "Modelo": "Grupo Modelo",
    "Pacifico": "Grupo Modelo",

    # Heineken family
    "Heineken Brouwerijen": "Heineken",
    "Amstel": "Heineken",
    "Amstel Brouwerij": "Heineken",

    # Molson Coors family
    "Coors": "Molson Coors",
    "Coors Brewing Company": "Molson Coors",
    "Miller": "Molson Coors",
    "Miller Brewing Company": "Molson Coors",

    # Asahi family
    "Asahi Beer Ltd.": "Asahi",
    "Peroni": "Asahi",  # Owned by Asahi

    # Carlsberg
    "Carlsberg Group": "Carlsberg",

    # Duvel Moortgat
    "Brouwerij Duvel Moortgat": "Duvel Moortgat",

    # Sapporo
    "Sapporo Breweries": "Sapporo",

    # Stone Brewing
    "Stone Brewery": "Stone Brewing",

    # Tsingtao
    "Tsingtao Brewery Company": "Tsingtao Brewery",

    # Pabst
    "Pabst Brewing Company": "Pabst",

    # New Belgium
    "New Belgium Brewing": "New Belgium",

    # Fort George
    "Fort George Brewing": "Fort George",

    # Sierra Nevada
    "Sierra Nevada Brewing Co": "Sierra Nevada",

    # Foster's
    "Foster's Group": "Foster's",

    # Diageo (owns Guinness)
    "Guinness": "Diageo",

    # Koninklijke Grolsch
    "Koninklijke Grolsch": "Grolsch",

    # Samuel Adams
    "Samuel Adams": "Boston Beer Company",
}

def normalize_brewery_name(brewery_name):
    """Normalize a brewery name to its canonical form."""
    return BREWERY_MAPPING.get(brewery_name, brewery_name)

def create_breweries_table(beers):
    """Create a separate breweries table from beer data."""
    breweries = {}
    brewery_beers = defaultdict(list)

    # Collect all unique canonical brewery names
    for beer in beers:
        canonical_name = normalize_brewery_name(beer['brewery'])

        if canonical_name not in breweries:
            brewery_id = str(uuid.uuid4())
            breweries[canonical_name] = {
                "id": brewery_id,
                "name": canonical_name
            }

        brewery_beers[canonical_name].append(beer['name'])

    # Convert to list
    brewery_list = list(breweries.values())

    # Sort by name
    brewery_list.sort(key=lambda x: x['name'])

    return brewery_list, breweries

def update_beers_with_brewery_ids(beers, breweries_map):
    """Update beers to reference brewery IDs instead of names."""
    updated_beers = []

    for beer in beers:
        canonical_name = normalize_brewery_name(beer['brewery'])
        brewery_id = breweries_map[canonical_name]['id']

        updated_beer = beer.copy()
        updated_beer['breweryId'] = brewery_id
        # Keep brewery name for backwards compatibility during transition
        updated_beer['brewery'] = canonical_name

        updated_beers.append(updated_beer)

    return updated_beers

def main():
    print("🍺 Normalizing brewery data...\n")

    # Load current beer data
    with open('/Users/samrispaud/development/gf-beer-helper/beer_data.json', 'r') as f:
        beers = json.load(f)

    print(f"Loaded {len(beers)} beers")

    # Create breweries table
    breweries_list, breweries_map = create_breweries_table(beers)

    print(f"Found {len(breweries_list)} unique breweries (after normalization)")

    # Show normalization changes
    print("\n=== Brewery Normalization Changes ===\n")
    changes = defaultdict(list)
    for beer in beers:
        original = beer['brewery']
        canonical = normalize_brewery_name(original)
        if original != canonical:
            changes[canonical].append(original)

    for canonical, originals in sorted(changes.items()):
        unique_originals = sorted(set(originals))
        print(f"{canonical}")
        for orig in unique_originals:
            count = originals.count(orig)
            print(f"  ← {orig} ({count} beer{'s' if count > 1 else ''})")
        print()

    # Update beers with brewery IDs
    updated_beers = update_beers_with_brewery_ids(beers, breweries_map)

    # Save breweries table
    breweries_file = '/Users/samrispaud/development/gf-beer-helper/breweries.json'
    with open(breweries_file, 'w') as f:
        json.dump(breweries_list, f, indent=2)

    print(f"✅ Saved {len(breweries_list)} breweries to breweries.json")

    # Save updated beers
    beers_file = '/Users/samrispaud/development/gf-beer-helper/beer_data_normalized.json'
    with open(beers_file, 'w') as f:
        json.dump(updated_beers, f, indent=2)

    print(f"✅ Saved {len(updated_beers)} beers to beer_data_normalized.json")

    # Show top 20 breweries by beer count
    print("\n=== Top 20 Breweries by Beer Count ===\n")
    brewery_counts = defaultdict(int)
    for beer in updated_beers:
        brewery_counts[beer['brewery']] += 1

    for brewery, count in sorted(brewery_counts.items(), key=lambda x: (-x[1], x[0]))[:20]:
        print(f"{count:3d}  {brewery}")

if __name__ == '__main__':
    main()
