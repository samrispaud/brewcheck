# /ingest — Add new gluten test data

Guided ingestion of new beer gluten test data into `data/sources/`.

## What you accept

- A URL to a webpage with test results
- A path to a local CSV or text file
- Raw pasted data (CSV rows, a table, a list)
- A description of a source ("the NFA 2009 test results")

## CSV schema (all source files use this)

```
beer,producer,style,source,test_type,test_result,testing_source,testing_notes,test_date
```

| Field | Description |
|---|---|
| `beer` | Beer name as printed on label |
| `producer` | Brewery name |
| `style` | Beer style (Lager, Pilsner, IPA, etc.) |
| `source` | Short label for the data source (e.g. `nfa_2009`, `cookingaldante`) |
| `test_type` | Test kit name (e.g. `EZ Gluten`, `R5 ELISA`, `GlutenTox Home Kit`) |
| `test_result` | Result string (e.g. `Negative at 10ppm`, `Positive at 20ppm`) |
| `testing_source` | Full URL to the specific page/post, or empty |
| `testing_notes` | Notes about this specific test — keep close to original wording |
| `test_date` | `YYYY-MM-DD` — use `YYYY-01-01` if only year is known |

## Step-by-step

### 1. Fetch and parse

If given a URL, fetch the page and extract test result rows. If given a file or raw data, parse it directly. Normalize to the CSV schema above.

### 2. Identify the source file

Determine which file in `data/sources/` this data belongs to, based on the source website. If no matching file exists, propose a new filename (`{source_label}_results.csv`) and confirm with the user before creating it.

### 3. Check for duplicates

Read every existing CSV in `data/sources/`. For each incoming row, check if the same `(testing_source domain, test_date)` pair already exists in any CSV.

- If a duplicate is found: **stop and tell the user** which beer and source it conflicts with. Ask: overwrite, skip, or abort?
- If `testing_source` is empty, fall back to `(beer name normalized, test_type normalized, test_date)`.

### 4. Validate each row

Before writing, verify:
- `beer` and `test_result` are non-empty
- `test_result` follows the pattern `Negative at Xppm` / `Positive at Xppm` / `Detected` / `Not Detected` — if not, flag it and ask the user to confirm the value
- `test_date` is a valid date string — if only a year is mentioned, use `YYYY-01-01`
- No cell contains a newline (CSV rows must be single-line)

If a row fails validation and you can't infer the correct value, ask the user — don't guess.

### 5. Summarize before writing

Show the user a summary table of what will be added:

```
Source file:  data/sources/example_results.csv
New rows:     12
Duplicates skipped: 2
```

And a preview of the first few rows. Ask for confirmation before writing.

### 6. Write

Append the validated rows to the appropriate CSV file (or create it with the header row first). Preserve the existing header exactly.

### 7. Rebuild JSON

After writing, run:

```
python3 scripts/merge_csv_data.py
```

Report the final counts.

## Notes on testing_notes

- Keep notes as close to the original source wording as possible
- Strip cross-source commentary ("contradicted by X", "consistent with NFA", "per site")
- Strip meta-narration ("in summary chart", "result unclear")
- Each note should describe only the observation for that specific test row
- If the original has no useful note, leave the field empty
