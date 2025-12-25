# BrewCheck iOS App

A personal-use iOS app that helps assess beer gluten safety by analyzing menu photos, voice input, or manual text against a database of 187 beers with verified gluten test results.

## Project Overview

**Status**: Planning
**Platform**: iOS 16+
**Framework**: SwiftUI
**Architecture**: MVVM with local JSON data
**Dependencies**: None (Apple frameworks only)

## Technology Stack

- **UI**: SwiftUI
- **Speech Recognition**: Apple Speech Framework
- **OCR**: Apple Vision Framework
- **Data Storage**: Local JSON bundle
- **State Management**: `@Observable` macro
- **Pattern Matching**: Custom fuzzy matcher with Levenshtein distance

## File Structure

```
BrewCheck/
├── BrewCheckApp.swift
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

## Git Workflow

After completing each milestone:
1. Verify the milestone's acceptance criteria are met
2. Test the feature visually on device/simulator
3. User will confirm milestone completion
4. Commit changes: `git add . && git commit -m "feat: [milestone description]"`
5. Push to remote: `git push origin main`

---

## Milestone 1: Foundation - Runnable App with Search

**Goal**: Create a working iOS app that can load beer data and perform text-based searches with full detail views.

**Visual Test**: Type "corona" in search box, see matching beers with safety indicators, tap to view full test results.

### Tasks

#### 1.1 Data Preparation

Create Python script to convert CSV to JSON:

```bash
# Location: /Users/samrispaud/development/gf-beer-helper/
# File: convert_csv_to_json.py
```

Script requirements:
- Read `beer_gluten_test_results.csv`
- Generate unique UUIDs for beers and test results
- Structure: `{ id, name, brewery, style, gfConfidenceScore, testResults[] }`
- Output: `beer_data.json`

Run conversion:
```bash
python3 convert_csv_to_json.py
```

Verify output (should show 187 beers):
```bash
python3 -c "import json; data = json.load(open('beer_data.json')); print(f'{len(data)} beers')"
```

#### 1.2 Xcode Project Setup

Create new Xcode project:
- **Name**: BrewCheck
- **Interface**: SwiftUI
- **Language**: Swift
- **iOS Deployment Target**: 16.0
- **Bundle ID**: `com.personal.brewcheck`
- **Location**: `/Users/samrispaud/development/gf-beer-helper/BrewCheck`

Configure Info.plist (right-click Info.plist → Open As → Source Code):
```xml
<key>NSCameraUsageDescription</key>
<string>BrewCheck uses the camera to scan menus for beer names.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>BrewCheck needs photo library access to select menu images.</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>BrewCheck uses speech recognition to help you quickly look up beers by voice.</string>

