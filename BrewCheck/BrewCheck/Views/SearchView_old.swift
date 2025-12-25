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
            VStack(spacing: 0) {
                // Search field
                TextField("Search beers or ask \"is [beer] gluten free?\"", text: $searchText)
                    .textFieldStyle(.roundedBorder)
                    .padding()
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                // Results list or browse mode
                if isBrowsing {
                    // Browse mode: show paginated safe beers
                    if browsableBeers.isEmpty {
                        ProgressView("Loading beers...")
                    } else {
                        List {
                            ForEach(browsableBeers) { beer in
                                NavigationLink(destination: BeerDetailView(beer: beer)) {
                                    BrowseBeerRow(beer: beer)
                                }
                                .onAppear {
                                    // Load more when reaching near the end
                                    if beer.id == browsableBeers.last?.id {
                                        loadMoreBeers()
                                    }
                                }
                            }

                            // Loading indicator at bottom
                            if isLoadingMore {
                                HStack {
                                    Spacer()
                                    ProgressView()
                                        .padding()
                                    Spacer()
                                }
                            }
                        }
                        .listStyle(.plain)
                    }
                } else if searchText.count < 2 {
                    EmptyStateView(
                        icon: "keyboard",
                        title: "Keep typing...",
                        message: "Enter at least 2 characters to search"
                    )
                } else if searchResults.isEmpty {
                    EmptyStateView(
                        icon: "questionmark.circle",
                        title: "No matches found",
                        message: "Try a different beer name or brewery"
                    )
                } else {
                    // Search results list
                    List(searchResults) { match in
                        NavigationLink(destination: BeerDetailView(beer: match.beer)) {
                            BeerResultRow(match: match)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("BrewCheck")
            .onAppear {
                loadInitialBeers()
            }
        }
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

        // Simulate slight delay for smooth UX
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

// MARK: - Browse Beer Row Component

struct BrowseBeerRow: View {
    let beer: Beer

    var body: some View {
        HStack(spacing: 12) {
            // Safety icon
            Image(systemName: beer.safetyLevel.iconName)
                .font(.title2)
                .foregroundStyle(beer.safetyLevel.color)
                .frame(width: 32)

            // Beer info
            VStack(alignment: .leading, spacing: 4) {
                Text(beer.name)
                    .font(.headline)

                Text(beer.brewery)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack(spacing: 8) {
                    // Style badge
                    Text(beer.style)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.2))
                        .foregroundStyle(.blue)
                        .clipShape(Capsule())

                    // GF score badge
                    Text("GF: \(beer.scoreDisplay)")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(beer.safetyLevel.color.opacity(0.2))
                        .foregroundStyle(beer.safetyLevel.color)
                        .clipShape(Capsule())
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Beer Result Row Component

struct BeerResultRow: View {
    let match: BeerMatch

    var body: some View {
        HStack(spacing: 12) {
            // Safety icon
            Image(systemName: match.beer.safetyLevel.iconName)
                .font(.title2)
                .foregroundStyle(match.beer.safetyLevel.color)
                .frame(width: 32)

            // Beer info
            VStack(alignment: .leading, spacing: 4) {
                Text(match.beer.name)
                    .font(.headline)

                Text(match.beer.brewery)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                HStack(spacing: 8) {
                    // Style badge
                    Text(match.beer.style)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.2))
                        .foregroundStyle(.blue)
                        .clipShape(Capsule())

                    // GF score badge
                    Text("GF: \(match.beer.scoreDisplay)")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(match.beer.safetyLevel.color.opacity(0.2))
                        .foregroundStyle(match.beer.safetyLevel.color)
                        .clipShape(Capsule())
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Empty State View

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundColor(.secondary)

            Text(title)
                .font(.title2)
                .fontWeight(.semibold)

            Text(message)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
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
