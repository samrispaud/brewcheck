//
//  SearchView.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/25/25.
//

import SwiftUI

struct SearchView: View {
    @EnvironmentObject private var database: BeerDatabase
    @State private var searchText = ""
    @State private var browsableBeers: [Beer] = []
    @State private var currentPage = 0
    @State private var isLoadingMore = false

    private let pageSize = 30

    /// Computed property for search results
    private var searchResults: [BeerMatch] {
        guard searchText.count >= 2 else { return [] }
        return database.search(searchText)
    }

    /// Check if we're in browse mode (no search)
    private var isBrowsing: Bool {
        return searchText.isEmpty
    }

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                DesignSystem.Colors.secondaryBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Search bar
                    searchBar

                    // Content
                    contentView
                }
            }
            .navigationTitle("BrewCheck")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                loadInitialBeers()
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                    .font(.system(size: 16, weight: .medium))

                TextField("Search beers...", text: $searchText)
                    .textFieldStyle(.plain)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                            .font(.system(size: 16))
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(DesignSystem.Colors.tertiaryBackground)
            .cornerRadius(10)
        }
        .padding(.horizontal, DesignSystem.Spacing.md)
        .padding(.vertical, DesignSystem.Spacing.sm)
        .background(DesignSystem.Colors.secondaryBackground)
    }

    // MARK: - Content View

    @ViewBuilder
    private var contentView: some View {
        if isBrowsing {
            browseModeView
        } else if searchText.count < 2 {
            emptySearchView
        } else if searchResults.isEmpty {
            noResultsView
        } else {
            searchResultsView
        }
    }

    // MARK: - Browse Mode View

    private var browseModeView: some View {
        Group {
            if browsableBeers.isEmpty {
                ProgressView("Loading beers...")
            } else {
                ScrollView {
                    LazyVStack(spacing: DesignSystem.Spacing.sm) {
                        ForEach(browsableBeers) { beer in
                            NavigationLink(destination: BeerDetailView(beer: beer)) {
                                BeerCard(beer: beer)
                            }
                            .buttonStyle(CardButtonStyle())
                            .onAppear {
                                if beer.id == browsableBeers.last?.id {
                                    loadMoreBeers()
                                }
                            }
                        }

                        if isLoadingMore {
                            ProgressView()
                                .padding()
                        }
                    }
                    .padding(.horizontal, DesignSystem.Spacing.md)
                    .padding(.vertical, DesignSystem.Spacing.sm)
                }
            }
        }
    }

    // MARK: - Search Results View

    private var searchResultsView: some View {
        ScrollView {
            LazyVStack(spacing: DesignSystem.Spacing.sm) {
                ForEach(searchResults) { match in
                    NavigationLink(destination: BeerDetailView(beer: match.beer)) {
                        SearchResultCard(match: match)
                    }
                    .buttonStyle(CardButtonStyle())
                }
            }
            .padding(.horizontal, DesignSystem.Spacing.md)
            .padding(.vertical, DesignSystem.Spacing.sm)
        }
    }

    // MARK: - Empty States

    private var emptySearchView: some View {
        VStack(spacing: DesignSystem.Spacing.lg) {
            Image(systemName: "keyboard")
                .font(.system(size: 56, weight: .thin))
                .foregroundColor(.secondary)

            VStack(spacing: DesignSystem.Spacing.xs) {
                Text("Keep typing...")
                    .font(.title3)
                    .fontWeight(.semibold)

                Text("Enter at least 2 characters")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(DesignSystem.Spacing.xl)
    }

    private var noResultsView: some View {
        VStack(spacing: DesignSystem.Spacing.lg) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 56, weight: .thin))
                .foregroundColor(.secondary)

            VStack(spacing: DesignSystem.Spacing.xs) {
                Text("No Results")
                    .font(.title3)
                    .fontWeight(.semibold)

                Text("Try a different beer name or brewery")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(DesignSystem.Spacing.xl)
    }

    // MARK: - Helper Methods

    private func loadInitialBeers() {
        guard browsableBeers.isEmpty else { return }
        browsableBeers = database.getSafeBeers(page: 0, pageSize: pageSize)
        currentPage = 0
    }

    private func loadMoreBeers() {
        guard !isLoadingMore else { return }
        isLoadingMore = true

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            let nextPage = currentPage + 1
            let moreBeers = database.getSafeBeers(page: nextPage, pageSize: pageSize)

            if !moreBeers.isEmpty {
                browsableBeers.append(contentsOf: moreBeers)
                currentPage = nextPage
            }

            isLoadingMore = false
        }
    }
}

// MARK: - Beer Card Component

struct BeerCard: View {
    let beer: Beer

    var body: some View {
        HStack(spacing: DesignSystem.Spacing.md) {
            // Safety indicator
            ZStack {
                Circle()
                    .fill(beer.safetyLevel.color.opacity(0.15))
                    .frame(width: 52, height: 52)

                Image(systemName: beer.safetyLevel.iconName)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(beer.safetyLevel.color)
            }

            // Beer info
            VStack(alignment: .leading, spacing: 6) {
                Text(beer.name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.primary)
                    .lineLimit(1)

                Text(beer.brewery)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    // Style
                    Text(beer.style)
                        .badgeStyle(color: .blue)

                    // GF Score
                    Text("GF: \(beer.scoreDisplay)")
                        .badgeStyle(color: beer.safetyLevel.color)
                }
            }

            Spacer(minLength: 0)

            // Chevron
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color.secondary.opacity(0.3))
        }
        .padding(DesignSystem.Spacing.md)
        .cardStyle()
    }
}

// MARK: - Search Result Card Component

struct SearchResultCard: View {
    let match: BeerMatch

    var body: some View {
        HStack(spacing: DesignSystem.Spacing.md) {
            // Safety indicator
            ZStack {
                Circle()
                    .fill(match.beer.safetyLevel.color.opacity(0.15))
                    .frame(width: 52, height: 52)

                Image(systemName: match.beer.safetyLevel.iconName)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(match.beer.safetyLevel.color)
            }

            // Beer info
            VStack(alignment: .leading, spacing: 6) {
                Text(match.beer.name)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.primary)
                    .lineLimit(1)

                Text(match.beer.brewery)
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    // Style
                    Text(match.beer.style)
                        .badgeStyle(color: .blue)

                    // GF Score
                    Text("GF: \(match.beer.scoreDisplay)")
                        .badgeStyle(color: match.beer.safetyLevel.color)
                }
            }

            Spacer(minLength: 0)

            // Chevron
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color.secondary.opacity(0.3))
        }
        .padding(DesignSystem.Spacing.md)
        .cardStyle()
    }
}

// MARK: - Card Button Style

struct CardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Empty State View Component

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: DesignSystem.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 56, weight: .thin))
                .foregroundColor(.secondary)

            VStack(spacing: DesignSystem.Spacing.xs) {
                Text(title)
                    .font(.title3)
                    .fontWeight(.semibold)

                Text(message)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DesignSystem.Spacing.xl)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Preview

struct SearchView_Previews: PreviewProvider {
    static var previews: some View {
        SearchView()
            .environmentObject(BeerDatabase())
    }
}
