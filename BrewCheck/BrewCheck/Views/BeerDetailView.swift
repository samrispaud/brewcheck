//
//  BeerDetailView.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/25/25.
//

import SwiftUI

struct BeerDetailView: View {
    let beer: Beer
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DesignSystem.Spacing.lg) {

                // MARK: - Hero Section
                heroSection

                // MARK: - Beer Info Card
                beerInfoCard

                // MARK: - Safety Assessment
                safetyAssessmentCard

                // MARK: - Test Results
                testResultsSection

                // MARK: - Disclaimer
                disclaimerCard

                Spacer(minLength: DesignSystem.Spacing.xl)
            }
            .padding(DesignSystem.Spacing.md)
        }
        .background(DesignSystem.Colors.secondaryBackground)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        VStack(spacing: DesignSystem.Spacing.md) {
            // Safety icon
            ZStack {
                Circle()
                    .fill(beer.safetyLevel.color.opacity(0.15))
                    .frame(width: 96, height: 96)

                Image(systemName: beer.safetyLevel.iconName)
                    .font(.system(size: 42, weight: .semibold))
                    .foregroundStyle(beer.safetyLevel.color)
            }

            // Beer name
            VStack(spacing: DesignSystem.Spacing.xxs) {
                Text(beer.name)
                    .font(.system(size: 28, weight: .bold))
                    .multilineTextAlignment(.center)

                Text(beer.brewery)
                    .font(.system(size: 17))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Safety level badge
            HStack(spacing: 8) {
                Text(beer.safetyLevel.rawValue)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(beer.safetyLevel.color)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(beer.safetyLevel.color.opacity(0.15))
                    .cornerRadius(20)

                Text("GF Score: \(beer.scoreDisplay)")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(20)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignSystem.Spacing.lg)
    }

    // MARK: - Beer Info Card

    private var beerInfoCard: some View {
        VStack(alignment: .leading, spacing: DesignSystem.Spacing.md) {
            Text("Details")
                .font(.system(size: 20, weight: .bold))

            VStack(spacing: DesignSystem.Spacing.md) {
                InfoRow(label: "Style", value: beer.style, icon: "wineglass")

                Divider()

                InfoRow(
                    label: "Test Results",
                    value: "\(beer.testResults.count) test\(beer.testResults.count == 1 ? "" : "s")",
                    icon: "flask"
                )

                if let avg = beer.averagePPM {
                    Divider()
                    InfoRow(
                        label: "Average PPM",
                        value: String(format: "%.1f ppm", avg),
                        icon: "chart.bar"
                    )
                }
            }
        }
        .padding(DesignSystem.Spacing.md)
        .cardStyle()
    }

    // MARK: - Safety Assessment Card

    private var safetyAssessmentCard: some View {
        VStack(alignment: .leading, spacing: DesignSystem.Spacing.md) {
            Label("Safety Assessment", systemImage: "checkmark.shield")
                .font(.system(size: 20, weight: .bold))

            Text(RecommendationEngine.generateExplanation(for: beer))
                .font(.system(size: 15))
                .foregroundColor(.secondary)
                .lineSpacing(4)
        }
        .padding(DesignSystem.Spacing.md)
        .cardStyle()
    }

    // MARK: - Test Results Section

    private var testResultsSection: some View {
        VStack(alignment: .leading, spacing: DesignSystem.Spacing.md) {
            Text("Test Results (\(beer.testResults.count))")
                .font(.system(size: 20, weight: .bold))
                .padding(.horizontal, DesignSystem.Spacing.xxs)

            VStack(spacing: DesignSystem.Spacing.sm) {
                ForEach(beer.testResults) { testResult in
                    TestResultCard(testResult: testResult)
                }
            }
        }
    }

    // MARK: - Disclaimer Card

    private var disclaimerCard: some View {
        VStack(alignment: .leading, spacing: DesignSystem.Spacing.sm) {
            Label("Important Disclaimer", systemImage: "info.circle.fill")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(DesignSystem.Colors.warningOrange)

            Text("This app is for informational purposes only and is not medical advice. Test results may vary by batch and brewing process. Always consult with your healthcare provider before consuming beer if you have celiac disease or gluten sensitivity.")
                .font(.system(size: 13))
                .foregroundColor(.secondary)
                .lineSpacing(3)
        }
        .padding(DesignSystem.Spacing.md)
        .background(DesignSystem.Colors.warningOrange.opacity(0.08))
        .cornerRadius(DesignSystem.CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: DesignSystem.CornerRadius.md)
                .stroke(DesignSystem.Colors.warningOrange.opacity(0.2), lineWidth: 1)
        )
    }
}

// MARK: - Info Row Component

struct InfoRow: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        HStack(spacing: DesignSystem.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.secondary)
                .frame(width: 24)

            Text(label)
                .font(.system(size: 15))
                .foregroundColor(.secondary)

            Spacer()

            Text(value)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.primary)
        }
    }
}

// MARK: - Test Result Card Component

struct TestResultCard: View {
    let testResult: TestResult

    var body: some View {
        VStack(alignment: .leading, spacing: DesignSystem.Spacing.sm) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(testResult.testType)
                        .font(.system(size: 16, weight: .semibold))

                    Text(testResult.formattedDate)
                        .font(.system(size: 13))
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Result icon
                if testResult.isNegative {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignSystem.Colors.safeGreen)
                } else if testResult.isPositive {
                    Image(systemName: "exclamationmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignSystem.Colors.dangerRed)
                }
            }

            // Result text
            Text(testResult.testResult)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(testResult.resultColor)
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(testResult.resultColor.opacity(0.1))
                .cornerRadius(8)

            // Notes
            if let notes = testResult.testNotes, !notes.isEmpty {
                Text(notes)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .lineSpacing(3)
                    .padding(.top, 4)
            }

            // Source link
            if let link = testResult.testLink, let url = URL(string: link) {
                Link(destination: url) {
                    HStack(spacing: 6) {
                        Image(systemName: "link")
                            .font(.system(size: 12))
                        Text("View Source")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundStyle(.blue)
                }
                .padding(.top, 4)
            }
        }
        .padding(DesignSystem.Spacing.md)
        .cardStyle()
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
