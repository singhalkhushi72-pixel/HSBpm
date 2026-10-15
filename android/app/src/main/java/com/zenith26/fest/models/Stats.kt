package com.zenith26.fest.models

data class Stats(
    val total_events: Int,
    val total_registrations: Int,
    val total_capacity: Int,
    val overall_utilization_pct: Double,
    val upcoming_events_count: Int,
    val events_by_category: Map<String, Int>
)

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<out T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
    data object Empty : UiState<Nothing>
}
