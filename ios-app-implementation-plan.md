# GlutenFreeBeer iOS App - Implementation Plan

A personal-use iOS app that helps assess beer gluten safety by analyzing menu photos, voice input, or manual text against a database of 187 beers with verified gluten test results.

## Technical Stack

- **Platform**: iOS 16+
- **UI Framework**: SwiftUI
- **Speech**: Apple Speech framework (`SFSpeechRecognizer`)
- **OCR**: Apple Vision framework (`VNRecognizeTextRequest`)
- **Data**: Local JSON bundled in app
- **Architecture**: Simple MVVM, no external dependencies

---

## Milestone 0: Data Preparation

**Goal**: Convert CSV data to JSON format for app bundle.

### Tasks

1. **Create Python conversion script** at `/Users/samrispaud/development/gfb-directory/convert_csv_to_json.py`:

```python
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
                    beers[key]['testResults'].append({
                        'id': str(uuid.uuid4()),
                        'testType': test_type,
                        'testResult': row[f'test_result_{i}'],
                        'testDate': row[f'test_date_{i}'],
                        'testLink': row.get(f'test_link_{i}', '') or None,
                        'testNotes': row.get(f'test_notes_{i}', '') or None
                    })

    output = list(beers.values())

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"✅ Converted {len(output)} beers to {OUTPUT_FILE}")

if __name__ == '__main__':
    convert_csv_to_json()
```

2. **Run the conversion**:
```bash
cd /Users/samrispaud/development/gfb-directory
python3 convert_csv_to_json.py
```

3. **Verify output**:
```bash
ls -lh beer_data.json
python3 -c "import json; data = json.load(open('beer_data.json')); print(f'{len(data)} beers loaded')"
```

### Acceptance Criteria

- ☐ `beer_data.json` created in gfb-directory
- ☐ File contains 187 beers
- ☐ JSON is valid and includes nested testResults
- ☐ Each beer has id, name, brewery, style, gfConfidenceScore, testResults

---

## Milestone 1: Xcode Project Setup

**Goal**: Create Xcode project with proper configuration and folder structure.

### Tasks

1. **Create new Xcode project**:
   - Name: `GlutenFreeBeer`
   - Interface: SwiftUI
   - Language: Swift
   - Minimum deployment: iOS 16.0
   - Bundle identifier: `com.personal.glutenfreebeer`
   - Location: `/Users/samrispaud/development/gfb-directory/GlutenFreeBeer`

2. **Configure Info.plist permissions** (Right-click Info.plist → Open As → Source Code):

```xml
<key>NSCameraUsageDescription</key>
<string>GlutenFreeBeer uses the camera to scan menus for beer names.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>GlutenFreeBeer needs photo library access to select menu images.</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>GlutenFreeBeer uses speech recognition to help you quickly look up beers by voice.</string>

<key>NSMicrophoneUsageDescription</key>
<string>GlutenFreeBeer needs microphone access for voice search.</string>
```

3. **Add beer_data.json to project**:
   - Drag `/Users/samrispaud/development/gfb-directory/beer_data.json` into Xcode
   - ✅ Check "Copy items if needed"
   - ✅ Check "Add to targets: GlutenFreeBeer"
   - Verify: File Inspector → Target Membership shows checkmark

4. **Create folder structure** (Groups in Xcode):
   - Models/
   - Data/
   - Services/
   - Views/
   - Utilities/

### Acceptance Criteria

- ☐ Xcode project builds successfully
- ☐ beer_data.json in project bundle
- ☐ All permissions configured in Info.plist
- ☐ Folder structure created

---

## Milestone 2: Core Data Models

**Goal**: Define all data structures for beers, tests, and matching.

### Tasks

1. **Create `Models/Beer.swift`**:

