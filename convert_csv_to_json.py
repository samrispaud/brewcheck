#!/usr/bin/env python3
"""
Convert beer_gluten_test_results.csv to JSON format for iOS app.
Run this BEFORE creating the Xcode project.
"""
import csv
import json
import uuid

INPUT_FILE = 'beer_gluten_test_results.csv'
OUTPUT_FILE = 'beer_data.json'

def convert_csv_to_json():
    beers = {}

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = (row['beer'], row['producer'])

            if key not in beers:
                beers[key] = {
                    'id': str(uuid.uuid4()),
                    'name': row['beer'],
                    'brewery': row['producer'],
                    'style': row['style'],
                    'gfConfidenceScore': int(row['gf_confidence_score']),
                    'testResults': []
                }

            # Add test results (up to 4 tests per beer)
            for i in range(1, 5):
                test_type = row.get(f'test_type_{i}', '').strip()
                if test_type:
                    test_result = {
                        'id': str(uuid.uuid4()),
                        'testType': test_type,
                        'testResult': row[f'test_result_{i}'],
                        'testDate': row[f'test_date_{i}']
                    }

                    # Only add optional fields if they have values
                    test_link = row.get(f'test_link_{i}', '').strip()
                    if test_link:
                        test_result['testLink'] = test_link

                    test_notes = row.get(f'test_notes_{i}', '').strip()
                    if test_notes:
                        test_result['testNotes'] = test_notes

                    beers[key]['testResults'].append(test_result)

    output = list(beers.values())

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"✅ Converted {len(output)} beers to {OUTPUT_FILE}")

if __name__ == '__main__':
    convert_csv_to_json()