<key>NSMicrophoneUsageDescription</key>
<string>BrewCheck needs microphone access for voice search.</string>
```

Add beer_data.json:
- Drag `beer_data.json` into Xcode project
- ✅ Check "Copy items if needed"
- ✅ Check "Add to targets: BrewCheck"
- Verify in Target Membership

Create folder groups in Xcode:
- Models/
- Data/
- Services/
- Views/
- Utilities/
- Resources/ (contains beer_data.json)

#### 1.3 Core Data Models

Create `Models/Beer.swift` (see detailed implementation in ios-app-implementation-plan.md lines 158-284):
- `Beer` struct with computed properties for display and safety
- `TestResult` struct with PPM extraction
- `SafetyLevel` enum with colors and SF Symbols icons
- `BeerMatch` struct for search results with confidence scoring

#### 1.4 Query Preprocessing & Fuzzy Matching

Create `Utilities/QueryPreprocessor.swift` (lines 302-388):
- Extracts beer names from natural language queries
- Removes question words, filler words, gluten phrases
- Example: "is coors light gluten free?" → "coors light"

Create `Data/FuzzyMatcher.swift` (lines 392-543):
- Four matching strategies:
  1. Exact match (100% confidence)
  2. Contains/substring matching
  3. Token matching (word order)
  4. Levenshtein distance (typo tolerance)
- Threshold-based filtering (default 0.5)
- Results sorted by confidence then GF score

Create `Data/BeerDatabase.swift` (lines 547-632):
- `@Observable` class for state management
- Loads JSON from bundle asynchronously
- `search()` with natural language preprocessing
- `searchMultiple()` for OCR text arrays
- Deduplication logic

#### 1.5 Search UI

Create `Services/RecommendationEngine.swift` (lines 653-747):
- Ranks results by confidence → GF score → test count
- `generateExplanation()` produces safety assessment text
- `getUnknownBeerGuidance()` for beers not in database

Create `Views/SearchView.swift` (lines 750-854):
- TextField with real-time search (minimum 2 chars)
- `BeerResultRow` component with safety indicator, name, brewery, style badge, confidence percentage
- NavigationStack with beer detail navigation
- Empty state with ContentUnavailableView

Create `Views/BeerDetailView.swift` (lines 859-937):
- Safety level header with icon and score
- Safety assessment section (generated explanation)
- Test results list with dates, types, results, notes, source links
- Disclaimer footer

Update `BrewCheckApp.swift` (lines 939-970):
- Create `@State` BeerDatabase instance
- Show loading state while database loads
- Show error state if loading fails
- Show SearchView when ready, passing database via `.environment()`

### Acceptance Criteria

- [ ] `beer_data.json` exists with 187 beers
- [ ] Xcode project builds successfully
- [ ] App launches showing loading screen, then search interface
- [ ] Typing "corona" shows Corona Extra with safety indicator
- [ ] Typing "is blue moon gluten free?" shows Blue Moon Belgian White
- [ ] Tapping a result navigates to detail view
- [ ] Detail view shows all test results with dates and PPM values
- [ ] Empty search shows ContentUnavailableView
- [ ] Console prints "✅ Loaded 187 beers"

### Visual Test Instructions

1. Run app on iOS Simulator (iPhone 15 Pro recommended)
2. Wait for "Loaded 187 beers" in console
3. Type "coors" → should see Coors Light and Coors Banquet
4. Verify safety icons (checkmark.seal.fill = green for very safe)
5. Verify GF scores displayed as badges (4/5, 5/5, etc.)
6. Tap "Coors Light" → detail view opens
7. Verify test results section shows test dates and PPM values
8. Verify links are tappable (safari opens)
9. Navigate back
10. Type "is guinness safe?" → should clean query and find Guinness Draught
11. Verify batch variation warning (score = 2, orange icon)

### Git Commit

```bash
git init
git add .
git commit -m "feat: milestone 1 - foundation with text search

- Convert CSV data to JSON format (187 beers)
- Create Xcode project with SwiftUI
- Implement Beer/TestResult/SafetyLevel models
- Build fuzzy matcher with 4 strategies (exact, contains, token, Levenshtein)
- Add natural language query preprocessing
- Create search UI with real-time filtering
- Add beer detail view with test results
- Configure Info.plist permissions for future milestones"
```

---

## Milestone 2: Voice Search

**Goal**: Enable hands-free beer lookups using Apple Speech Recognition.

**Visual Test**: Tap microphone button, say "Blue Moon", see search field populate and results appear.

### Tasks

#### 2.1 Speech Recognizer Service

Create `Services/SpeechRecognizer.swift` (lines 992-1065):
- `@Observable` class with AVAudioEngine and SFSpeechRecognizer
- `requestAuthorization()` async method
- `startListening()` with real-time transcription
- `stopListening()` cleanup
- Audio session configuration for recording
- Published `transcript`, `isListening`, `errorMessage` properties

#### 2.2 Voice Search Button

Create `Views/VoiceSearchButton.swift` (lines 1070-1109):
- Button with mic icon (switches to mic.fill when listening)
- Red icon during recording, blue when idle
- Requests permissions on first use
- Shows alert if permission denied
- Populates `$searchText` binding on stop

#### 2.3 Update Search View

Modify `Views/SearchView.swift`:

Replace the TextField section with:
```swift
HStack {
    TextField("Search beers or ask \"is [beer] gluten free?\"", text: $searchText)
        .textFieldStyle(.roundedBorder)

    VoiceSearchButton(searchText: $searchText)
        .padding(.leading, 4)
}
.padding()
```

### Acceptance Criteria

- [ ] Mic button appears in search view
- [ ] Tapping mic requests speech/microphone permissions
- [ ] Icon turns red and shows mic.fill during recording
- [ ] Speaking "Corona" populates search field
- [ ] Search results update automatically from voice input
- [ ] Tapping mic again stops recording
- [ ] Natural language works: "is heineken gluten free?" → finds Heineken
- [ ] Permission denied shows alert with Settings guidance
- [ ] Works with background noise (reasonable tolerance)

### Visual Test Instructions

1. Run app on physical iOS device (voice input requires device, not simulator)
2. Tap microphone button
3. Grant permissions when prompted
4. Speak clearly: "Blue Moon"
5. Verify search field updates in real-time
6. Verify results appear automatically
7. Tap mic again to stop (or wait for auto-stop)
8. Test natural language: tap mic, say "is stella artois safe for celiac?"
9. Verify query is cleaned and Stella Artois appears
10. Test permission denial: Settings → Privacy → Speech Recognition → toggle off app → verify alert appears

### Git Commit

```bash
git add .
git commit -m "feat: milestone 2 - voice search