```swift
//
//  Beer.swift
//  GlutenFreeBeer
//

import Foundation
import SwiftUI

struct Beer: Identifiable, Codable, Hashable {
    let id: UUID
    let name: String
    let brewery: String
    let style: String
    let gfConfidenceScore: Int  // 1-5
    let testResults: [TestResult]

    var displayName: String {
        "\(name) (\(brewery))"
    }

    var safetyLevel: SafetyLevel {
        switch gfConfidenceScore {
        case 5: return .verySafe
        case 4: return .safe
        case 3: return .moderate
        case 2: return .risky
        default: return .unsafe
        }
    }

    var hasBatchVariation: Bool {
        gfConfidenceScore == 2
    }

    var testCount: Int {
        testResults.count
    }
}

struct TestResult: Codable, Identifiable, Hashable {
    let id: UUID
    let testType: String
    let testResult: String  // e.g., "Negative at 5ppm"
    let testDate: String
    let testLink: String?
    let testNotes: String?

    var ppmValue: Int? {
        let pattern = #"at (\d+)ppm"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else {
            return nil
        }

        let nsRange = NSRange(testResult.startIndex..<testResult.endIndex, in: testResult)
        guard let match = regex.firstMatch(in: testResult, options: [], range: nsRange),
              let range = Range(match.range(at: 1), in: testResult) else {
            return nil
        }

        return Int(testResult[range])
    }

    var isNegative: Bool {
        testResult.lowercased().contains("negative")
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        if let date = formatter.date(from: testDate) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }

        return testDate
    }
}

enum SafetyLevel: String {
    case verySafe = "Very Safe"
    case safe = "Safe"
    case moderate = "Use Caution"
    case risky = "Batch Variation"
    case unsafe = "Not Recommended"

    var color: Color {
        switch self {
        case .verySafe: return .green
        case .safe: return Color(red: 0.55, green: 0.76, blue: 0.29)  // #8BC34A
        case .moderate: return .orange
        case .risky: return Color(red: 1.0, green: 0.60, blue: 0.0)  // #FF9800
        case .unsafe: return .red
        }
    }

    var icon: String {
        switch self {
        case .verySafe: return "checkmark.seal.fill"
        case .safe: return "checkmark.circle.fill"
        case .moderate: return "exclamationmark.triangle.fill"
        case .risky: return "exclamationmark.2"
        case .unsafe: return "xmark.circle.fill"
        }
    }
}

struct BeerMatch: Identifiable {
    let id = UUID()
    let beer: Beer
    let matchConfidence: Double  // 0.0-1.0
    let matchType: MatchType

    enum MatchType {
        case exact
        case highConfidence    // >0.85
        case mediumConfidence  // 0.70-0.85
        case lowConfidence     // 0.50-0.70
    }

    var matchPercentage: Int {
        Int(matchConfidence * 100)
    }
}
```

### Acceptance Criteria

- ☐ Models compile without errors
- ☐ Beer struct conforms to Codable, Identifiable, Hashable
- ☐ SafetyLevel enum has colors and icons
- ☐ TestResult parses PPM values correctly

---

## Milestone 3: Data Loading & Matching Engine

**Goal**: Load beer database and implement fuzzy matching with natural language support.

### Tasks

1. **Create `Utilities/QueryPreprocessor.swift`**:

```swift
//
//  QueryPreprocessor.swift
//  GlutenFreeBeer
//
//  Extracts beer names from natural language queries
//

import Foundation

struct QueryPreprocessor {

    /// Extract beer name from natural language query
    /// Example: "is coors light gluten free?" → "coors light"
    static func extractBeerName(from query: String) -> String {
        var cleaned = query.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        // Remove punctuation
        cleaned = cleaned.trimmingCharacters(in: CharacterSet(charactersIn: "?.!,;:"))

        // Remove question words
        let questionWords = [
            "is ", "are ", "can ", "could ", "does ", "do ",
            "will ", "would ", "should ", "has ", "have ",
            "what about ", "how about ", "tell me about ",
            "check ", "find ", "search ", "look up "
        ]

        for word in questionWords {
            if cleaned.hasPrefix(word) {
                cleaned = String(cleaned.dropFirst(word.count))
            }
        }

        // Remove personal words
        let personalWords = ["i ", "i'm ", "me ", "my "]
        for word in personalWords {
            if cleaned.hasPrefix(word) {
                cleaned = String(cleaned.dropFirst(word.count))
            }
        }

        // Remove action verbs
        let actionVerbs = [
            "drink ", "have ", "get ", "buy ", "order ",
            "try ", "taste ", "consume "
        ]

        for verb in actionVerbs {
            if cleaned.hasPrefix(verb) {
                cleaned = String(cleaned.dropFirst(verb.count))
            }
        }

        // Remove gluten-related phrases
        let glutenPhrases = [
            "gluten free", "gluten-free", "glutenfree", "gf",
            "celiac safe", "celiac-safe", "safe for celiac",
            "for celiac", "with celiac", "gluten",
            "safe", "okay", "ok", "good"
        ]

        for phrase in glutenPhrases {
            cleaned = cleaned.replacingOccurrences(of: phrase, with: " ")
        }

        // Remove filler words
        let fillerWords = [
            " a ", " an ", " the ", " to ", " for ", " with ",
            " on ", " in ", " at ", " if ", " it ", " be "
        ]

        for filler in fillerWords {
            cleaned = cleaned.replacingOccurrences(of: filler, with: " ")
        }

        // Clean up multiple spaces
        cleaned = cleaned.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)

        // Final trim
        cleaned = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)

        return cleaned
    }
}
```

