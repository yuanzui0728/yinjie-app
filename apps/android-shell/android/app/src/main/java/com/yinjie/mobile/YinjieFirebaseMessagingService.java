package com.yinjie.mobile;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class YinjieFirebaseMessagingService extends FirebaseMessagingService {
    private static final String PREFERENCES_NAME = "com.yinjie.mobile_bridge";
    private static final String PUSH_TOKEN_KEY = "push_token";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        if (token == null || token.trim().isEmpty()) {
            return;
        }

        SharedPreferences preferences = getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
        preferences.edit().putString(PUSH_TOKEN_KEY, token.trim()).apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        // Notification rendering is intentionally deferred.
        // The current milestone only persists the registration token so the Web layer
        // can observe whether push registration wiring is active.
    }
}
