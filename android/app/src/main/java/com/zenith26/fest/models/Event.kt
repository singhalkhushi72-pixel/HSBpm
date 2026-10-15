package com.zenith26.fest.models

data class Event(
    val id: Int,
    val title: String,
    val category: String,
    val description: String? = null,
    val event_date: String,
    val event_time: String,
    val venue: String,
    val capacity: Int,
    val fee: Int = 0,
    val icon: String? = null,
    val available_seats: Int = 0
) {
    val isFull: Boolean get() = available_seats <= 0
    val feeDisplay: String get() = if (fee == 0) "Free" else "₹$fee"
    val registeredCount: Int get() = (capacity - available_seats).coerceAtLeast(0)
    val utilizationPct: Float get() = if (capacity > 0) (registeredCount.toFloat() / capacity * 100f) else 0f
}

data class EventCreate(
    val title: String,
    val category: String,
    val description: String = "",
    val event_date: String,
    val event_time: String,
    val venue: String,
    val capacity: Int,
    val fee: Int = 0,
    val icon: String = "📅"
)
