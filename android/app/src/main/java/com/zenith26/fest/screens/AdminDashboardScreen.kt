package com.zenith26.fest.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.zenith26.fest.api.ApiClient
import com.zenith26.fest.components.AdminStatsSection
import com.zenith26.fest.components.ErrorStateView
import com.zenith26.fest.components.LoadingStateView
import com.zenith26.fest.models.*
import kotlinx.coroutines.launch

@Composable
fun AdminDashboardScreen() {
    val coroutineScope = rememberCoroutineScope()

    var selectedTab by remember { mutableIntStateOf(0) } // 0: Capacity Overview, 1: Registrations Roster
    var statsState by remember { mutableStateOf<UiState<Stats>>(UiState.Loading) }
    var eventsList by remember { mutableStateOf<List<Event>>(emptyList()) }
    var registrationsList by remember { mutableStateOf<List<RegistrationDetail>>(emptyList()) }
    var selectedEventFilterId by remember { mutableStateOf<Int?>(null) }

    var showAddEventDialog by remember { mutableStateOf(false) }
    var registrationToDelete by remember { mutableStateOf<RegistrationDetail?>(null) }

    fun refreshDashboard() {
        statsState = UiState.Loading
        coroutineScope.launch {
            try {
                val stats = ApiClient.getStats()
                statsState = UiState.Success(stats)
                
                // Fetch events and sort by utilization percentage descending
                val events = ApiClient.getEvents()
                eventsList = events.sortedByDescending { it.utilizationPct }

                // Fetch registrations
                registrationsList = ApiClient.getRegistrations(selectedEventFilterId)
            } catch (e: Exception) {
                statsState = UiState.Error(e.localizedMessage ?: "Failed to connect to backend server")
            }
        }
    }

    LaunchedEffect(selectedEventFilterId) {
        refreshDashboard()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Title & Refresh / Add Event bar
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Operations Dashboard",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        text = "Live capacity metrics & roster monitoring",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Stretch Goal 1: Add Event button
                    Button(
                        onClick = { showAddEventDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("+ Add Event", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }

                    Button(
                        onClick = { refreshDashboard() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E293B)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("🔄 Refresh", fontSize = 11.sp, color = Color(0xFFCBD5E1))
                    }
                }
            }
        }

        // Stats Section
        item {
            when (val state = statsState) {
                is UiState.Loading -> LoadingStateView("Computing live fest statistics...")
                is UiState.Error -> ErrorStateView(state.message, onRetry = { refreshDashboard() })
                is UiState.Success -> AdminStatsSection(stats = state.data)
                is UiState.Empty -> {}
            }
        }

        // Tab Selector: Events Capacity Table vs Raw Registrations Roster
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF1E293B))
                    .padding(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (selectedTab == 0) Color(0xFF7C3AED) else Color.Transparent)
                        .clickable { selectedTab = 0 }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Capacity Monitoring (${eventsList.size})",
                        color = if (selectedTab == 0) Color.White else Color(0xFF94A3B8),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (selectedTab == 1) Color(0xFF7C3AED) else Color.Transparent)
                        .clickable { selectedTab = 1 }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Registration Roster (${registrationsList.size})",
                        color = if (selectedTab == 1) Color.White else Color(0xFF94A3B8),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Tab 0: Event Capacity List sorted by utilization descending
        if (selectedTab == 0) {
            item {
                Text(
                    text = "Sorted by Utilization % Descending (High demand first)",
                    color = Color(0xFF64748B),
                    fontSize = 11.sp
                )
            }

            items(eventsList, key = { it.id }) { ev ->
                val isHighDemand = ev.utilizationPct >= 90f // Highlight over 90% in warning color (Step 8 requirement)
                
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF1E293B),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isHighDemand) Color(0xFFEF4444) else Color(0xFF334155)
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(text = ev.icon ?: "⚡", fontSize = 16.sp)
                                Text(
                                    text = ev.title,
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            // Utilization Badge
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(
                                        if (isHighDemand) Color(0xFF450A0A) else Color(0xFF0F172A)
                                    )
                                    .border(
                                        1.dp,
                                        if (isHighDemand) Color(0xFFEF4444) else Color(0xFF334155),
                                        RoundedCornerShape(6.dp)
                                    )
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = String.format("%.1f%%", ev.utilizationPct),
                                    color = if (isHighDemand) Color(0xFFF87171) else Color(0xFF38BDF8),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "${ev.category} • ${ev.venue}",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                            Text(
                                text = "${ev.registeredCount} / ${ev.capacity} filled",
                                color = if (isHighDemand) Color(0xFFFCA5A5) else Color(0xFFE2E8F0),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        if (isHighDemand) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "⚠️ Near Capacity Alert (>90% full)",
                                color = Color(0xFFEF4444),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // Tab 1: Registrations Roster with filter & delete capability
        if (selectedTab == 1) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Student Signups Roster",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                    if (selectedEventFilterId != null) {
                        TextButton(onClick = { selectedEventFilterId = null }) {
                            Text("Clear Filter", fontSize = 11.sp, color = Color(0xFFA78BFA))
                        }
                    }
                }
            }

            if (registrationsList.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No registrations recorded yet.",
                            color = Color(0xFF94A3B8),
                            fontSize = 13.sp
                        )
                    }
                }
            } else {
                items(registrationsList, key = { it.id }) { reg ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFF1E293B),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = reg.student_name,
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "${reg.roll_number} • ${reg.email}",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Event: ${reg.event_title}",
                                    color = Color(0xFF38BDF8),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = "Signed up: ${reg.registered_at}",
                                    color = Color(0xFF64748B),
                                    fontSize = 10.sp
                                )
                            }

                            // Stretch Goal 2: Cancel Registration with confirmation
                            Button(
                                onClick = { registrationToDelete = reg },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7F1D1D)),
                                shape = RoundedCornerShape(6.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Text("Cancel", color = Color(0xFFFCA5A5), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }

    // Stretch Goal 1: Add Event Dialog
    if (showAddEventDialog) {
        AddEventDialog(
            onDismiss = { showAddEventDialog = false },
            onEventCreated = {
                showAddEventDialog = false
                refreshDashboard()
            }
        )
    }

    // Stretch Goal 2: Cancel Registration Confirmation Dialog
    registrationToDelete?.let { reg ->
        AlertDialog(
            onDismissRequest = { registrationToDelete = null },
            title = {
                Text("Confirm Registration Cancellation", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            },
            text = {
                Text(
                    "Are you sure you want to cancel the registration for '${reg.student_name}' from '${reg.event_title}'? The available seat count will update immediately.",
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            try {
                                ApiClient.deleteRegistration(reg.id)
                                registrationToDelete = null
                                refreshDashboard()
                            } catch (e: Exception) {
                                // Error handling
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Yes, Cancel", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { registrationToDelete = null }) {
                    Text("Back", color = Color(0xFF94A3B8))
                }
            },
            containerColor = Color(0xFF1E293B)
        )
    }
}

@Composable
fun AddEventDialog(
    onDismiss: () -> Unit,
    onEventCreated: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var title by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Technical") }
    var description by remember { mutableStateOf("") }
    var eventDate by remember { mutableStateOf("2026-11-15") }
    var eventTime by remember { mutableStateOf("02:00 PM") }
    var venue by remember { mutableStateOf("Campus Hall") }
    var capacityStr by remember { mutableStateOf("50") }
    var feeStr by remember { mutableStateOf("0") }
    var icon by remember { mutableStateOf("⚡") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color(0xFF0F172A),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier.fillMaxWidth(0.95f)
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("+ Add New Festival Event", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)

                if (errorMessage != null) {
                    Text("❌ $errorMessage", color = Color(0xFFF87171), fontSize = 11.sp)
                }

                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Event Title *", fontSize = 11.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    label = { Text("Category (Technical/Cultural/etc) *", fontSize = 11.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = venue,
                    onValueChange = { venue = it },
                    label = { Text("Venue *", fontSize = 11.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = capacityStr,
                        onValueChange = { capacityStr = it },
                        label = { Text("Capacity *", fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = feeStr,
                        onValueChange = { feeStr = it },
                        label = { Text("Fee (₹)", fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = Color(0xFF94A3B8))
                    }
                    Button(
                        onClick = {
                            val cap = capacityStr.toIntOrNull() ?: 0
                            val fee = feeStr.toIntOrNull() ?: 0
                            if (title.isBlank() || venue.isBlank() || cap <= 0) {
                                errorMessage = "Please enter valid title, venue, and capacity > 0."
                                return@Button
                            }
                            isSubmitting = true
                            coroutineScope.launch {
                                try {
                                    val newEvent = EventCreate(
                                        title = title.trim(),
                                        category = category.trim(),
                                        description = description.trim(),
                                        event_date = eventDate.trim(),
                                        event_time = eventTime.trim(),
                                        venue = venue.trim(),
                                        capacity = cap,
                                        fee = fee,
                                        icon = icon
                                    )
                                    ApiClient.createEvent(newEvent)
                                    isSubmitting = false
                                    onEventCreated()
                                } catch (e: Exception) {
                                    isSubmitting = false
                                    errorMessage = e.localizedMessage ?: "Failed to create event"
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED)),
                        enabled = !isSubmitting
                    ) {
                        Text("Save Event", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
