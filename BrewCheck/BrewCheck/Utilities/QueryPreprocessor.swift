//
//  QueryPreprocessor.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/25/25.
//

import Foundation

/// Extracts beer names from natural language queries
struct QueryPreprocessor {

    // Words to remove from queries
    private static let questionWords = [
        "is", "are", "can", "could", "should", "would",
        "what", "how", "when", "where", "why", "which",
        "does", "do", "did", "has", "have", "had"
    ]

    private static let fillerWords = [
        "the", "a", "an", "this", "that", "these", "those",
        "i", "me", "my", "we", "us", "our",
        "you", "your",
        "it", "its",
        "about", "tell", "know", "find", "lookup", "look", "up"
    ]

    private static let glutenPhrases = [
        "gluten free",
        "gluten-free",
        "safe for celiac",
        "celiac safe",
        "gf",
        "gluten",
        "safe",
        "drink",
        "have"
    ]

    /// Clean and extract beer name from natural language query
    /// - Parameter query: Raw user query (e.g., "is coors light gluten free?")
    /// - Returns: Cleaned beer name (e.g., "coors light")
    static func extractBeerName(from query: String) -> String {
        var cleaned = query.lowercased()

        // Remove punctuation
        cleaned = cleaned.replacingOccurrences(of: "?", with: "")
        cleaned = cleaned.replacingOccurrences(of: "!", with: "")
        cleaned = cleaned.replacingOccurrences(of: ",", with: "")
        cleaned = cleaned.replacingOccurrences(of: ".", with: "")

        // Remove gluten phrases first (multi-word)
        for phrase in glutenPhrases {
            cleaned = cleaned.replacingOccurrences(of: phrase, with: "")
        }

        // Split into words
        var words = cleaned.components(separatedBy: .whitespaces)
            .filter { !$0.isEmpty }

        // Remove question words
        words = words.filter { word in
            !questionWords.contains(word)
        }

        // Remove filler words
        words = words.filter { word in
            !fillerWords.contains(word)
        }

        // Join remaining words
        let result = words.joined(separator: " ").trimmingCharacters(in: .whitespaces)

        // If result is empty, return original query trimmed
        if result.isEmpty {
            return query.trimmingCharacters(in: .whitespaces)
        }

        return result
    }

    /// Normalize query for matching (handles case, extra spaces, special chars)
    /// - Parameter query: Raw query string
    /// - Returns: Normalized string
    static func normalize(_ query: String) -> String {
        return query.lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
    }
}