2. **Create `Data/FuzzyMatcher.swift`**:

```swift
//
//  FuzzyMatcher.swift
//  GlutenFreeBeer
//

import Foundation

struct FuzzyMatcher {
    private let database: [Beer]

    init(beers: [Beer]) {
        self.database = beers
    }

    func findMatches(query: String, threshold: Double = 0.5) -> [BeerMatch] {
        let normalized = normalize(query)

        guard !normalized.isEmpty else {
            return []
        }

        var results: [BeerMatch] = []

        for beer in database {
            let beerText = normalize("\(beer.name) \(beer.brewery)")

            // Strategy 1: Exact match
            if beerText == normalized {
                results.append(BeerMatch(
                    beer: beer,
                    matchConfidence: 1.0,
                    matchType: .exact
                ))
                continue
            }

            // Strategy 2: Contains (partial matches)
            if beerText.contains(normalized) || normalized.contains(beerText) {
                let shorter = min(normalized.count, beerText.count)
                let longer = max(normalized.count, beerText.count)
                let confidence = Double(shorter) / Double(longer)

                if confidence >= threshold {
                    results.append(BeerMatch(
                        beer: beer,
                        matchConfidence: confidence,
                        matchType: confidenceToType(confidence)
                    ))
                    continue
                }
            }

            // Strategy 3: Token matching (word order)
            let tokenScore = tokenMatchScore(query: normalized, target: beerText)
            if tokenScore >= threshold {
                results.append(BeerMatch(
                    beer: beer,
                    matchConfidence: tokenScore,
                    matchType: confidenceToType(tokenScore)
                ))
                continue
            }

            // Strategy 4: Levenshtein distance (typos)
            let distance = levenshteinDistance(normalized, beerText)
            let maxLength = max(normalized.count, beerText.count)
            let similarity = 1.0 - (Double(distance) / Double(maxLength))

            if similarity >= threshold {
                results.append(BeerMatch(
                    beer: beer,
                    matchConfidence: similarity,
                    matchType: confidenceToType(similarity)
                ))
            }
        }

        // Sort: confidence desc, then GF score desc
        return results.sorted {
            if abs($0.matchConfidence - $1.matchConfidence) > 0.001 {
                return $0.matchConfidence > $1.matchConfidence
            }
            return $0.beer.gfConfidenceScore > $1.beer.gfConfidenceScore
        }
    }

    // MARK: - Private Helpers

    private func normalize(_ text: String) -> String {
        text.lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: "'", with: "")
            .replacingOccurrences(of: "\"", with: "")
            .replacingOccurrences(of: ".", with: "")
    }

    private func tokenMatchScore(query: String, target: String) -> Double {
        let queryTokens = Set(query.split(separator: " ").map(String.init))
        let targetTokens = Set(target.split(separator: " ").map(String.init))

        guard !queryTokens.isEmpty && !targetTokens.isEmpty else {
            return 0.0
        }

        let intersection = queryTokens.intersection(targetTokens)
        let union = queryTokens.union(targetTokens)

        return Double(intersection.count) / Double(union.count)
    }

    private func levenshteinDistance(_ s1: String, _ s2: String) -> Int {
        let s1Array = Array(s1)
        let s2Array = Array(s2)
        let s1Length = s1Array.count
        let s2Length = s2Array.count

        var matrix = [[Int]](repeating: [Int](repeating: 0, count: s2Length + 1), count: s1Length + 1)

        for i in 0...s1Length {
            matrix[i][0] = i
        }
        for j in 0...s2Length {
            matrix[0][j] = j
        }

        for i in 1...s1Length {
            for j in 1...s2Length {
                let cost = s1Array[i - 1] == s2Array[j - 1] ? 0 : 1
                matrix[i][j] = min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                )
            }
        }

        return matrix[s1Length][s2Length]
    }

    private func confidenceToType(_ confidence: Double) -> BeerMatch.MatchType {
        if confidence >= 0.85 {
            return .highConfidence
        } else if confidence >= 0.70 {
            return .mediumConfidence
        } else {
            return .lowConfidence
        }
    }
}
```

3. **Create `Data/BeerDatabase.swift`**:

