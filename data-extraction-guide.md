# Beer Gluten Test Data Extraction Guide

## Objective
Extract beer gluten testing information from unstructured text or websites and insert into the beer_test_results database.

## All Fields Required
1. **beer** - Beer name (REQUIRED)
2. **producer** - Brewery/producer name (REQUIRED)
3. **style** - Beer style (REQUIRED)
4. **source** - Bottle/Can/Draft (REQUIRED)
5. **test_type** - Name of test used (REQUIRED)
6. **test_result** - Test outcome with PPM (REQUIRED)
7. **testing_source** - URL or tester name (REQUIRED)
8. **testing_notes** - Additional observations (REQUIRED)
9. **test_date** - Date when test was performed (REQUIRED, format: YYYY-MM-DD)

## Critical Rules

### 1. Consistency Check (ALWAYS DO THIS FIRST)
Before inserting data, query existing database entries to maintain consistency:

```sql
-- Check for existing producer names
SELECT DISTINCT producer FROM beer_test_results WHERE producer ILIKE '%search_term%';

-- Check for existing beer names by producer
SELECT DISTINCT beer FROM beer_test_results WHERE producer = 'exact_producer_name';

-- Check for existing style values
SELECT DISTINCT style FROM beer_test_results;
```

**Always use existing values when they match** to avoid duplicates like:
- ❌ "DogFish Head" vs "Dogfish Head Brewery"
- ❌ "60 Minute IPA" vs "60 min ipa" vs "Dogfish 60 Min"
- ❌ "IPA" vs "India Pale Ale"

### 2. Test Result Format (MANDATORY)
All test results MUST include PPM value based on test sensitivity:

**Format:** `[Result] at [PPM]ppm`

Examples:
- ✅ "Negative at 5ppm"
- ✅ "Positive at 20ppm"
- ✅ "High Positive at 20ppm"
- ✅ "Very High Positive at 20ppm"
- ❌ "Negative" (missing PPM)
- ❌ "Positive" (missing PPM)

### 3. Missing Data Handling
If ANY required field is missing:
1. Attempt to infer from context
2. Check similar entries in database
3. If still missing, STOP and ask user for the missing information

### 4. Web Scraping Strategy
When scraping data from websites:

**Use Task tool with general-purpose agent when:**
- Scraping multiple pages (10+ individual test result pages)
- WebFetch fails to extract table data (returns only CSS/JS)
- Page has dynamic content or requires JavaScript rendering
- Need to follow multiple links and aggregate data

**Use WebFetch when:**
- Quick single-page data extraction
- Page content is simple and directly accessible
- Testing/validating data structure before full scrape

**Important:**
- If WebFetch returns only styling/scripts without actual data, switch to Task tool immediately
- Task tool agents can handle complex multi-page scraping more reliably
- Always start with the provided URL - don't search for alternatives

## Extraction Workflow

### Step 1: Parse Input
Look for:
- Beer names (in quotes, titles, bold)
- Brewery names ("Brewery", "Brewing", "Co.")
- Style keywords (IPA, Stout, Lager, Pilsner, Ale)
- Source (bottle, can, draft, tap, keg)
- Test names (Reveal, EZ Gluten, Nima)
- Results (Negative, Positive, ppm values)
- Test date (explicit dates, or extract from URL paths like YYYY/MM)
- URLs or tester names
- Notes/observations

### Step 2: Check Database for Consistency
Query database for:
- Existing producer names (match fuzzy)
- Existing beer names for that producer
- Existing style values
- Common test_type formats

### Step 3: Normalize Values
- **producer**: Use exact match from database OR ask user to confirm new entry
- **beer**: Use exact match from database OR ask user to confirm new entry
- **style**: Use exact match from database OR ask user to confirm new entry
- **source**: Standardize to "Bottle", "Can", or "Draft"
- **test_result**: MUST include "at [X]ppm" format
- **testing_source**: Full URL or full name of tester
- **test_date**: Format as YYYY-MM-DD (extract from URL if needed, default to 1st of month if only YYYY-MM available)

### Step 4: Validate Before Insert
Checklist:
- [ ] All 9 fields have values
- [ ] test_result includes "at [X]ppm"
- [ ] beer/producer/style match existing entries (if applicable)
- [ ] source is "Bottle", "Can", or "Draft"
- [ ] test_date is in YYYY-MM-DD format

### Step 5: Generate SQL
Create INSERT statement only after all validations pass.

### Step 6: Save SQL File
Save the SQL INSERT statements to a file following this naming convention:

**Format:** `YYYY-MM-DD_source-website_description.sql`

Examples:
- `2025-12-23_gluteninbeer-blogspot_beer_test_results.sql`
- `2025-12-23_reddit-celiac_beer_test_results.sql`
- `2025-12-23_personal-testing_beer_test_results.sql`

**Important:**
- DO NOT save CSV files - the database is the source of truth
- Only save SQL INSERT files for tracking and importing data
- Each scraping/extraction task should have its own dated SQL file

## Example Extraction

**Input:**
"I tested Dogfish Head's 60 Minute IPA from a bottle using the Reveal 3-D test. Result was Negative. I drank it with no issues. Source: https://example.com/test"

**Extraction Process:**

1. Check database:
```sql
SELECT DISTINCT producer FROM beer_test_results WHERE producer ILIKE '%dogfish%';
-- Returns: "Dogfish Head Brewery"

SELECT DISTINCT beer FROM beer_test_results WHERE producer = 'Dogfish Head Brewery';
-- Returns: "60 Minute IPA"
```

2. Extracted data:
- beer: "60 Minute IPA" ✅ (matches existing)
- producer: "Dogfish Head Brewery" ✅ (matches existing)
- style: "IPA" (need to confirm/check database)
- source: "Bottle" ✅
- test_type: "Reveal 3-D for Gliadin" ✅
- test_result: ❌ "Negative" → Need PPM! Ask: "What is the sensitivity of the Reveal 3-D test?"
- testing_source: "https://example.com/test" ✅
- testing_notes: "Consumed with no ill effects" ✅
- test_date: "2024-01-15" ✅

3. After getting PPM (5ppm):
- test_result: "Negative at 5ppm" ✅

4. Generate INSERT:
```sql
INSERT INTO beer_test_results (
    beer, producer, style, source, test_type,
    test_result, testing_source, testing_notes, test_date
) VALUES (
    '60 Minute IPA',
    'Dogfish Head Brewery',
    'IPA',
    'Bottle',
    'Reveal 3-D for Gliadin',
    'Negative at 5ppm',
    'https://example.com/test',
    'Consumed with no ill effects',
    '2024-01-15'
);
```
