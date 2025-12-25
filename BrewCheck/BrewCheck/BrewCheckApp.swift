//
//  BrewCheckApp.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/24/25.
//

import SwiftUI

@main
struct BrewCheckApp: App {
    @StateObject private var database = BeerDatabase()

    var body: some Scene {
        WindowGroup {
            Group {
                if database.isLoading {
                    // Loading state
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Loading beer database...")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                    }
                } else if let error = database.error {
                    // Error state
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 48))
                            .foregroundStyle(.red)
                        Text("Failed to load beer database")
                            .font(.headline)
                        Text(error.localizedDescription)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding()
                    }
                } else {
                    // Main app view
                    SearchView()
                        .environmentObject(database)
                }
            }
            .task {
                // Load database on app launch
                await database.loadData()
            }
        }
    }
}