```swift
//
//  BeerDatabase.swift
//  GlutenFreeBeer
//

import Foundation

@Observable
class BeerDatabase {
    private(set) var beers: [Beer] = []
    private(set) var isLoaded = false
    var errorMessage: String?

    private var fuzzyMatcher: FuzzyMatcher?

    init() {
        Task {
            await loadData()
        }
    }

    @MainActor
    func loadData() async {
        guard let url = Bundle.main.url(forResource: "beer_data", withExtension: "json") else {
            errorMessage = "Failed to find beer_data.json"
            print("❌ ERROR: beer_data.json not found")
            return
        }

        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()

            self.beers = try decoder.decode([Beer].self, from: data)
            self.fuzzyMatcher = FuzzyMatcher(beers: self.beers)
            self.isLoaded = true

            print("✅ Loaded \(self.beers.count) beers")
        } catch {
            errorMessage = "Failed to load: \(error.localizedDescription)"
            print("❌ ERROR: \(error)")
        }
    }

    func search(_ query: String) -> [BeerMatch] {
        guard let matcher = fuzzyMatcher else {
            print("⚠️  Fuzzy matcher not initialized")
            return []
        }

        // Preprocess natural language queries
        let cleanedQuery = QueryPreprocessor.extractBeerName(from: query)

        print("🔍 Query: '\(query)' → Cleaned: '\(cleanedQuery)'")

        return matcher.findMatches(query: cleanedQuery, threshold: 0.5)
    }

    func searchMultiple(texts: [String]) -> [BeerMatch] {
        var allMatches: [Beer: BeerMatch] = [:]

        for text in texts {
            let matches = search(text)
            for match in matches {
                if let existing = allMatches[match.beer] {
                    // Keep higher confidence
                    if match.matchConfidence > existing.matchConfidence {
                        allMatches[match.beer] = match
                    }
                } else {
                    allMatches[match.beer] = match
                }
            }
        }

        return Array(allMatches.values).sorted {
            $0.matchConfidence > $1.matchConfidence
        }
    }

    func getBeer(byId id: UUID) -> Beer? {
        beers.first { $0.id == id }
    }
}
```

### Acceptance Criteria

- ☐ BeerDatabase loads 187 beers on init
- ☐ QueryPreprocessor: "is coors light gluten free?" → "coors light"
- ☐ FuzzyMatcher handles exact matches
- ☐ FuzzyMatcher handles partial matches ("Guin" → "Guinness")
- ☐ FuzzyMatcher handles typos ("Cornona" → "Corona")
- ☐ searchMultiple() deduplicates across multiple texts

---

## Milestone 4: Basic Search UI

**Goal**: Create functional manual text search interface with results display.

### Tasks

1. **Create `Services/RecommendationEngine.swift`**:

```swift
//
//  RecommendationEngine.swift
//  GlutenFreeBeer
//

import Foundation

struct RecommendationEngine {

    func rankResults(_ matches: [BeerMatch]) -> [BeerMatch] {
        return matches.sorted { m1, m2 in
            if abs(m1.matchConfidence - m2.matchConfidence) > 0.05 {
                return m1.matchConfidence > m2.matchConfidence
            }

            if m1.beer.gfConfidenceScore != m2.beer.gfConfidenceScore {
                return m1.beer.gfConfidenceScore > m2.beer.gfConfidenceScore
            }

            if m1.beer.testCount != m2.beer.testCount {
                return m1.beer.testCount > m2.beer.testCount
            }

            return m1.beer.name < m2.beer.name
        }
    }

    func generateExplanation(for beer: Beer) -> String {
        var explanation = ""

        switch beer.gfConfidenceScore {
        case 5:
            explanation = "✅ Excellent choice! This beer has multiple negative test results, all showing very low gluten levels (≤5ppm)."
        case 4:
            if beer.testCount > 1 {
                explanation = "✅ Good choice! Multiple tests show negative results at low gluten levels (≤10ppm)."
            } else {
                explanation = "✅ Good choice! Single test shows very low gluten levels (≤5ppm)."
            }
        case 3:
            explanation = "⚠️ Use caution. This beer has limited test data or shows some inconsistencies."
        case 2:
            explanation = "⚠️ BATCH VARIATION WARNING\n\nThis beer has mixed test results. Some batches test negative, others positive. Gluten levels may vary."
        case 1:
            explanation = "❌ NOT RECOMMENDED\n\nThis beer consistently tests positive for gluten (>20ppm) or shows high gluten levels."
        default:
            explanation = "Unknown safety profile."
        }

        explanation += "\n\n📊 Test Summary"
        explanation += "\nBased on \(beer.testCount) test(s):"

        let negativeTests = beer.testResults.filter { $0.isNegative }
        let positiveTests = beer.testResults.filter { !$0.isNegative }

        if !negativeTests.isEmpty {
            explanation += "\n• \(negativeTests.count) negative test(s)"
            if let lowestPPM = negativeTests.compactMap({ $0.ppmValue }).min() {
                explanation += " (lowest: \(lowestPPM)ppm)"
            }
        }

        if !positiveTests.isEmpty {
            explanation += "\n• \(positiveTests.count) positive test(s)"
        }

        explanation += "\n\n📏 FDA gluten-free standard: <20ppm"

        return explanation
    }

    func getUnknownBeerGuidance() -> String {
        """
        🔍 No Test Data Available

        This beer is not in our database. Here's what you should know:

        🔬 About Gluten in Beer:
        • Most traditional beers contain significant gluten (>20ppm)
        • Barley, wheat, and rye all contain gluten

        ⚠️ General Guidance:
        • If you have celiac disease, avoid untested beers
        • "Gluten-removed" beers may still trigger reactions
        • Look for certified gluten-free beers

        ✅ Safer Alternatives:
        • Certified gluten-free beers (made from gluten-free grains)
        • Beers with verified negative test results
        • Ciders, mead, or wine
        """
    }
}
```

