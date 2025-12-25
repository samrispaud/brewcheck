#!/usr/bin/env python3
"""
Deduplicate beers that have same name + brewery after normalization.
Merge their test results and recalculate GF confidence scores.
"""

import json
from collections import defaultdict

def calculate_gf_score(test_results):
    """
    Calculate GF confidence score based on test results.

    Score logic:
    5 = Very Safe: All tests < 10 ppm, 2+ tests
    4 = Safe: All tests < 20 ppm, 2+ tests
    3 = Use Caution: Mixed results or single test < 20 ppm
    2 = Batch Variation: Some tests pass, some fail
    1 = Not Recommended: Tests >= 20 ppm or no detectable gluten
    """
    if not test_results:
        return 1

    # Extract PPM values from test results
    ppm_values = []
    for result in test_results:
        test_str = result['testResult'].lower()

        # Try to extract PPM value
        import re
        match = re.search(r'(\d+\.?\d*)\s*ppm', test_str)
        if match:
            ppm_values.append(float(match.group(1)))
        elif 'negative' in test_str and 'ppm' in test_str:
            # "Negative at 5ppm" means below detection limit
            match = re.search(r'(\d+\.?\d*)\s*ppm', test_str)
            if match:
                ppm_values.append(float(match.group(1)) / 2)  # Assume half the detection limit

    if not ppm_values:
        # No PPM data, use conservative score
        return 3

    max_ppm = max(ppm_values)
    min_ppm = min(ppm_values)
    avg_ppm = sum(ppm_values) / len(ppm_values)

    # Check for batch variation (wide range)
    has_variation = (max_ppm - min_ppm) > 10 and max_ppm >= 20

    if has_variation:
        return 2  # Batch variation
    elif max_ppm < 10 and len(ppm_values) >= 2:
        return 5  # Very safe
    elif max_ppm < 20 and len(ppm_values) >= 2:
        return 4  # Safe
    elif max_ppm < 20:
        return 3  # Use caution (single test or borderline)
    else:
        return 1  # Not recommended

def merge_duplicate_beers(beers):
    """
    Merge beers with same name + brewery.
    Combine test results and recalculate GF scores.
    """
    # Group by name + brewery
    beer_groups = defaultdict(list)

    for beer in beers:
        key = (beer['name'], beer['brewery'])
        beer_groups[key].append(beer)

    # Merge duplicates
    merged_beers = []
    merge_report = []

    for (name, brewery), group in beer_groups.items():
        if len(group) == 1:
            # No duplicates, keep as is
            merged_beers.append(group[0])
        else:
            # Multiple entries - merge them
            merge_report.append({
                'name': name,
                'brewery': brewery,
                'count': len(group),
                'styles': list(set([b['style'] for b in group]))
            })

            # Combine all test results
            all_test_results = []
            test_ids_seen = set()

            for beer in group:
                for test in beer['testResults']:
                    # Deduplicate by test ID
                    if test['id'] not in test_ids_seen:
                        all_test_results.append(test)
                        test_ids_seen.add(test['id'])

            # Sort by date (newest first)
            all_test_results.sort(key=lambda x: x['testDate'], reverse=True)

            # Recalculate GF score
            new_gf_score = calculate_gf_score(all_test_results)

            # Use first beer as template, but with merged data
            merged_beer = group[0].copy()
            merged_beer['testResults'] = all_test_results
            merged_beer['gfConfidenceScore'] = new_gf_score

            # Pick most common style
            styles = [b['style'] for b in group]
            style_counts = defaultdict(int)
            for style in styles:
                style_counts[style] += 1
            merged_beer['style'] = max(style_counts.items(), key=lambda x: x[1])[0]

            merged_beers.append(merged_beer)

    return merged_beers, merge_report

def main():
    print("🔄 Deduplicating beers...\n")

    # Load normalized beer data
    with open('/Users/samrispaud/development/gf-beer-helper/beer_data.json', 'r') as f:
        beers = json.load(f)

    print(f"Loaded {len(beers)} beers")

    # Find and merge duplicates
    merged_beers, merge_report = merge_duplicate_beers(beers)

    print(f"After merging: {len(merged_beers)} unique beers")
    print(f"Merged {len(beers) - len(merged_beers)} duplicates\n")

    # Show merge report
    if merge_report:
        print("=== Beers Merged ===\n")
        for item in sorted(merge_report, key=lambda x: -x['count']):
            print(f"{item['name']} ({item['brewery']})")
            print(f"  Merged {item['count']} entries")
            print(f"  Styles: {', '.join(item['styles'])}")

            # Show original beers
            originals = [b for b in beers if b['name'] == item['name'] and b['brewery'] == item['brewery']]
            for orig in originals:
                print(f"    - {orig['style']}, GF:{orig['gfConfidenceScore']}/5, {len(orig['testResults'])} tests")

            # Show merged result
            merged = next(b for b in merged_beers if b['name'] == item['name'] and b['brewery'] == item['brewery'])
            print(f"  → Merged: {merged['style']}, GF:{merged['gfConfidenceScore']}/5, {len(merged['testResults'])} tests")
            print()

    # Save merged data
    output_file = '/Users/samrispaud/development/gf-beer-helper/beer_data_merged.json'
    with open(output_file, 'w') as f:
        json.dump(merged_beers, f, indent=2)

    print(f"✅ Saved {len(merged_beers)} unique beers to beer_data_merged.json")

    # Show Corona Extra as example
    print("\n=== Corona Extra Example ===\n")
    corona_beers = [b for b in merged_beers if b['name'] == 'Corona Extra']
    for beer in corona_beers:
        print(f"{beer['name']} ({beer['brewery']})")
        print(f"  Style: {beer['style']}")
        print(f"  GF Score: {beer['gfConfidenceScore']}/5")
        print(f"  Test Results: {len(beer['testResults'])}")

if __name__ == '__main__':
    main()
