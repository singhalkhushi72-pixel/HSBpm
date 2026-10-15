package com.zenith26.fest

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.zenith26.fest.components.TopNavbar
import com.zenith26.fest.screens.AdminDashboardScreen
import com.zenith26.fest.screens.EventListScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ZenithAppRoot()
        }
    }
}

@Composable
fun ZenithAppRoot() {
    var isAdminView by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopNavbar(
                isAdminView = isAdminView,
                onToggleView = { isAdminView = !isAdminView }
            )
        },
        containerColor = Color(0xFF0F172A)
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color(0xFF0F172A))
        ) {
            if (isAdminView) {
                AdminDashboardScreen()
            } else {
                EventListScreen()
            }
        }
    }
}