2. **Create `Views/SearchView.swift`**:

```swift
//
//  SearchView.swift
//  GlutenFreeBeer
//

import SwiftUI

struct SearchView: View {
    @State private var searchText = ""
    @State private var results: [BeerMatch] = []
    @Environment(BeerDatabase.self) var database

    var body: some View {
        NavigationStack {
            VStack {
                TextField("Search beers or ask \"is [beer] gluten free?\"", text: $searchText)
                    .textFieldStyle(.roundedBorder)
                    .padding()
                    .onChange(of: searchText) { _, newValue in
                        performSearch(newValue)
                    }

                if results.isEmpty && !searchText.isEmpty {
                    ContentUnavailableView {
                        Label("No Matches", systemImage: "magnifyingglass")
                    } description: {
                        Text("Try a different beer name or check spelling")
                    }
                } else {
                    List(results) { match in
                        NavigationLink(value: match.beer) {
                            BeerResultRow(match: match)
                        }
                    }
                }
            }
            .navigationTitle("GlutenFreeBeer")
            .navigationDestination(for: Beer.self) { beer in
                BeerDetailView(beer: beer)
            }
        }
    }

    private func performSearch(_ query: String) {
        guard query.count >= 2 else {
            results = []
            return
        }

        results = database.search(query)
    }
}

struct BeerResultRow: View {
    let match: BeerMatch

    var body: some View {
        HStack {
            // Safety indicator
            Image(systemName: match.beer.safetyLevel.icon)
                .foregroundColor(match.beer.safetyLevel.color)
                .font(.title3)

            VStack(alignment: .leading, spacing: 4) {
                Text(match.beer.name)
                    .font(.headline)

                Text(match.beer.brewery)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                HStack {
                    Text(match.beer.style)
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(4)

                    if match.matchConfidence < 1.0 {
                        Text("\(match.matchPercentage)% match")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()

            // GF Score badge
            Text("\(match.beer.gfConfidenceScore)/5")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(match.beer.safetyLevel.color)
                .cornerRadius(8)
        }
        .padding(.vertical, 4)
    }
}
```

3. **Create `Views/BeerDetailView.swift`**:

```swift
//
//  BeerDetailView.swift
//  GlutenFreeBeer
//

import SwiftUI

struct BeerDetailView: View {
    let beer: Beer
    private let engine = RecommendationEngine()

    var body: some View {
        List {
            Section {
                HStack {
                    Image(systemName: beer.safetyLevel.icon)
                        .font(.largeTitle)
                        .foregroundColor(beer.safetyLevel.color)

                    VStack(alignment: .leading) {
                        Text(beer.safetyLevel.rawValue)
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("GF Score: \(beer.gfConfidenceScore)/5")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Section("Safety Assessment") {
                Text(engine.generateExplanation(for: beer))
                    .font(.body)
            }

            Section("Test Results (\(beer.testCount))") {
                ForEach(beer.testResults) { test in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(test.testType)
                                .font(.headline)
                            Spacer()
                            Text(test.formattedDate)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Text(test.testResult)
                            .font(.subheadline)
                            .foregroundColor(test.isNegative ? .green : .red)

                        if let notes = test.testNotes, !notes.isEmpty {
                            Text(notes)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        if let link = test.testLink, !link.isEmpty {
                            Link("View Source →", destination: URL(string: link)!)
                                .font(.caption)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            Section {
                Text("⚠️ Gluten levels can vary between batches. This data is for informational purposes only. Consult your doctor.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .navigationTitle(beer.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
```

