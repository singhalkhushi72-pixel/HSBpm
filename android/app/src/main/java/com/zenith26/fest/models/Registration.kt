package com.zenith26.fest.models

data class RegistrationIn(
    val student_name: String,
    val roll_number: String,
    val email: String,
    val phone: String? = null
)

data class RegistrationOut(
    val id: Int,
    val event_id: Int,
    val student_name: String,
    val registered_at: String
)

data class RegistrationDetail(
    val id: Int,
    val event_id: Int,
    val student_name: String,
    val roll_number: String,
    val email: String,
    val phone: String? = null,
    val registered_at: String,
    val event_title: String
)
