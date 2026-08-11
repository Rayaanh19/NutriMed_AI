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
        bottom: Platform.OS === 'ios' ? 24 : 16,
        left: 16,
        right: 16,
        height: 68,
        backgroundColor: 'rgba(8, 12, 24, 0.85)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(14, 165, 233, 0.12)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(14, 165, 233, 0.12)',
        paddingBottom: Platform.OS === 'ios' ? 8 : 10,
        paddingTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
        ...Platform.select({
          web: {
            boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.5)',
          },
          default: {}
        })
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
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