4. **Update `GlutenFreeBeerApp.swift`**:

```swift
//
//  GlutenFreeBeerApp.swift
//  GlutenFreeBeer
//

import SwiftUI

@main
struct GlutenFreeBeerApp: App {
    @State private var database = BeerDatabase()

    var body: some Scene {
        WindowGroup {
            if database.isLoaded {
                SearchView()
                    .environment(database)
            } else if let error = database.errorMessage {
                ContentUnavailableView {
                    Label("Error", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(error)
                }
            } else {
                ProgressView("Loading beer database...")
            }
        }
    }
}
```

### Acceptance Criteria

- ☐ Can type beer name and see matching results
- ☐ Search works with natural language: "is corona gluten free?"
- ☐ Results show safety status with colors
- ☐ Can tap result to see full details
- ☐ Detail view shows all test results
- ☐ Empty state when no matches
- ☐ Search updates as user types

---

## Milestone 5: Voice Input

**Goal**: Add voice-to-text search using Apple's Speech framework.

### Tasks

1. **Create `Services/SpeechRecognizer.swift`**:

```swift
//
//  SpeechRecognizer.swift
//  GlutenFreeBeer
//

import Speech
import AVFoundation

@Observable
class SpeechRecognizer {
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    var transcript: String = ""
    var isListening: Bool = false
    var errorMessage: String?

    func requestAuthorization() async -> Bool {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
    }

    func startListening() throws {
        // Reset state
        recognitionTask?.cancel()
        recognitionTask = nil
        transcript = ""

        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        let recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        recognitionRequest.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            if let result = result {
                self.transcript = result.bestTranscription.formattedString
            }

            if error != nil || result?.isFinal == true {
                self.audioEngine.stop()
                inputNode.removeTap(onBus: 0)
                self.isListening = false
            }
        }

        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        isListening = true
    }

    func stopListening() {
        audioEngine.stop()
        recognitionTask?.finish()
        isListening = false
    }
}
```

2. **Create `Views/VoiceSearchButton.swift`**:

```swift
//
//  VoiceSearchButton.swift
//  GlutenFreeBeer
//

import SwiftUI

struct VoiceSearchButton: View {
    @Binding var searchText: String
    @State private var speechRecognizer = SpeechRecognizer()
    @State private var showPermissionAlert = false

    var body: some View {
        Button {
            Task {
                if speechRecognizer.isListening {
                    speechRecognizer.stopListening()
                    searchText = speechRecognizer.transcript
                } else {
                    let authorized = await speechRecognizer.requestAuthorization()
                    if authorized {
                        try? speechRecognizer.startListening()
                    } else {
                        showPermissionAlert = true
                    }
                }
            }
        } label: {
            Image(systemName: speechRecognizer.isListening ? "mic.fill" : "mic")
                .font(.title2)
                .foregroundColor(speechRecognizer.isListening ? .red : .blue)
        }
        .alert("Microphone Access Required", isPresented: $showPermissionAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Please enable microphone access in Settings.")
        }
    }
}
```

3. **Update `SearchView.swift` to add voice button**:

Add to SearchView:
```swift
HStack {
    TextField("Search beers...", text: $searchText)
        .textFieldStyle(.roundedBorder)

    VoiceSearchButton(searchText: $searchText)
        .padding(.leading, 4)
}
.padding()
```

### Acceptance Criteria

- ☐ App requests microphone/speech permissions on first use
- ☐ Tapping mic button starts listening with visual feedback (red icon)
- ☐ Speaking "Blue Moon" populates search field
- ☐ Tapping again stops listening
- ☐ Handles permission denied gracefully
- ☐ Natural language queries work via voice

---

## Milestone 6: Camera & OCR

**Goal**: Capture menu photos and extract beer names via OCR.

### Tasks

1. **Create `Services/TextRecognizer.swift`**:

