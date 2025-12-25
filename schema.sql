-- Table to store gluten testing results for beers
CREATE TABLE beer_test_results (
    -- Unique identifier for each test result record
    id SERIAL PRIMARY KEY,

    -- Name of the beer tested (e.g., "60 Minute IPA")
    beer VARCHAR(255) NOT NULL,

    -- Brewery or producer name (e.g., "Dogfish Head Brewery")
    producer VARCHAR(255) NOT NULL,

    -- Beer style category (e.g., "IPA", "Stout", "Lager")
    style VARCHAR(100) NOT NULL,

    -- Source/format of the beer tested (e.g., "Bottle", "Can", "Draft")
    source VARCHAR(50) NOT NULL,

    -- Type/brand of gluten test used (e.g., "Reveal 3-D for Gliadin")
    test_type VARCHAR(255) NOT NULL,

    -- Result of the test (e.g., "Negative", "Positive", "Very High Positive at 20+ ppm")
    test_result VARCHAR(100) NOT NULL,

    -- URL to tester website or name of the person/organization who performed the test
    testing_source VARCHAR(500),

    -- Additional observations or notes about the test or consumption experience
    testing_notes TEXT,

    -- Date when the test was performed
    test_date DATE NOT NULL,

    -- Timestamp when the record was created
    created_at TIMESTAMP DEFAULT NOW(),

    -- Timestamp when the record was last updated
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comment to the table itself
COMMENT ON TABLE beer_test_results IS 'Stores gluten testing results for various beers';
