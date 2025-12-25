//
//  DesignSystem.swift
//  BrewCheck
//
//  Created by Sam Rispaud on 12/25/25.
//

import SwiftUI

/// Design system constants for consistent styling
enum DesignSystem {

    // MARK: - Colors

    enum Colors {
        static let safeGreen = Color(red: 0.2, green: 0.78, blue: 0.35)
        static let warningOrange = Color(red: 1.0, green: 0.58, blue: 0.0)
        static let dangerRed = Color(red: 1.0, green: 0.23, blue: 0.19)
        static let cardBackground = Color(.systemBackground)
        static let secondaryBackground = Color(.secondarySystemBackground)
        static let tertiaryBackground = Color(.tertiarySystemBackground)
    }

    // MARK: - Spacing

    enum Spacing {
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // MARK: - Corner Radius

    enum CornerRadius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 20
    }

    // MARK: - Shadows

    enum Shadow {
        static func card() -> some View {
            EmptyView()
                .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
                .shadow(color: Color.black.opacity(0.05), radius: 1, x: 0, y: 1)
        }
    }
}

// MARK: - Custom Modifiers

extension View {
    func cardStyle() -> some View {
        self
            .background(DesignSystem.Colors.cardBackground)
            .cornerRadius(DesignSystem.CornerRadius.lg)
            .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 2)
            .shadow(color: Color.black.opacity(0.04), radius: 1, x: 0, y: 1)
    }

    func badgeStyle(color: Color) -> some View {
        self
            .font(.system(size: 12, weight: .semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .cornerRadius(6)
    }
}