```swift
//
//  TextRecognizer.swift
//  GlutenFreeBeer
//

import Vision
import UIKit

struct TextRecognizer {

    static func recognizeText(from image: UIImage) async throws -> [String] {
        guard let cgImage = image.cgImage else { return [] }

        return try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: [])
                    return
                }

                let recognizedStrings = observations.compactMap { observation in
                    observation.topCandidates(1).first?.string
                }

                continuation.resume(returning: recognizedStrings)
            }

            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            try? handler.perform([request])
        }
    }

    static func extractSearchTerms(from texts: [String]) -> [String] {
        var terms: [String] = []

        for text in texts {
            let cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)

            // Skip if too short
            guard cleaned.count > 2 else { continue }

            // Skip if looks like price
            if cleaned.contains("$") || cleaned.contains(".99") {
                continue
            }

            // Skip if all numbers
            if cleaned.allSatisfy({ $0.isNumber }) {
                continue
            }

            // Skip common headers
            let lower = cleaned.lowercased()
            if lower.contains("tap") || lower.contains("bottle") ||
               lower.contains("draft") || lower.contains("price") {
                continue
            }

            terms.append(cleaned)
        }

        return Array(Set(terms)) // Deduplicate
    }
}
```

2. **Create `Views/CameraCaptureView.swift`**:

```swift
//
//  CameraCaptureView.swift
//  GlutenFreeBeer
//

import SwiftUI
import UIKit

struct CameraCaptureView: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraCaptureView

        init(_ parent: CameraCaptureView) {
            self.parent = parent
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let uiImage = info[.originalImage] as? UIImage {
                parent.image = uiImage
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}
```

3. **Create `Views/MenuScanView.swift`**:

```swift
//
//  MenuScanView.swift
//  GlutenFreeBeer
//

import SwiftUI

struct MenuScanView: View {
    @State private var capturedImage: UIImage?
    @State private var recognizedTexts: [String] = []
    @State private var beerMatches: [BeerMatch] = []
    @State private var isProcessing = false
    @State private var showCamera = false
    @Environment(BeerDatabase.self) var database

    var body: some View {
        NavigationStack {
            VStack {
                if let image = capturedImage {
                    // Show results
                    ScrollView {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFit()
                            .frame(height: 200)
                            .cornerRadius(12)
                            .padding()

                        if isProcessing {
                            ProgressView("Scanning menu...")
                                .padding()
                        } else if beerMatches.isEmpty {
                            Text("No beers found in menu")
                                .foregroundColor(.secondary)
                                .padding()
                        } else {
                            Text("Found \(beerMatches.count) beer(s)")
                                .font(.headline)
                                .padding()

                            ForEach(beerMatches) { match in
                                NavigationLink(value: match.beer) {
                                    BeerResultRow(match: match)
                                        .padding(.horizontal)
                                }
                            }
                        }
                    }

                    Button("Scan Another") {
                        capturedImage = nil
                        beerMatches = []
                    }
                    .buttonStyle(.borderedProminent)
                    .padding()
                } else {
                    ContentUnavailableView {
                        Label("Scan a Menu", systemImage: "camera")
                    } description: {
                        Text("Take a photo of a beer menu to check gluten safety")
                    } actions: {
                        Button("Take Photo") {
                            showCamera = true
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
            }
            .navigationTitle("Scan Menu")
            .navigationDestination(for: Beer.self) { beer in
                BeerDetailView(beer: beer)
            }
            .sheet(isPresented: $showCamera) {
                CameraCaptureView(image: $capturedImage)
            }
            .onChange(of: capturedImage) { _, newImage in
                if let image = newImage {
                    Task {
                        await processImage(image)
                    }
                }
            }
        }
    }

    func processImage(_ image: UIImage) async {
        isProcessing = true

        do {
            let texts = try await TextRecognizer.recognizeText(from: image)
            let terms = TextRecognizer.extractSearchTerms(from: texts)
            beerMatches = database.searchMultiple(texts: terms)
        } catch {
            print("OCR Error: \(error)")
        }

        isProcessing = false
    }
}
```

4. **Create `Views/ContentView.swift` with tabs**:

```swift
//
//  ContentView.swift
//  GlutenFreeBeer
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            SearchView()
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }

            MenuScanView()
                .tabItem {
                    Label("Scan Menu", systemImage: "camera")
                }
        }
    }
}
```

5. **Update `GlutenFreeBeerApp.swift` to use ContentView**:

```swift
WindowGroup {
    if database.isLoaded {
        ContentView()
            .environment(database)
    } else if let error = database.errorMessage {
        // ... error view
    } else {
        ProgressView("Loading beer database...")
    }
}
```

### Acceptance Criteria

- ☐ Can take a photo of a menu
- ☐ OCR extracts text from image
- ☐ Extracted text is matched against database
- ☐ Shows all beers found in menu
- ☐ Handles "no beers found" gracefully
- ☐ Shows image preview after capture
- ☐ Can scan another menu

---

## Milestone 7: Polish & Deployment

**Goal**: Refine UX, add loading states, handle edge cases.

### Tasks

