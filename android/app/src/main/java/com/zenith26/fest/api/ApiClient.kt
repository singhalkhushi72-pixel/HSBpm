package com.zenith26.fest.api

import com.zenith26.fest.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class ApiException(val statusCode: Int, override val message: String) : Exception(message)

object ApiClient {
    // Default to 10.0.2.2:8001 for standard Android Emulator to host machine mapping.
    // Can be changed dynamically at runtime in the app settings for LAN devices or testing.
    var baseUrl: String = "http://10.0.2.2:8001"

    private suspend fun makeRequest(
        endpoint: String,
        method: String = "GET",
        jsonBody: String? = null
    ): String = withContext(Dispatchers.IO) {
        val fullUrl = if (endpoint.startsWith("http")) endpoint else "$baseUrl$endpoint"
        val url = URL(fullUrl)
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        conn.setRequestProperty("Accept", "application/json")

        if (jsonBody != null) {
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                writer.write(jsonBody)
                writer.flush()
            }
        }

        val statusCode = conn.responseCode
        val isSuccess = statusCode in 200..299
        val inputStream = if (isSuccess) conn.inputStream else conn.errorStream

        val responseText = if (inputStream != null) {
            BufferedReader(InputStreamReader(inputStream, "UTF-8")).use { reader ->
                reader.readText()
            }
        } else ""

        if (!isSuccess) {
            val errorMessage = try {
                val json = JSONObject(responseText)
                json.optString("detail", responseText.ifBlank { "HTTP Error $statusCode" })
            } catch (_: Exception) {
                responseText.ifBlank { "HTTP Error $statusCode" }
            }
            throw ApiException(statusCode, errorMessage)
        }

        responseText
    }

    suspend fun getEvents(category: String? = null, search: String? = null): List<Event> {
        val params = mutableListOf<String>()
        if (!category.isNullOrBlank() && category.trim().lowercase() != "all") {
            params.add("category=" + URLEncoder.encode(category.trim(), "UTF-8"))
        }
        if (!search.isNullOrBlank()) {
            params.add("search=" + URLEncoder.encode(search.trim(), "UTF-8"))
        }
        val query = if (params.isNotEmpty()) "?" + params.joinToString("&") else ""
        val response = makeRequest("/api/events$query", "GET")

        val jsonArray = JSONArray(response)
        val events = mutableListOf<Event>()
        for (i in 0 until jsonArray.length()) {
            val item = jsonArray.getJSONObject(i)
            events.add(
                Event(
                    id = item.getInt("id"),
                    title = item.getString("title"),
                    category = item.getString("category"),
                    description = item.optString("description", null),
                    event_date = item.getString("event_date"),
                    event_time = item.getString("event_time"),
                    venue = item.getString("venue"),
                    capacity = item.getInt("capacity"),
                    fee = item.optInt("fee", 0),
                    icon = item.optString("icon", "⚡"),
                    available_seats = item.optInt("available_seats", 0)
                )
            )
        }
        return events
    }

    suspend fun getEvent(eventId: Int): Event {
        val response = makeRequest("/api/events/$eventId", "GET")
        val item = JSONObject(response)
        return Event(
            id = item.getInt("id"),
            title = item.getString("title"),
            category = item.getString("category"),
            description = item.optString("description", null),
            event_date = item.getString("event_date"),
            event_time = item.getString("event_time"),
            venue = item.getString("venue"),
            capacity = item.getInt("capacity"),
            fee = item.optInt("fee", 0),
            icon = item.optString("icon", "⚡"),
            available_seats = item.optInt("available_seats", 0)
        )
    }

    suspend fun registerForEvent(eventId: Int, reg: RegistrationIn): RegistrationOut {
        val body = JSONObject().apply {
            put("student_name", reg.student_name)
            put("roll_number", reg.roll_number)
            put("email", reg.email)
            if (!reg.phone.isNullOrBlank()) {
                put("phone", reg.phone)
            }
        }.toString()

        val response = makeRequest("/api/events/$eventId/register", "POST", body)
        val item = JSONObject(response)
        return RegistrationOut(
            id = item.getInt("id"),
            event_id = item.getInt("event_id"),
            student_name = item.getString("student_name"),
            registered_at = item.getString("registered_at")
        )
    }

    suspend fun getRegistrations(eventId: Int? = null): List<RegistrationDetail> {
        val endpoint = if (eventId != null) "/api/registrations?event_id=$eventId" else "/api/registrations"
        val response = makeRequest(endpoint, "GET")
        val jsonArray = JSONArray(response)
        val list = mutableListOf<RegistrationDetail>()
        for (i in 0 until jsonArray.length()) {
            val item = jsonArray.getJSONObject(i)
            list.add(
                RegistrationDetail(
                    id = item.getInt("id"),
                    event_id = item.getInt("event_id"),
                    student_name = item.getString("student_name"),
                    roll_number = item.getString("roll_number"),
                    email = item.getString("email"),
                    phone = item.optString("phone", null),
                    registered_at = item.getString("registered_at"),
                    event_title = item.getString("event_title")
                )
            )
        }
        return list
    }

    suspend fun getStats(): Stats {
        val response = makeRequest("/api/stats", "GET")
        val item = JSONObject(response)
        val categoryMap = mutableMapOf<String, Int>()
        val catObj = item.optJSONObject("events_by_category")
        if (catObj != null) {
            val keys = catObj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                categoryMap[key] = catObj.getInt(key)
            }
        }

        return Stats(
            total_events = item.getInt("total_events"),
            total_registrations = item.getInt("total_registrations"),
            total_capacity = item.getInt("total_capacity"),
            overall_utilization_pct = item.getDouble("overall_utilization_pct"),
            upcoming_events_count = item.getInt("upcoming_events_count"),
            events_by_category = categoryMap
        )
    }

    // Stretch Goals
    suspend fun createEvent(event: EventCreate): Event {
        val body = JSONObject().apply {
            put("title", event.title)
            put("category", event.category)
            put("description", event.description)
            put("event_date", event.event_date)
            put("event_time", event.event_time)
            put("venue", event.venue)
            put("capacity", event.capacity)
            put("fee", event.fee)
            put("icon", event.icon)
        }.toString()

        val response = makeRequest("/api/events", "POST", body)
        val item = JSONObject(response)
        return Event(
            id = item.getInt("id"),
            title = item.getString("title"),
            category = item.getString("category"),
            description = item.optString("description", null),
            event_date = item.getString("event_date"),
            event_time = item.getString("event_time"),
            venue = item.getString("venue"),
            capacity = item.getInt("capacity"),
            fee = item.optInt("fee", 0),
            icon = item.optString("icon", "⚡"),
            available_seats = item.optInt("available_seats", item.getInt("capacity"))
        )
    }

    suspend fun deleteRegistration(registrationId: Int): Boolean {
        makeRequest("/api/registrations/$registrationId", "DELETE")
        return true
    }
}
