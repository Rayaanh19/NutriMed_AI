import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function AppTabs() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#0ea5e9', // Medical Cyan
      tabBarInactiveTintColor: '#64748b',
      tabBarStyle: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 20 : 12,
        left: 14,
        right: 14,
        height: 72,
        backgroundColor: 'rgba(8, 12, 24, 0.92)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.18)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(14, 165, 233, 0.18)',
        paddingBottom: Platform.OS === 'ios' ? 6 : 8,
        paddingTop: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
        ...Platform.select({
          web: {
            boxShadow: '0px 10px 24px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          },
          default: {}
        })
      },
      tabBarItemStyle: {
        paddingVertical: 2,
        justifyContent: 'center',
        alignItems: 'center',
      },
      tabBarLabelStyle: {
        fontSize: 10.5,
        fontWeight: '700',
        marginTop: 1,
        paddingBottom: 2,
      },
      headerShown: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-sharp" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Diet Plan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="nutrition-sharp" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scan Dish',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-sharp" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-sharp" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
