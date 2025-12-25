//
//  Beer.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/25/25.
//

import Foundation
import SwiftUI

// MARK: - Test Result Model
struct TestResult: Codable, Identifiable {
    let id: String
    let testType: String
    let testResult: String
    let testDate: String
    let testLink: String?
    let testNotes: String?

    /// Extract PPM value from test result string
    var ppmValue: Double? {
        let result = testResult.lowercased()

        // Extract number before "ppm"
        if let range = result.range(of: #"(\d+\.?\d*)\s*ppm"#, options: .regularExpression) {
            let match = String(result[range])
            let numberString = match.replacingOccurrences(of: "ppm", with: "").trimmingCharacters(in: .whitespaces)
            return Double(numberString)
        }

        return nil
    }

    /// Check if test result is positive (gluten detected)
    var isPositive: Bool {
        let result = testResult.lowercased()
        return result.contains("positive")
    }

    /// Check if test result is negative (no/low gluten)
    var isNegative: Bool {
        let result = testResult.lowercased()
        return result.contains("negative")
    }

    /// Color for displaying test result
    var resultColor: Color {
        if isNegative {
            return .green  // Good - no gluten detected
        } else if isPositive {
            return .red  // Bad - gluten detected
        } else {
            // Unknown result type, use PPM if available
            if let ppm = ppmValue {
                return ppm < 20 ? .green : .red
            }
            return .secondary
        }
    }

    /// Icon for test result
    var resultIcon: String {
        if isNegative {
            return "✓"
        } else if isPositive {
            if let ppm = ppmValue, ppm >= 20 {
                return "⚠️"
            } else {
                return "⚠️"
            }
        } else {
            return ""
        }
    }

    /// Formatted display of test result
    var displayResult: String {
        return "\(testResult) \(resultIcon)"
    }

    /// Formatted test date
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

// MARK: - Safety Level Enum
enum SafetyLevel: String, Codable {
    case verySafe = "Very Safe"
    case safe = "Safe"
    case useCaution = "Use Caution"
    case batchVariation = "Batch Variation"
    case notRecommended = "Not Recommended"

    /// Color for UI display
    var color: Color {
        switch self {
        case .verySafe:
            return .green
        case .safe:
            return Color(red: 0.6, green: 0.8, blue: 0.4)
        case .useCaution:
            return .orange
        case .batchVariation:
            return Color(red: 0.9, green: 0.5, blue: 0.1)
        case .notRecommended:
            return .red
        }
    }

    /// SF Symbol icon name
    var iconName: String {
        switch self {
        case .verySafe:
            return "checkmark.seal.fill"
        case .safe:
            return "checkmark.circle.fill"
        case .useCaution:
            return "exclamationmark.triangle.fill"
        case .batchVariation:
            return "exclamationmark.2"
        case .notRecommended:
            return "xmark.circle.fill"
        }
    }
}

// MARK: - Beer Model
struct Beer: Codable, Identifiable {
    let id: String
    let name: String
    let brewery: String
    let style: String
    let gfConfidenceScore: Int
    let testResults: [TestResult]

    /// Computed safety level based on GF confidence score
    var safetyLevel: SafetyLevel {
        switch gfConfidenceScore {
        case 5:
            return .verySafe
        case 4:
            return .safe
        case 3:
            return .useCaution
        case 2:
            return .batchVariation
        default:
            return .notRecommended
        }
    }

    /// Formatted score display
    var scoreDisplay: String {
        return "\(gfConfidenceScore)/5"
    }

    /// Average PPM across all tests
    var averagePPM: Double? {
        let ppmValues = testResults.compactMap { $0.ppmValue }
        guard !ppmValues.isEmpty else { return nil }
        return ppmValues.reduce(0, +) / Double(ppmValues.count)
    }

    /// Lowest PPM found in tests
    var lowestPPM: Double? {
        return testResults.compactMap { $0.ppmValue }.min()
    }

    /// Highest PPM found in tests
    var highestPPM: Double? {
        return testResults.compactMap { $0.ppmValue }.max()
    }

    /// Check if beer has batch variation
    var hasBatchVariation: Bool {
        return gfConfidenceScore == 2
    }

    /// Display name with brewery
    var fullName: String {
        return "\(name) (\(brewery))"
    }
}

// MARK: - Beer Match (for search results)
struct BeerMatch: Identifiable {
    let beer: Beer
    let confidence: Double
    let matchReason: String

    var id: String { beer.id }

    /// Formatted confidence percentage
    var confidencePercentage: String {
        return String(format: "%.0f%%", confidence * 100)
    }

    /// Combined score for sorting (confidence * GF score)
    var combinedScore: Double {
        return confidence * Double(beer.gfConfidenceScore)
    }
}