- Add SpeechRecognizer service with real-time transcription
- Create VoiceSearchButton component with visual feedback
- Integrate voice input into SearchView
- Handle speech/microphone permissions gracefully
- Support natural language queries via voice"

git push origin main
```

---

## Milestone 3: Camera & OCR Menu Scanning

**Goal**: Take photos of beer menus and automatically extract/search for beers.

**Visual Test**: Tap "Scan Menu" tab, take photo of beer menu, see extracted beers with safety ratings.

### Tasks

#### 3.1 Text Recognition Service

Create `Services/TextRecognizer.swift` (lines 1145-1217):
- `recognizeText(from:)` async method using VNRecognizeTextRequest
- Returns array of recognized strings from image
- `extractSearchTerms()` filters out prices, headers, numbers
- Deduplicates results
- Configures Vision for accurate recognition with language correction

#### 3.2 Camera Capture View

Create `Views/CameraCaptureView.swift` (lines 1220-1266):
- UIViewControllerRepresentable wrapper for UIImagePickerController
- Camera source type
- Coordinator handles image selection and cancellation
- Dismisses sheet on completion
- Binds selected image to SwiftUI state

#### 3.3 Menu Scan View

Create `Views/MenuScanView.swift` (lines 1272-1370):
- NavigationStack with empty state (camera icon)
- "Take Photo" button triggers camera sheet
- Image preview after capture
- ProgressView during OCR processing
- List of matched beers with BeerResultRow components
- "Scan Another" button to reset
- Navigation to BeerDetailView on tap
- Uses `database.searchMultiple()` for batch matching

#### 3.4 Tab View Navigation

Create `Views/ContentView.swift` (lines 1375-1397):
- TabView with two tabs
- Tab 1: SearchView (magnifying glass icon)
- Tab 2: MenuScanView (camera icon)

Update `BrewCheckApp.swift` (lines 1403-1412):
- Replace SearchView with ContentView in WindowGroup
- Maintains database loading/error states

### Acceptance Criteria

- [ ] "Scan Menu" tab appears in TabView
- [ ] Tapping "Take Photo" opens camera
- [ ] Photo capture works and shows preview
- [ ] "Scanning menu..." progress indicator appears
- [ ] OCR extracts text from menu image
- [ ] Prices ($12.99) and headers ("ON TAP") are filtered out
- [ ] Multiple beers in one menu are all found
- [ ] Results show with safety indicators and GF scores
- [ ] Tapping result navigates to detail view
- [ ] "Scan Another" resets the view
- [ ] "No beers found" message appears for non-menu images
- [ ] Camera permissions handled gracefully

### Visual Test Instructions

#### On Physical Device (Required for Camera)

1. Run app on iPhone/iPad with camera
2. Tap "Scan Menu" tab
3. Tap "Take Photo" button
4. Grant camera permission if prompted
5. Take photo of beer menu (test with a real menu or printed list)
6. Wait for processing (1-3 seconds)
7. Verify beer names are extracted and matched
8. Verify safety icons and scores appear
9. Tap a result → detail view opens
10. Go back, tap "Scan Another"
11. Test with non-menu image (should show "No beers found")

#### Test Menu Example

Create a test document with these beers:
```
DRAFT BEER

Corona Extra ........ $8
Blue Moon ........... $9
Stella Artois ....... $10
Guinness Draught .... $11
Omission Lager ...... $12
```

Take photo and verify all 5 beers are found.

### Git Commit

```bash
git add .
git commit -m "feat: milestone 3 - camera and OCR menu scanning

- Add TextRecognizer service with Vision framework OCR
- Create CameraCaptureView for photo capture
- Build MenuScanView with image preview and results
- Add ContentView with tab navigation (Search + Scan Menu)
- Filter OCR results to remove prices and headers
- Support batch beer matching from menu photos"

