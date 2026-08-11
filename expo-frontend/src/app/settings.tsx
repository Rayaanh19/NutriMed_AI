import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Pressable, 
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  getProfile, 
  clearProfile, 
  clearHistory, 
  UserProfile,
  getProfilesList,
  setActiveProfileId,
  deleteProfile,
  saveProfile
} from '../utils/storage';

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const [profilesList, setProfilesList] = useState<UserProfile[]>([]);

  const loadProfile = async () => {
    const savedProfile = await getProfile();
    setProfile(savedProfile);
    const list = await getProfilesList();
    setProfilesList(list);
  };


  const handleDeleteAccount = () => {
    const performDelete = async () => {
      await clearProfile();
      await clearHistory();
      router.replace('/');
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete your account? This will permanently delete your profile, calculated targets, meal history, and diagnostic logs.")) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Delete Account",
        "Are you sure you want to delete your account? This will permanently delete your profile, calculated targets, meal history, and diagnostic logs.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete }
        ]
      );
    }
  };

  const formatActivity = (act: string) => {
    const mapping: Record<string, string> = {
      sedentary: 'Sedentary (No exercise)',
      light: 'Lightly active (1-3 days/week)',
      moderate: 'Moderately active (3-5 days/week)',
      active: 'Very active (6-7 days/week)',
    };
    return mapping[act] || act;
  };
  const renderUserSwitcherModal = () => {
    return (
      <Modal
        visible={showUserSwitcher}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowUserSwitcher(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowUserSwitcher(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff', fontFamily: 'Outfit' }}>Switch User Account</Text>
                  <Pressable onPress={() => setShowUserSwitcher(false)}>
                    <Text style={{ color: '#0ea5e9', fontWeight: '800', fontSize: 14 }}>Close</Text>
                  </Pressable>
                </View>
                
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ width: '100%', maxHeight: 300 }}>
                  <View style={{ gap: 10, marginVertical: 6 }}>
                    {profilesList.map(p => {
                      const isActive = p.id === profile?.id;
                      return (
                        <Pressable
                          key={p.id}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: isActive ? 'rgba(14,165,233,0.06)' : 'rgba(255,255,255,0.02)',
                            borderColor: isActive ? '#0ea5e9' : 'rgba(14,165,233,0.08)',
                            borderWidth: 1
                          }}
                          onPress={async () => {
                            await setActiveProfileId(p.id);
                            setShowUserSwitcher(false);
                            loadProfile();
                          }}
                        >
                          <View>
                            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>{p.name}</Text>
                            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                              {p.age} yrs • {p.height} cm • {p.weight} kg
                            </Text>
                          </View>
                          {isActive ? (
                            <View style={{ backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ color: '#060814', fontSize: 9, fontWeight: '900' }}>ACTIVE</Text>
                            </View>
                          ) : (
                            <MaterialCommunityIcons name="chevron-right" size={18} color="#64748b" />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Background Glowing Orbs */}
      <View style={styles.glowOrbGreen} />
      <View style={styles.glowOrbBlue} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NutriMed AI Settings</Text>
          <Text style={styles.headerSubtitle}>User Accounts and Metric Management</Text>
        </View>

        {/* User Card */}
        <TouchableOpacity 
          activeOpacity={0.85}
          onPress={() => setShowUserSwitcher(true)}
          onLongPress={() => setShowUserSwitcher(true)}
        >
          <View style={styles.glassCard}>
            <View style={[styles.profileHeaderRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                <View style={[styles.avatarBubble, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
                  <MaterialCommunityIcons name="account" size={32} color="#0ea5e9" />
                </View>
                <View style={styles.profileHeaderText}>
                  <Text style={styles.profileName}>{profile?.name || 'User Profile'}</Text>
                  <Text style={styles.profileRole}>NutriMed AI Registered Member</Text>
                </View>
              </View>

              <View style={{ alignItems: 'center', justifyContent: 'center', paddingLeft: 10 }}>
                <MaterialCommunityIcons name="account-switch" size={24} color="#0ea5e9" />
                <Text style={{ color: '#0ea5e9', fontSize: 10, fontWeight: '800', marginTop: 4, textTransform: 'uppercase' }}>Switch</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Profiles & User Accounts List */}
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>USER ACCOUNTS & PROFILES</Text>
          <Text style={styles.actionWarning}>
            Switch between different user profiles or create a new user account without resetting existing records.
          </Text>
          
          <View style={{ gap: 10, marginBottom: 16 }}>
            {profilesList.map(p => {
              const isActive = p.id === profile?.id;
              return (
                <View 
                  key={p.id}
                  style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: 12, 
                    borderRadius: 12, 
                    backgroundColor: isActive ? 'rgba(14,165,233,0.06)' : 'rgba(255,255,255,0.02)',
                    borderColor: isActive ? '#0ea5e9' : 'rgba(14,165,233,0.08)',
                    borderWidth: 1
                  }}
                >
                  <View>
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>{p.name}</Text>
                    <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                      {p.age} yrs • {p.height} cm • {p.weight} kg
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {!isActive && (
                      <Pressable 
                        style={{ backgroundColor: 'rgba(14,165,233,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderColor: 'rgba(14,165,233,0.2)', borderWidth: 1 }}
                        onPress={async () => {
                          await setActiveProfileId(p.id);
                          loadProfile();
                        }}
                      >
                        <Text style={{ color: '#0ea5e9', fontSize: 11, fontWeight: '800' }}>Switch</Text>
                      </Pressable>
                    )}
                    {isActive && (
                      <View style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ color: '#060814', fontSize: 9, fontWeight: '900' }}>ACTIVE</Text>
                      </View>
                    )}
                    {profilesList.length > 1 && (
                      <Pressable 
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1 }}
                        onPress={async () => {
                          if (Platform.OS === 'web') {
                            if (window.confirm(`Are you sure you want to delete profile "${p.name}"?`)) {
                              await deleteProfile(p.id);
                              loadProfile();
                            }
                          } else {
                            Alert.alert(
                              "Delete Profile",
                              `Are you sure you want to delete profile "${p.name}"?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                { 
                                  text: "Delete", 
                                  style: "destructive", 
                                  onPress: async () => {
                                    await deleteProfile(p.id);
                                    loadProfile();
                                  } 
                                }
                              ]
                            );
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={14} color="#fca5a5" />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <Pressable 
            style={styles.btnDelete}
            onPress={async () => {
              // Create a default initial user profile which redirects to home to calculate BMI popup instantly
              const resetForNew = async () => {
                const newProf = await saveProfile({
                  name: 'New Profile',
                  age: 25,
                  sex: 'male',
                  height: 175,
                  weight: 70,
                  activity: 'moderate',
                  diseases: [],
                  meatHabit: 'vegetarian'
                });
                await setActiveProfileId(newProf.id);
                // Trigger reload
                router.replace('/');
              };
              resetForNew();
            }}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color="#fca5a5" />
            <Text style={styles.btnDeleteText}>+ Add New User Profile</Text>
          </Pressable>
        </View>

        {/* Profile Details List */}
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>CLINICAL METRICS & BIOLOGICAL PARAMETERS</Text>

          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>FULL NAME</Text>
              <Text style={styles.detailValue}>{profile?.name || 'N/A'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>AGE</Text>
              <Text style={styles.detailValue}>{profile?.age ? `${profile.age} years` : 'N/A'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SEX</Text>
              <Text style={[styles.detailValue, { textTransform: 'capitalize' }]}>{profile?.sex || 'N/A'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>HEIGHT</Text>
              <Text style={styles.detailValue}>{profile?.height ? `${profile.height} cm` : 'N/A'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>WEIGHT</Text>
              <Text style={styles.detailValue}>{profile?.weight ? `${profile.weight} kg` : 'N/A'}</Text>
            </View>

            <View style={styles.detailRowVertical}>
              <Text style={styles.detailLabel}>WORKOUT ACTIVITY</Text>
              <Text style={styles.detailValueVertical}>
                {profile?.activity ? formatActivity(profile.activity) : 'N/A'}
              </Text>
            </View>

            <View style={styles.detailRowVertical}>
              <Text style={styles.detailLabel}>DIETARY HABIT</Text>
              <Text style={styles.detailValueVertical}>
                {profile?.meatHabit === 'vegetarian' 
                  ? 'Vegetarian' 
                  : `Non-Veg (Halal: ${(profile?.allowedMeats && profile.allowedMeats.length > 0 ? profile.allowedMeats.join(', ') : 'None')})`
                }
              </Text>
            </View>

            <View style={styles.detailRowVerticalLast}>
              <Text style={styles.detailLabel}>DISEASES & CONDITIONS</Text>
              <Text style={styles.detailValueVertical}>
                {profile?.diseases && profile.diseases.length > 0 ? profile.diseases.join(', ') : 'None'}
              </Text>
            </View>
          </View>
        </View>


        {/* Danger Zone */}
        <View style={[styles.glassCard, { borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
          <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>DANGER ZONE</Text>
          <Text style={styles.actionWarning}>
            Deleting your account will permanently wipe your biological profile, calculated nutritional budgets, meal planning history, and custom recipes.
          </Text>

          <Pressable style={styles.btnDelete} onPress={handleDeleteAccount}>
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fca5a5" />
            <Text style={styles.btnDeleteText}>Delete Account & Reset Data</Text>
          </Pressable>
        </View>
      </ScrollView>
      {renderUserSwitcherModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060814',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    zIndex: 2,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'Outfit',
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  glassCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.7)',
    borderColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeaderText: {
    flex: 1,
  },
  profileName: {
    fontFamily: 'Outfit',
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileRole: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0ea5e9',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  detailsList: {
    backgroundColor: 'rgba(11, 17, 34, 0.4)',
    borderColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14, 165, 233, 0.12)',
    borderStyle: 'dashed',
  },
  detailRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailRowVertical: {
    flexDirection: 'column',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(14, 165, 233, 0.12)',
    borderStyle: 'dashed',
  },
  detailRowVerticalLast: {
    flexDirection: 'column',
    paddingVertical: 12,
  },
  detailValueVertical: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  actionWarning: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 18,
  },
  btnReset: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnResetText: {
    color: '#060814',
    fontWeight: '800',
    fontSize: 14,
  },
  btnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDeleteText: {
    color: '#fca5a5',
    fontWeight: '800',
    fontSize: 14,
  },
  glowOrbGreen: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#0ea5e9',
    opacity: 0.08,
  },
  glowOrbBlue: {
    position: 'absolute',
    bottom: 120,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#0d9488',
    opacity: 0.08,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'rgba(11, 17, 34, 0.95)',
    borderColor: 'rgba(14, 165, 233, 0.2)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 10,
  },
});
