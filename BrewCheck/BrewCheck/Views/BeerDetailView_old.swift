//
//  BeerDetailView.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/25/25.
//

import SwiftUI

struct BeerDetailView: View {
    let beer: Beer

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {

                // MARK: - Safety Level Header
                HStack(spacing: 16) {
                    Image(systemName: beer.safetyLevel.iconName)
                        .font(.system(size: 48))
                        .foregroundStyle(beer.safetyLevel.color)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(beer.safetyLevel.rawValue)
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("GF Score: \(beer.scoreDisplay)")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()
                }
                .padding()
                .background(beer.safetyLevel.color.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // MARK: - Beer Info
                VStack(alignment: .leading, spacing: 8) {
                    Text("Brewery")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)

                    Text(beer.brewery)
                        .font(.body)

                    Divider()

                    Text("Style")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)

                    Text(beer.style)
                        .font(.body)
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // MARK: - Safety Assessment
                VStack(alignment: .leading, spacing: 8) {
                    Text("Safety Assessment")
                        .font(.headline)

                    Text(RecommendationEngine.generateExplanation(for: beer))
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))

                // MARK: - Test Results
                VStack(alignment: .leading, spacing: 12) {
                    Text("Test Results (\(beer.testResults.count))")
                        .font(.headline)

                    ForEach(beer.testResults) { testResult in
                        TestResultCard(testResult: testResult)
                    }
                }

                // MARK: - Disclaimer
                VStack(alignment: .leading, spacing: 8) {
                    Label("Important Disclaimer", systemImage: "info.circle")
                        .font(.headline)

                    Text("This app is for informational purposes only and is not medical advice. Test results may vary by batch and brewing process. Always consult with your healthcare provider before consuming beer if you have celiac disease or gluten sensitivity.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding()
        }
        .navigationTitle(beer.name)
        .navigationBarTitleDisplayMode(.large)
    }
}

// MARK: - Test Result Card Component

struct TestResultCard: View {
    let testResult: TestResult

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(testResult.testType)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                Text(testResult.formattedDate)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(testResult.displayResult)
                .font(.body)
                .foregroundStyle(testResult.resultColor)

            if let notes = testResult.testNotes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            if let link = testResult.testLink, let url = URL(string: link) {
                Link(destination: url) {
                    HStack {
                        Text("View Source")
                            .font(.caption)
                        Image(systemName: "arrow.up.right.square")
                            .font(.caption)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color(.systemGray4), lineWidth: 1)
        )
    }
}

// MARK: - Preview

struct BeerDetailView_Previews: PreviewProvider {
    static var previews: some View {
        let sampleBeer = Beer(
            id: "123",
            name: "Corona Extra",
            brewery: "Grupo Modelo",
            style: "Lager",
            gfConfidenceScore: 4,
            testResults: [
                TestResult(
                    id: "1",
                    testType: "EZ Gluten Test",
                    testResult: "Negative at 10ppm",
                    testDate: "2024-01-15",
                    testLink: "https://example.com",
                    testNotes: "Test conducted on fresh batch"
                )
            ]
        )

        return NavigationView {
            BeerDetailView(beer: sampleBeer)
        }
    }
}