git push origin main
```

---

## Milestone 4: Polish & Production Ready

**Goal**: Refine UX, handle edge cases, add accessibility, prepare for App Store.

**Visual Test**: App feels polished with smooth interactions, helpful empty states, and no crashes on edge cases.

### Tasks

#### 4.1 Loading & Empty States

Improve SearchView:
- Add debounce to text search (300ms delay)
- Show subtle ProgressView during search
- Enhance empty state messaging
- Add "Did you mean...?" suggestions for near-misses

Improve MenuScanView:
- Add "Processing OCR..." state with animation
- Handle camera not available (simulator)
- Show helpful tips in empty state ("Point camera at menu")

#### 4.2 Disclaimer & Info

Create `Views/DisclaimerView.swift`:
- Detailed explanation of batch variation
- Data source credits and links
- FDA gluten-free standard (< 20ppm)
- Personal use disclaimer
- Contact information for corrections

Add info button to SearchView navigation bar:
```swift
.toolbar {
    ToolbarItem(placement: .navigationBarTrailing) {
        Button {
            showingDisclaimer = true
        } label: {
            Image(systemName: "info.circle")
        }
    }
}
.sheet(isPresented: $showingDisclaimer) {
    DisclaimerView()
}
```

#### 4.3 Edge Case Handling

Add validation and error handling:
- Minimum query length (2 chars) - already implemented
- All-caps normalization - already in FuzzyMatcher
- Empty database error state
- Camera permission denied: show Settings deeplink
- Speech permission denied: show helpful alert
- OCR timeout handling (> 10 seconds)
- Network-free operation verification

Add unit tests (optional but recommended):
```swift
// BrewCheckTests/
// - QueryPreprocessorTests.swift
// - FuzzyMatcherTests.swift
// - BeerModelTests.swift
```

Test cases:
- "is coors light gluten free?" → "coors light"
- "Cornona" → matches "Corona Extra"
- "Guin" → matches "Guinness Draught"
- Empty query → no results
- All numbers "12345" → no results

#### 4.4 Accessibility

Add accessibility labels:
```swift
// VoiceSearchButton
.accessibilityLabel(speechRecognizer.isListening ? "Stop recording" : "Start voice search")

// BeerResultRow safety icon
.accessibilityLabel("\(match.beer.safetyLevel.rawValue) beer")

// Camera button
.accessibilityLabel("Take photo of beer menu")
```

Test with VoiceOver:
- Enable VoiceOver: Settings → Accessibility → VoiceOver
- Navigate entire app using gestures
- Verify all buttons announce correctly
- Verify results are readable in order

Color contrast verification:
- Green (very safe) vs white background: ✅
- Orange (caution) vs white background: ✅
- Red (unsafe) vs white background: ✅
- All badges use white text on colored backgrounds: ✅

Dynamic Type support:
- Use `.font(.headline)` etc. instead of fixed sizes
- Test with larger text: Settings → Accessibility → Display & Text Size → Larger Text

#### 4.5 Performance Optimization

Verify performance:
- Database loads in < 1 second
- Search returns results in < 100ms (for 187 beers)
- OCR completes in < 5 seconds for typical menu
- No memory leaks (use Instruments)
- Smooth scrolling in results list

#### 4.6 App Icon & Launch Screen

Create app icon:
- 1024x1024 PNG
- Design: Beer mug with checkmark or GF symbol
- Use SF Symbols or custom design
- Add to Assets.xcassets/AppIcon

Configure launch screen:
- Use default LaunchScreen.storyboard
- Or create custom SwiftUI launch screen
- Show app icon with loading indicator

### Acceptance Criteria

- [ ] Debounced search prevents excessive matching
- [ ] All empty states show helpful guidance
- [ ] Disclaimer accessible from info button
- [ ] All permissions (camera, mic, speech) handled gracefully with Settings deeplinks
- [ ] VoiceOver can navigate entire app
- [ ] All colors meet WCAG AA contrast standards
- [ ] App works with Dynamic Type (larger text)
- [ ] No crashes with edge cases (empty query, special chars, etc.)
- [ ] Database loads reliably on every launch
- [ ] OCR handles poor quality images gracefully
- [ ] App icon appears on home screen
- [ ] Launch screen shows during startup
- [ ] Tested on iOS 16, iOS 17, iOS 18 (if available)

### Final Testing Checklist

Run through all features:

**Manual Search**
- [ ] Type "corona" → finds Corona Extra
- [ ] Type "is blue moon gluten free?" → finds Blue Moon
- [ ] Type "asdfasdf" → shows "No matches"
- [ ] Type single char → no search triggered

**Voice Search**
- [ ] Speak "Heineken" → populates field and shows results
- [ ] Speak "is stella safe for celiac?" → cleans and searches
- [ ] Mic icon changes color during recording
- [ ] Stop button works

**Menu Scan**
- [ ] Take photo of menu → extracts beers
- [ ] Menu with 5+ beers → finds all
- [ ] Menu with prices → filters out prices
- [ ] Non-menu photo → shows "No beers found"
- [ ] "Scan Another" resets successfully

**Detail Views**
- [ ] Tap any result → opens detail
- [ ] Test result links open in Safari
- [ ] Batch variation beers show warning (GF score = 2)
- [ ] Very safe beers show positive message (GF score = 5)
- [ ] PPM values extracted and displayed correctly

**Edge Cases**
- [ ] Launch with airplane mode → still works
- [ ] Deny camera permission → helpful alert
- [ ] Deny microphone permission → helpful alert
- [ ] Very long beer name → UI doesn't break
- [ ] Rotate device → layout adapts

**Accessibility**
- [ ] VoiceOver announces all elements
- [ ] Larger text setting works
- [ ] Color blindness friendly (icons + text)

### Git Commit

```bash
git add .
git commit -m "feat: milestone 4 - polish and production ready

