#!/usr/bin/env python3
"""
Process beer gluten test results from multiple SQL files and generate a CSV report.
Groups tests by unique beer + producer combination and calculates GF confidence scores.
"""

import re
import csv
from collections import defaultdict
from datetime import datetime

# File paths
SQL_FILES = [
    "/Users/samrispaud/development/gfb-directory/2025-12-23_gluteninbeer-blogspot_beer_test_results.sql",
    "/Users/samrispaud/development/gfb-directory/2025-12-23_lowgluten-org_beer_test_results.sql",
    "/Users/samrispaud/development/gfb-directory/2025-12-23_smartgurlsolutions_beer_test_results.sql",
    "/Users/samrispaud/development/gfb-directory/2025-12-23_cookingaldante_beer_test_results.sql"
]

OUTPUT_FILE = "/Users/samrispaud/development/gfb-directory/beer_gluten_test_results.csv"


def extract_ppm(test_result):
    """Extract PPM value from test_result string."""
    if not test_result:
        return None

    # Match patterns like "Negative at 5ppm", "Positive at 20ppm", etc.
    match = re.search(r'at (\d+)ppm', test_result, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def is_negative(test_result):
    """Check if test result is negative."""
    if not test_result:
        return False
    return 'negative' in test_result.lower()


def parse_insert_statement(line):
    """Parse a single INSERT VALUES line and extract test data."""
    # Match the VALUES portion with all fields
    pattern = r"\('([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']*(?:''[^']*)*)'\)"

    match = re.search(pattern, line)
    if not match:
        return None

    beer = match.group(1).replace("''", "'")
    producer = match.group(2).replace("''", "'")
    style = match.group(3).replace("''", "'")
    source = match.group(4).replace("''", "'")
    test_type = match.group(5).replace("''", "'")
    test_result = match.group(6).replace("''", "'")
    testing_source = match.group(7).replace("''", "'")
    testing_notes = match.group(8).replace("''", "'")
    test_date = match.group(9).replace("''", "'")

    return {
        'beer': beer,
        'producer': producer,
        'style': style,
        'source': source,
        'test_type': test_type,
        'test_result': test_result,
        'testing_source': testing_source,
        'testing_notes': testing_notes,
        'test_date': test_date
    }


def calculate_gf_confidence(tests):
    """
    Calculate GF confidence score (1-5) based on test results.

    5/5: Multiple tests, ALL negative, very low ppm (≤5ppm)
    4/5: Multiple tests, ALL negative, moderate ppm (≤10ppm) OR single test at very low ppm (≤5ppm)
    3/5: Single test negative OR mostly negative with minor inconsistencies
    2/5: Mixed results (some negative, some positive)
    1/5: Consistently positive OR high positive
    """
    negative_tests = [t for t in tests if is_negative(t['test_result'])]
    positive_tests = [t for t in tests if not is_negative(t['test_result'])]

    num_tests = len(tests)
    num_negative = len(negative_tests)
    num_positive = len(positive_tests)

    # Get PPM values from negative tests
    negative_ppms = [extract_ppm(t['test_result']) for t in negative_tests]
    negative_ppms = [ppm for ppm in negative_ppms if ppm is not None]

    # Check for "High Positive" in results
    has_high_positive = any('high positive' in t['test_result'].lower() for t in positive_tests)

    # Consistently positive OR high positive
    if num_negative == 0 or has_high_positive:
        return 1

    # Mixed results
    if num_positive > 0 and num_negative > 0:
        return 2

    # All negative - determine score based on number of tests and PPM
    if num_positive == 0:
        max_ppm = max(negative_ppms) if negative_ppms else 0

        # Multiple tests, all negative, very low ppm (≤5ppm)
        if num_tests > 1 and max_ppm <= 5:
            return 5

        # Multiple tests, all negative, moderate ppm (≤10ppm)
        if num_tests > 1 and max_ppm <= 10:
            return 4

        # Single test at very low ppm (≤5ppm)
        if num_tests == 1 and max_ppm <= 5:
            return 4

        # Single test negative or mostly negative with minor inconsistencies
        return 3

    return 3


def process_sql_files():
    """Process all SQL files and group tests by beer + producer."""
    beer_tests = defaultdict(list)

    for sql_file in SQL_FILES:
        print(f"Processing {sql_file}...")

        with open(sql_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('('):
                    test_data = parse_insert_statement(line)
                    if test_data:
                        # Create unique key: beer + producer (normalized)
                        key = (test_data['beer'].lower().strip(),
                               test_data['producer'].lower().strip())
                        beer_tests[key].append(test_data)

    return beer_tests


def create_csv(beer_tests):
    """Create CSV file with all test results."""
    # Find maximum number of tests for any single beer
    max_tests = max(len(tests) for tests in beer_tests.values())
    print(f"\nMaximum tests per beer: {max_tests}")

    # Create CSV headers
    headers = ['beer', 'producer', 'style', 'gf_confidence_score']
    for i in range(1, max_tests + 1):
        headers.extend([
            f'test_type_{i}',
            f'test_result_{i}',
            f'test_date_{i}',
            f'test_link_{i}',
            f'test_notes_{i}'
        ])

    # Prepare rows
    rows = []
    for (beer_lower, producer_lower), tests in beer_tests.items():
        # Use the original case from the first test
        beer = tests[0]['beer']
        producer = tests[0]['producer']
        style = tests[0]['style']

        # Calculate GF confidence score
        gf_score = calculate_gf_confidence(tests)

        # Sort tests by date (newest first)
        tests_sorted = sorted(tests, key=lambda x: x['test_date'], reverse=True)

        row = {
            'beer': beer,
            'producer': producer,
            'style': style,
            'gf_confidence_score': gf_score
        }

        # Add test data
        for i, test in enumerate(tests_sorted, 1):
            row[f'test_type_{i}'] = test['test_type']
            row[f'test_result_{i}'] = test['test_result']
            row[f'test_date_{i}'] = test['test_date']
            row[f'test_link_{i}'] = test['testing_source']
            row[f'test_notes_{i}'] = test['testing_notes']

        rows.append(row)

    # Sort by GF confidence score (highest first), then by beer name
    rows.sort(key=lambda x: (-x['gf_confidence_score'], x['beer']))

    # Write CSV
    print(f"\nWriting {len(rows)} beers to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)

    print(f"CSV file created successfully!")

    # Print statistics
    print(f"\nStatistics:")
    print(f"Total unique beers: {len(rows)}")
    score_counts = defaultdict(int)
    for row in rows:
        score_counts[row['gf_confidence_score']] += 1
    print(f"\nGF Confidence Score Distribution:")
    for score in sorted(score_counts.keys(), reverse=True):
        print(f"  Score {score}: {score_counts[score]} beers")


if __name__ == "__main__":
    print("Beer Gluten Test Results Processor")
    print("=" * 50)

    beer_tests = process_sql_files()
    print(f"\nTotal unique beer + producer combinations: {len(beer_tests)}")

    create_csv(beer_tests)
    print("\nDone!")
