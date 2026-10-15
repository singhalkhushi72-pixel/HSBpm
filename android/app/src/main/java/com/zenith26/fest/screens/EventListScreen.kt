package com.zenith26.fest.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.zenith26.fest.api.ApiClient
import com.zenith26.fest.components.*
import com.zenith26.fest.models.Event
import com.zenith26.fest.models.UiState
import kotlinx.coroutines.launch

@Composable
fun EventListScreen() {
    val coroutineScope = rememberCoroutineScope()

    var selectedCategory by remember { mutableStateOf("All") }
    var searchQuery by remember { mutableStateOf("") }
    var eventsState by remember { mutableStateOf<UiState<List<Event>>>(UiState.Loading) }
    var selectedEventForDetail by remember { mutableStateOf<Event?>(null) }

    // Re-fetches GET /api/events directly with query params to exercise real backend API contract
    fun fetchEvents() {
        eventsState = UiState.Loading
        coroutineScope.launch {
            try {
                val catParam = if (selectedCategory.equals("All", ignoreCase = true)) null else selectedCategory
                val searchParam = searchQuery.ifBlank { null }
                val events = ApiClient.getEvents(category = catParam, search = searchParam)
                eventsState = if (events.isEmpty()) UiState.Empty else UiState.Success(events)
            } catch (e: Exception) {
                eventsState = UiState.Error(e.localizedMessage ?: "Could not connect to FastAPI server at ${ApiClient.baseUrl}")
            }
        }
    }

    // Trigger on initial composition or whenever category changes
    LaunchedEffect(selectedCategory) {
        fetchEvents()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // Hero Section
        item {
            HeroSection()
            Spacer(modifier = Modifier.height(8.dp))
        }

        // Search Bar
        item {
            FestSearchBar(
                query = searchQuery,
                onQueryChange = { newQuery ->
                    searchQuery = newQuery
                },
                onSearch = {
                    fetchEvents()
                }
            )
            Spacer(modifier = Modifier.height(10.dp))
        }

        // Category Filter Chips
        item {
            CategoryFilterRow(
                selectedCategory = selectedCategory,
                onSelectCategory = { cat ->
                    selectedCategory = cat
                }
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        // Content States
        when (val state = eventsState) {
            is UiState.Loading -> {
                item {
                    LoadingStateView(message = "Fetching festival events from backend...")
                }
            }
            is UiState.Error -> {
                item {
                    ErrorStateView(
                        message = state.message,
                        onRetry = { fetchEvents() }
                    )
                }
            }
            is UiState.Empty -> {
                item {
                    EmptyStateView(
                        message = "No events match your search",
                        onResetFilters = {
                            searchQuery = ""
                            selectedCategory = "All"
                            fetchEvents()
                        }
                    )
                }
            }
            is UiState.Success -> {
                items(state.data, key = { it.id }) { event ->
                    EventCard(
                        event = event,
                        onViewDetails = { selectedEventForDetail = it }
                    )
                }
            }
        }
    }

    // Detail & Registration Dialog
    selectedEventForDetail?.let { event ->
        EventDetailDialog(
            event = event,
            onDismiss = { selectedEventForDetail = null },
            onRegistrationSuccess = {
                fetchEvents()
            }
        )
    }
}