- Add debounced search and loading states
- Create DisclaimerView with data sources and warnings
- Handle all edge cases (permissions, empty states, errors)
- Add comprehensive accessibility labels
- Verify VoiceOver navigation
- Test Dynamic Type support
- Add app icon and launch screen
- Optimize performance for 187-beer database
- Add deeplinks to Settings for denied permissions
- Complete testing checklist on physical device"

git push origin main
```

---

## Testing Documentation

### Natural Language Query Examples

These should all work in manual search AND voice search:

| Query | Expected Result |
|-------|----------------|
| "is coors light gluten free?" | Coors Light |
| "can i drink corona?" | Corona Extra |
| "is guinness safe for celiac?" | Guinness Draught |
| "tell me about stella artois" | Stella Artois |
| "what about heineken?" | Heineken |
| "omission" | Omission Lager, Omission Pale Ale |
| "BLUE MOON" | Blue Moon Belgian White |
| "Cornona" (typo) | Corona Extra |
| "Guin" (partial) | Guinness Draught |

### Fuzzy Matching Test Cases

| Input | Expected Match | Confidence |
|-------|---------------|-----------|
| "Blue Moon" | Blue Moon Belgian White | 1.0 (exact) |
| "blue" | Blue Moon Belgian White | >0.7 (contains) |
| "Cornona" | Corona Extra | >0.7 (Levenshtein) |
| "Omission" | Multiple Omission beers | 1.0 |
| "HEINEKEN" | Heineken | 1.0 |
| "Becks" | Beck's | >0.8 |

### Safety Level Color Coding

| GF Score | Safety Level | Color | Icon | Example Beer |
|----------|-------------|-------|------|-------------|
| 5 | Very Safe | Green | checkmark.seal.fill | Omission Lager |
| 4 | Safe | Light Green | checkmark.circle.fill | Corona Extra |
| 3 | Use Caution | Orange | exclamationmark.triangle.fill | - |
| 2 | Batch Variation | Dark Orange | exclamationmark.2 | Guinness Draught |
| 1 | Not Recommended | Red | xmark.circle.fill | Regular beers |

### OCR Test Scenarios

**Good Menu Photo**
- Clear text
- Good lighting
- Straight angle
- Expected: 90%+ extraction accuracy

**Challenging Photo**
- Angled perspective
- Dim lighting
- Handwritten text
- Expected: 60-80% extraction, some beers found

**Invalid Photo**
- Landscape/person
- No text
- Expected: "No beers found" message

---

## Future Enhancements

Not included in initial milestones (post-v1.0):

- **Barcode Scanning**: Use Vision barcode detection for bottled beers
- **Favorites**: Save frequently searched beers
- **Search History**: Recent searches with quick access
- **Export**: Share search results via Messages/Email
- **Widget**: Today View widget for quick search
- **Apple Watch**: Companion app with voice search
- **Siri Shortcuts**: "Hey Siri, is Corona gluten free?"
- **User Contributions**: Submit new test results with approval flow
- **Dark Mode Refinements**: Custom color schemes
- **Batch Variation Alerts**: Push notifications for updated test results
- **Brewery Profiles**: Detailed brewery information
- **Alternative Suggestions**: "Try these GF beers instead"

---

## Data Source

Beer test results sourced from:
- GlutenInBeer.blogspot.com
- LowGluten.org
- CookingAldante.com
- SmartGurlSolutions.com

Data last updated: December 2025
Total beers: 187

---

## Build Settings

**Development**
- Xcode 15.0+
- Swift 5.9+
- iOS Deployment Target: 16.0
- SwiftUI + Observation framework

**Distribution**
- Code signing: Personal team
- Distribution method: TestFlight → App Store
- Privacy manifest: Not required (no tracking, no network)
- App category: Food & Drink
- Content rating: 4+

---

## Notes

- This app works 100% offline (no network required)
- No analytics or tracking
- No user data collected
- Personal use only - not medical advice
- Batch variation disclaimer required for score=2 beers
- All test data is read-only (no user modifications in v1.0)