1. **Add loading indicators**:
   - Debounce text search (300ms)
   - Show ProgressView during OCR
   - Show searching state

2. **Add empty states**:
   - Create `Views/EmptyStateView.swift` for reusable empty states
   - Use ContentUnavailableView for no results
   - Handle camera not available (simulator)

3. **Add disclaimer view**:
   - Create info button in navigation bar
   - Explain batch variation
   - Link to data sources

4. **Handle edge cases**:
   - Very short queries (< 2 chars): don't search
   - All caps input: normalize (already handled)
   - Empty database: show error
   - Permission denials: show alerts

5. **Accessibility**:
   - Add `.accessibilityLabel()` to all buttons
   - Test with VoiceOver
   - Ensure color contrast meets standards

6. **Final testing**:
   - Test on physical device (camera, microphone)
   - Test all 3 input methods
   - Test natural language queries
   - Test OCR with real menu photos
   - Verify all 187 beers load correctly

### Acceptance Criteria

- ☐ No crashes on edge cases
- ☐ All states have appropriate UI feedback
- ☐ Disclaimer accessible from info button
- ☐ VoiceOver can navigate entire app
- ☐ App feels responsive
- ☐ Tested on physical device
- ☐ Natural language queries work in all input methods

---

## File Structure

```
GlutenFreeBeer/
├── GlutenFreeBeerApp.swift
├── ContentView.swift
├── Models/
│   └── Beer.swift
├── Data/
│   ├── BeerDatabase.swift
│   └── FuzzyMatcher.swift
├── Services/
│   ├── RecommendationEngine.swift
│   ├── SpeechRecognizer.swift
│   └── TextRecognizer.swift
├── Views/
│   ├── SearchView.swift
│   ├── MenuScanView.swift
│   ├── BeerDetailView.swift
│   ├── VoiceSearchButton.swift
│   └── CameraCaptureView.swift
├── Utilities/
│   └── QueryPreprocessor.swift
└── Resources/
    └── beer_data.json
```

---

## Testing Checklist

### Fuzzy Matching Tests
- ☐ "Blue Moon" matches "Blue Moon Belgian White"
- ☐ "Cornona" (typo) matches "Corona Extra"
- ☐ "Omission" matches both "Omission Lager" and "Omission Pale Ale"
- ☐ "Guin" matches "Guinness"
- ☐ "HEINEKEN" (all caps) matches "Heineken"
- ☐ "Becks" matches "Beck's"

### Natural Language Query Tests
- ☐ "is coors light gluten free?" → finds Coors Light
- ☐ "can i drink corona?" → finds Corona Extra
- ☐ "is guinness safe for celiac?" → finds Guinness Draught
- ☐ "tell me about stella artois" → finds Stella Artois
- ☐ "what about heineken?" → finds Heineken

### OCR Tests
- ☐ Clear menu photo → extracts beer names
- ☐ Filters out prices ($12.99)
- ☐ Filters out headers ("ON TAP", "BOTTLES")
- ☐ Handles multiple beers in one image
- ☐ Shows "no beers found" for non-menu images

### Voice Tests
- ☐ Clear speech → accurate transcription
- ☐ Natural language via voice works
- ☐ Real-time display updates
- ☐ Stop button works
- ☐ Permission denied handled gracefully

### UI/UX Tests
- ☐ Loading state shows during data load
- ☐ Empty results show appropriate message
- ☐ Batch variation (score 2) shows warning
- ☐ Test result links are tappable
- ☐ Navigation works correctly
- ☐ App works 100% offline

---

## Future Enhancements (Post-MVP)

Not for initial build:

- ☐ Barcode scanning for bottled/canned beers
- ☐ Favorites/search history
- ☐ User-added beers with JSON export
- ☐ Widget for quick access
- ☐ Apple Watch companion
- ☐ Share sheet integration
- ☐ Siri Shortcuts
- ☐ Dark mode refinements
- ☐ Export search results

---

## Implementation Timeline

**Estimated total**: 40-60 hours for personal project

- **Milestone 0**: Data Preparation (30 min)
- **Milestone 1**: Xcode Setup (1 hour)
- **Milestone 2**: Models (2-3 hours)
- **Milestone 3**: Database & Matching (6-8 hours)
- **Milestone 4**: Search UI (8-10 hours)
- **Milestone 5**: Voice Input (4-6 hours)
- **Milestone 6**: Camera & OCR (8-10 hours)
- **Milestone 7**: Polish & Testing (10-12 hours)

**Part-time (5-10 hrs/week)**: 6-8 weeks
**Full-time**: 2-3 weeks
