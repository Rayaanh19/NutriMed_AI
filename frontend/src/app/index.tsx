import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Pressable, 
  TextInput, 
  Modal, 
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { 
  getProfile, 
  saveProfile, 
  getHistory, 
  clearHistory, 
  UserProfile, 
  HistoryItem,
  getProfilesList,
  setActiveProfileId
} from '../utils/storage';
import { getBackendUrl } from '../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH;

function MobileSelect({ 
  label, 
  value, 
  options, 
  onSelect 
}: { 
  label: string; 
  value: string; 
  options: { key: string; label: string }[]; 
  onSelect: (val: string) => void; 
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.key === value);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable 
        style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
        onPress={() => setOpen(true)}
      >
        <Text style={{ color: selectedOption ? '#ffffff' : '#64748b', fontSize: 15 }}>
          {selectedOption ? selectedOption.label : 'Select option'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#0ea5e9" />
      </Pressable>

      <Modal visible={open} transparent={true} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, { maxHeight: '60%' }]}>
              <Text style={[styles.modalTitle, { fontSize: 18, marginBottom: 12 }]}>Select {label}</Text>
              <ScrollView>
                {options.map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={{
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: 'rgba(14, 165, 233, 0.08)',
                      backgroundColor: value === opt.key ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      marginBottom: 4,
                    }}
                    onPress={() => {
                      onSelect(opt.key);
                      setOpen(false);
                    }}
                  >
                    <Text style={{ 
                      color: value === opt.key ? '#0ea5e9' : '#ffffff', 
                      fontWeight: value === opt.key ? '800' : 'normal',
                      fontSize: 14 
                    }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable style={[styles.btn, styles.btnSecondary, { marginTop: 12 }]} onPress={() => setOpen(false)}>
                <Text style={styles.btnTextSecondary}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: 'User',
    age: 30,
    sex: 'male',
    height: 175,
    weight: 70,
    activity: 'moderate',
  });
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const ageOptions = Array.from({ length: 89 }, (_, i) => ({
    key: String(i + 12),
    label: `${i + 12} years`
  }));

  const heightOptions = Array.from({ length: 121 }, (_, i) => {
    const cm = i + 100;
    const totalInches = Math.round(cm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return {
      key: String(cm),
      label: `${cm} cm (${feet}'${inches}")`
    };
  });

  const weightOptions = Array.from({ length: 151 }, (_, i) => ({
    key: String(i + 30),
    label: `${i + 30} kg`
  }));

  // Profile forms
  const [nameStr, setNameStr] = useState('User');
  const [ageStr, setAgeStr] = useState('30');
  const [sex, setSex] = useState<any>('male');
  
  // BMI Pop-up modal states
  const [showBmiModal, setShowBmiModal] = useState(false);
  const [bmiHeightStr, setBmiHeightStr] = useState('175');
  const [bmiWeightStr, setBmiWeightStr] = useState('70');
  const [bmiActivity, setBmiActivity] = useState('moderate');
  const [bmiIsVegetarian, setBmiIsVegetarian] = useState(true);
  const [bmiAllowedMeats, setBmiAllowedMeats] = useState<string[]>(['Chicken', 'Mutton', 'Beef']);
  const [bmiDiseaseSelect, setBmiDiseaseSelect] = useState('none');
  const [bmiOtherDiseases, setBmiOtherDiseases] = useState('');
  
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [profilesList, setProfilesList] = useState<UserProfile[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const savedProfile = await getProfile();
    if (savedProfile) {
      setProfile(savedProfile);
      setNameStr(savedProfile.name || 'User');
      setAgeStr(savedProfile.age.toString());
      setSex(savedProfile.sex);
      // Load BMI popup states
      setBmiHeightStr(savedProfile.height.toString());
      setBmiWeightStr(savedProfile.weight.toString());
      setBmiActivity(savedProfile.activity || 'moderate');
      setBmiIsVegetarian(savedProfile.meatHabit === 'vegetarian');
      if (savedProfile.allowedMeats && savedProfile.allowedMeats.length > 0) {
        setBmiAllowedMeats(savedProfile.allowedMeats);
      } else {
        setBmiAllowedMeats(['Chicken', 'Mutton', 'Beef']);
      }

      const list = savedProfile.diseases || [];
      const hasDiabetes = list.includes('Diabetes');
      const hasBP = list.includes('High Blood Pressure');
      const others = list.filter(d => d !== 'Diabetes' && d !== 'High Blood Pressure');
      if (others.length > 0) {
        setBmiDiseaseSelect('other');
        setBmiOtherDiseases(others.join(', '));
      } else if (hasDiabetes && hasBP) {
        setBmiDiseaseSelect('both');
      } else if (hasDiabetes) {
        setBmiDiseaseSelect('diabetes');
      } else if (hasBP) {
        setBmiDiseaseSelect('bp');
      } else {
        setBmiDiseaseSelect('none');
      }
      setIsOnboarded(true);
    } else {
      setIsOnboarded(false);
    }
    const savedHistory = await getHistory();
    setHistory(savedHistory);
    const plist = await getProfilesList();
    setProfilesList(plist);
  };

  const handleSkipOnboarding = async () => {
    const defaultProfile = {
      name: 'User',
      age: 30,
      sex: 'male' as const,
      height: 175,
      weight: 70,
      activity: 'moderate',
      diseases: [],
      meatHabit: 'vegetarian'
    };
    const saved = await saveProfile(defaultProfile);
    setProfile(saved);
    setIsOnboarded(true);
  };

  const handleBmiSubmit = async (bmiData: any) => {
    const savedProfile = await getProfile();
    const base: Partial<UserProfile> = savedProfile || {};

    const updated = {
      ...(base.id ? { id: base.id } : {}),
      name: nameStr || base.name || 'User',
      age: parseInt(ageStr, 10) || 30,
      sex: (sex || base.sex || 'male') as 'male' | 'female' | 'other',
      height: parseFloat(bmiData.height) || 175,
      weight: parseFloat(bmiData.weight) || 70,
      activity: bmiData.activity || 'moderate',
      meatHabit: bmiData.meatHabit || 'vegetarian',
      allowedMeats: bmiData.allowedMeats || [],
      diseases: bmiData.diseases || [],
    };

    const saved = await saveProfile(updated);
    setProfile(saved);
    setShowBmiModal(false);
    setIsOnboarded(true);
  };

  const handleClearHistory = () => {
    const executeClear = async () => {
      await clearHistory();
      setHistory([]);
    };
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to clear your meal logs and scan history?")) {
        executeClear();
      }
    } else {
      Alert.alert(
        "Clear History",
        "Are you sure you want to clear your meal logs and scan history?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear", style: "destructive", onPress: executeClear }
        ]
      );
    }
  };

  const renderBmiModal = () => {
    return (
      <Modal
        visible={showBmiModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (isOnboarded) setShowBmiModal(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={[styles.slideTitle, { fontSize: 20, marginBottom: 4 }]}>BMI & Health Habits Form</Text>
                <Text style={[styles.slideText, { fontSize: 13, marginBottom: 20, textAlign: 'left' }]}>
                  Provide your height, weight, activity level, dietary habits, and medical conditions to calculate your BMI and customize recommendations.
                </Text>

                <MobileSelect
                  label="Height (cm)"
                  value={bmiHeightStr}
                  options={heightOptions}
                  onSelect={setBmiHeightStr}
                />

                <MobileSelect
                  label="Weight (kg)"
                  value={bmiWeightStr}
                  options={weightOptions}
                  onSelect={setBmiWeightStr}
                />

                <MobileSelect
                  label="Activity Level"
                  value={bmiActivity}
                  options={[
                    { key: 'sedentary', label: 'Sedentary (Little or no exercise)' },
                    { key: 'light', label: 'Lightly Active (Light exercise 1-3 days/week)' },
                    { key: 'moderate', label: 'Moderately Active (Moderate exercise 3-5/week)' },
                    { key: 'active', label: 'Very Active (Hard exercise 6-7 days/week)' },
                    { key: 'very_active', label: 'Super Active (Physical work twice a day)' }
                  ]}
                  onSelect={(val) => setBmiActivity(val)}
                />

                <MobileSelect
                  label="Dietary Habits (Meat Preferences)"
                  value={bmiIsVegetarian ? 'vegetarian' : 'halal'}
                  options={[
                    { key: 'vegetarian', label: 'Vegetarian (No meat)' },
                    { key: 'halal', label: 'Non-Veg (Halal Diet)' }
                  ]}
                  onSelect={(val) => setBmiIsVegetarian(val === 'vegetarian')}
                />

                {!bmiIsVegetarian && (
                  <View style={{ padding: 12, borderRadius: 12, borderColor: 'rgba(14, 165, 233, 0.15)', borderWidth: 1, backgroundColor: 'rgba(14,165,233,0.02)', marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0ea5e9', marginBottom: 6 }}>
                      Halal Meat Choices (Pork is strictly prohibited / Haram)
                    </Text>
                    
                    <View style={{ gap: 6, marginBottom: 8 }}>
                      {['Chicken', 'Mutton', 'Beef', 'Fish/Seafood'].map((meat) => {
                        const isChecked = bmiAllowedMeats.includes(meat);
                        return (
                          <Pressable
                            key={meat}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
                            onPress={() => {
                              if (isChecked) {
                                setBmiAllowedMeats(bmiAllowedMeats.filter(m => m !== meat));
                              } else {
                                setBmiAllowedMeats([...bmiAllowedMeats, meat]);
                              }
                            }}
                          >
                            <MaterialCommunityIcons 
                              name={isChecked ? "checkbox-marked" : "checkbox-blank-outline"} 
                              size={18} 
                              color={isChecked ? '#0ea5e9' : '#64748b'} 
                            />
                            <Text style={{ color: isChecked ? '#ffffff' : '#94a3b8', fontSize: 13 }}>{meat}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    
                    <Text style={{ fontSize: 11, color: '#fbbf24' }}>
                      ⚠️ Note: Pork/pig meat is strictly excluded from all recommendations (pure Halal).
                    </Text>
                  </View>
                )}

                <Text style={[styles.inputLabel, { marginBottom: 8 }]}>Diseases & Medical Conditions</Text>
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {[
                    { key: 'none', label: 'None / No conditions' },
                    { key: 'diabetes', label: 'Diabetes' },
                    { key: 'bp', label: 'High Blood Pressure' },
                    { key: 'both', label: 'Both (Diabetes & High BP)' },
                    { key: 'other', label: 'Other / Custom Condition' }
                  ].map((item) => {
                    const isSelected = bmiDiseaseSelect === item.key;
                    return (
                      <Pressable 
                        key={item.key} 
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
                        onPress={() => setBmiDiseaseSelect(item.key)}
                      >
                        <MaterialCommunityIcons 
                          name={isSelected ? "radiobox-marked" : "radiobox-blank"} 
                          size={20} 
                          color={isSelected ? '#0ea5e9' : '#64748b'} 
                        />
                        <Text style={{ color: isSelected ? '#ffffff' : '#94a3b8', fontSize: 14 }}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {bmiDiseaseSelect === 'other' && (
                  <>
                    <Text style={styles.inputLabel}>Please specify other conditions (comma separated)</Text>
                    <TextInput 
                      style={styles.input}
                      value={bmiOtherDiseases}
                      onChangeText={setBmiOtherDiseases}
                      placeholder="e.g. thyroid, cholesterol"
                      placeholderTextColor="#64748b"
                    />
                  </>
                )}

                <View style={[styles.modalActions, { marginTop: 20 }]}>
                  {isOnboarded && (
                    <Pressable style={[styles.btn, styles.btnSecondary, { flex: 1 }]} onPress={() => setShowBmiModal(false)}>
                      <Text style={styles.btnTextSecondary}>Cancel</Text>
                    </Pressable>
                  )}
                  <Pressable 
                    style={[styles.btn, styles.btnPrimary, { flex: 1 }]} 
                    onPress={() => {
                      let selectedDiseases: string[] = [];
                      if (bmiDiseaseSelect === 'diabetes') selectedDiseases.push('Diabetes');
                      else if (bmiDiseaseSelect === 'bp') selectedDiseases.push('High Blood Pressure');
                      else if (bmiDiseaseSelect === 'both') selectedDiseases.push('Diabetes', 'High Blood Pressure');
                      else if (bmiDiseaseSelect === 'other' && bmiOtherDiseases.trim()) {
                        bmiOtherDiseases.split(',').forEach(d => {
                          const trimmed = d.trim();
                          if (trimmed) selectedDiseases.push(trimmed);
                        });
                      }
                      handleBmiSubmit({
                        height: bmiHeightStr,
                        weight: bmiWeightStr,
                        activity: bmiActivity,
                        meatHabit: bmiIsVegetarian ? 'vegetarian' : 'halal_non_veg',
                        allowedMeats: bmiIsVegetarian ? [] : bmiAllowedMeats,
                        diseases: selectedDiseases
                      });
                    }}
                  >
                    <Text style={styles.btnTextPrimary}>Save & Calculate BMI</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  const renderUserSwitcherModal = () => {
    return (
      <Modal
        visible={showUserSwitcher}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowUserSwitcher(false)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.slideTitle, { fontSize: 18, marginBottom: 0 }]}>Switch User Account</Text>
              <Pressable onPress={() => setShowUserSwitcher(false)}>
                <Text style={{ color: '#0ea5e9', fontWeight: '800', fontSize: 14 }}>Close</Text>
              </Pressable>
            </View>
            
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              <View style={{ gap: 10, marginVertical: 6 }}>
                {profilesList.map(p => {
                  const isActive = p.id === profile.id;
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
                        loadData();
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

              <Pressable
                style={[styles.btn, styles.btnPrimary, { marginTop: 14 }]}
                onPress={() => {
                  setShowUserSwitcher(false);
                  setNameStr('');
                  setAgeStr('');
                  setSex('male');
                  setBmiHeightStr('');
                  setBmiWeightStr('');
                  setBmiActivity('moderate');
                  setBmiIsVegetarian(true);
                  setBmiAllowedMeats(['Chicken', 'Mutton', 'Beef']);
                  setBmiDiseaseSelect('none');
                  setBmiOtherDiseases('');
                  setShowBmiModal(true);
                }}
              >
                <Text style={styles.btnTextPrimary}>+ Create New Profile</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Target Calculations
  const calculateTargets = () => {
    const { age = 30, sex: userSex = 'male', height = 175, weight = 70, activity: userActivity = 'moderate' } = profile;
    let bmr = 0;
    if (userSex === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }

    const activityFactors: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const calories = Math.round(bmr * (activityFactors[userActivity || 'moderate'] || 1.55));
    const protein = Math.round((calories * 0.30) / 4);
    const carbs = Math.round((calories * 0.40) / 4);
    const fat = Math.round((calories * 0.30) / 9);

    return { calories, protein, carbs, fat };
  };

  const targets = calculateTargets();

  const handleOpenLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.error("Failed to open browser", e);
    }
  };

  const scrollNext = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: (index + 1) * SLIDE_WIDTH, animated: true });
      setActiveSlide(index + 1);
    }
  };

  if (isOnboarded === null) {
    return (
      <SafeAreaView style={[styles.onboardingContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.glowOrbGreen} />
        <View style={styles.glowOrbBlue} />
        <MaterialCommunityIcons name="pulse" size={48} color="#0ea5e9" style={{ transform: [{ scale: 1.2 }] }} />
        <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 14, fontWeight: '700', letterSpacing: 0.5 }}>LACING MEDICAL ENGINE...</Text>
      </SafeAreaView>
    );
  }

  // Render Onboarding state-driven screen transitions
  if (isOnboarded === false) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={styles.onboardingContainer}>
          <View style={styles.glowOrbGreen} />
          <View style={styles.glowOrbBlue} />

          {/* Skip button in header */}
          <View style={styles.skipHeader}>
            <Pressable style={styles.skipBtn} onPress={handleSkipOnboarding}>
              <Text style={styles.skipBtnText}>Skip Onboarding</Text>
              <Ionicons name="arrow-forward" size={14} color="#94a3b8" style={{ marginLeft: 4 }} />
            </Pressable>
          </View>

          <View style={styles.slideContainer}>
            {/* Slide 1: Welcome */}
            {activeSlide === 0 && (
              <View style={styles.slideCard}>
                <View style={styles.iconContainerBg}>
                  <MaterialCommunityIcons name="heart-pulse" size={64} color="#10b981" />
                </View>
                <Text style={styles.slideTitle}>Welcome to NutriMed AI</Text>
                <Text style={styles.slideText}>
                  Your intelligent, local AI-driven health and meal planning companion. Get custom diets computed on your device.
                </Text>
                <Pressable style={styles.slideBtn} onPress={() => setActiveSlide(1)}>
                  <Text style={styles.slideBtnText}>Continue</Text>
                </Pressable>
              </View>
            )}

            {/* Slide 2: AI Planner */}
            {activeSlide === 1 && (
              <View style={[styles.slideCard, { borderColor: 'rgba(6, 182, 212, 0.15)' }]}>
                <View style={[styles.iconContainerBg, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
                  <MaterialCommunityIcons name="calendar-multiselect" size={64} color="#06b6d4" />
                </View>
                <Text style={styles.slideTitle}>AI Meal Planner</Text>
                <Text style={styles.slideText}>
                  Generate custom recipe timetables, daily grocery list requirements, and ingredients customized to your fitness goal.
                </Text>
                <Pressable style={[styles.slideBtn, { backgroundColor: '#06b6d4' }]} onPress={() => setActiveSlide(2)}>
                  <Text style={styles.slideBtnText}>Next</Text>
                </Pressable>
              </View>
            )}

            {/* Slide 3: Scanner */}
            {activeSlide === 2 && (
              <View style={[styles.slideCard, { borderColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <View style={[styles.iconContainerBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <MaterialCommunityIcons name="camera-iris" size={64} color="#f59e0b" />
                </View>
                <Text style={styles.slideTitle}>Plate Scanner</Text>
                <Text style={styles.slideText}>
                  Snap a picture of your dish using the camera to instantly calculate macros distribution and extract the recipe steps.
                </Text>
                <Pressable style={[styles.slideBtn, { backgroundColor: '#f59e0b' }]} onPress={() => setActiveSlide(3)}>
                  <Text style={styles.slideBtnText}>Setup Profile</Text>
                </Pressable>
              </View>
            )}

            {/* Slide 4: Metric Inputs Form */}
            {activeSlide === 3 && (
              <ScrollView contentContainerStyle={styles.formSlideContent} style={styles.formScrollView} keyboardShouldPersistTaps="handled">
                <View style={styles.glassCard}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput 
                    style={styles.input}
                    value={nameStr}
                    onChangeText={setNameStr}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#64748b"
                  />
                  <MobileSelect
                    label="Age"
                    value={ageStr}
                    options={ageOptions}
                    onSelect={setAgeStr}
                  />

                  <Text style={styles.inputLabel}>Sex</Text>
                  <View style={styles.selectorRow}>
                    {[
                      { key: 'male', label: 'Male', icon: 'gender-male' as const },
                      { key: 'female', label: 'Female', icon: 'gender-female' as const }
                    ].map((s) => {
                      const isActive = sex?.toLowerCase() === s.key;
                      return (
                        <Pressable 
                          key={s.key}
                          style={[styles.selectorBtn, isActive && styles.selectorActive, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 }]}
                          onPress={() => setSex(s.key)}
                        >
                          <MaterialCommunityIcons 
                            name={s.icon} 
                            size={18} 
                            color={isActive ? '#ffffff' : '#64748b'} 
                          />
                          <Text style={[styles.selectorText, isActive && styles.selectorTextActive]}>
                            {s.label.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable style={[styles.slideBtn, { marginTop: 24 }]} onPress={() => setShowBmiModal(true)}>
                    <Text style={styles.slideBtnText}>Calculate BMI & Set Health Profile</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>

          {/* Slide Indicator dots */}
          <View style={styles.indicatorContainer}>
            {[0, 1, 2, 3].map((i) => (
              <Pressable
                key={i}
                onPress={() => setActiveSlide(i)}
                style={[
                  styles.dot, 
                  activeSlide === i && styles.activeDot,
                  activeSlide === 0 && activeSlide === i && { backgroundColor: '#10b981' },
                  activeSlide === 1 && activeSlide === i && { backgroundColor: '#06b6d4' },
                  activeSlide === 2 && activeSlide === i && { backgroundColor: '#f59e0b' }
                ]} 
              />
            ))}
          </View>
          {renderBmiModal()}
        </SafeAreaView>
      </TouchableWithoutFeedback>
    );
  }

  // Render Dashboard
  const heightM = (profile.height || 175) / 100;
  const bmi = (profile.weight || 70) / (heightM * heightM);
  const roundedBmi = parseFloat(bmi.toFixed(1));

  let bmiClass = 'Normal';
  let bmiColor = '#10b981'; // green
  let focusText = 'You are at a healthy weight. Focus on eating nutrient-rich foods and maintaining regular physical activity.';
  
  if (roundedBmi < 18.5) {
    bmiClass = 'Underweight';
    bmiColor = '#06b6d4'; // cyan
    focusText = 'Focus on healthy weight gain. Add nutrient-dense snacks, protein-rich foods, and strength training to build muscle.';
  } else if (roundedBmi >= 25.0 && roundedBmi < 30.0) {
    bmiClass = 'Overweight';
    bmiColor = '#f59e0b'; // amber
    focusText = 'Focus on portion control and metabolic health. Combine balanced caloric-deficit planning with active cardio.';
  } else if (roundedBmi >= 30.0) {
    bmiClass = 'Obese';
    bmiColor = '#ef4444'; // red
    focusText = 'Focus on heart health and steady calorie reductions. Consult with a dietitian to balance target calorie restrictions.';
  }

  // Pointer position from 15 to 40
  const gaugePercent = Math.min(Math.max(((roundedBmi - 15) / 25) * 100, 0), 100);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Background Glowing Orbs */}
      <View style={styles.glowOrbGreen} />
      <View style={styles.glowOrbBlue} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Welcome back, {profile.name || 'User'}!</Text>
          <Text style={styles.headerSubtitle}>NutriMed AI Personalized Health Dashboard</Text>
        </View>

        {/* Dashboard Cards Grid */}
        <View style={styles.grid}>
          {/* Calorie Card */}
          <View style={[styles.glassCard, styles.col4]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>CLINICAL CALORIES</Text>
              <View style={[styles.iconBubble, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
                <MaterialCommunityIcons name="heart-pulse" size={16} color="#0ea5e9" />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#0ea5e9' }]}>{targets.calories} kcal</Text>
            <Text style={styles.cardSub}>Daily metabolic maintenance</Text>
          </View>

          {/* Protein Card */}
          <View style={[styles.glassCard, styles.col4]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>CELLULAR PROTEIN</Text>
              <View style={[styles.iconBubble, { backgroundColor: 'rgba(13, 148, 136, 0.1)' }]}>
                <MaterialCommunityIcons name="dna" size={16} color="#0d9488" />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#0d9488' }]}>{targets.protein} g</Text>
            <Text style={styles.cardSub}>Tissue building & recovery</Text>
          </View>

          {/* Carbs/Fat Card */}
          <View style={[styles.glassCard, styles.col12]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>CARBS & FATS RATIO</Text>
              <View style={[styles.iconBubble, { backgroundColor: 'rgba(255, 78, 80, 0.1)' }]}>
                <MaterialCommunityIcons name="pill" size={16} color="#ff4e50" />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#ff4e50' }]}>{targets.carbs}g / {targets.fat}g</Text>
            <Text style={styles.cardSub}>Fuels physical activity & maintains hormones</Text>
          </View>
        </View>

        {/* BMI Health Analysis Card */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>BMI Health Analysis</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 12 }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: '#ffffff', fontFamily: 'Outfit' }}>
              {roundedBmi}
            </Text>
            <View style={{ backgroundColor: bmiColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderColor: bmiColor, borderWidth: 1 }}>
              <Text style={{ color: bmiColor, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                {bmiClass}
              </Text>
            </View>
          </View>

          <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 18, marginBottom: 16 }}>
            {focusText}
          </Text>

          {/* Visual scale track */}
          <View style={{ height: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, overflow: 'hidden', flexDirection: 'row', position: 'relative', marginBottom: 20 }}>
            {/* Underweight (15-18.5 => 14%) */}
            <View style={{ flex: 14, backgroundColor: '#06b6d4' }} />
            {/* Normal (18.5-25 => 26%) */}
            <View style={{ flex: 26, backgroundColor: '#10b981' }} />
            {/* Overweight (25-30 => 20%) */}
            <View style={{ flex: 20, backgroundColor: '#f59e0b' }} />
            {/* Obese (30-40 => 40%) */}
            <View style={{ flex: 40, backgroundColor: '#ef4444' }} />

            {/* Slider pointer pin */}
            <View style={{
              position: 'absolute',
              left: `${gaugePercent}%`,
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: '#ffffff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 3,
              transform: [{ translateX: -2 }]
            }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -14, marginBottom: 6 }}>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '800' }}>15.0</Text>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '800' }}>18.5</Text>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '800' }}>25.0</Text>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '800' }}>30.0</Text>
            <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '800' }}>40.0</Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.glassCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Biological Profile</Text>
            <Pressable 
              style={styles.btnGlass} 
              onPress={() => setShowBmiModal(true)}
            >
              <Text style={styles.btnGlassText}>Update Metrics</Text>
            </Pressable>
          </View>

          <View style={styles.profileRow}>
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>SEX</Text>
              <Text style={styles.profileVal}>{(profile.sex || 'male').toUpperCase()}</Text>
            </View>
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>AGE</Text>
              <Text style={styles.profileVal}>{profile.age} yrs</Text>
            </View>
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>HEIGHT</Text>
              <Text style={styles.profileVal}>{profile.height} cm</Text>
            </View>
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>WEIGHT</Text>
              <Text style={styles.profileVal}>{profile.weight} kg</Text>
            </View>
          </View>

          <View style={{ marginTop: 14, borderTopColor: 'rgba(14, 165, 233, 0.08)', borderTopWidth: 1, paddingTop: 10 }}>
            <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 2 }}>ACTIVITY LEVEL</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff', marginBottom: 8, textTransform: 'capitalize' }}>
              {profile.activity || 'Moderate'}
            </Text>

            <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 2 }}>DIETARY HABIT</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff', marginBottom: 8 }}>
              {profile.meatHabit === 'vegetarian' 
                ? 'Vegetarian' 
                : `Non-Veg (Halal: ${(profile.allowedMeats && profile.allowedMeats.length > 0 ? profile.allowedMeats.join(', ') : 'None')})`
              }
            </Text>
            
            <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', marginBottom: 2 }}>DISEASES & CONDITIONS</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
              {profile.diseases && profile.diseases.length > 0 ? profile.diseases.join(', ') : 'None'}
            </Text>
          </View>
        </View>

        {/* Quick Launch Actions */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <Pressable 
              style={[styles.btn, styles.btnPrimary]} 
              onPress={() => router.push('/planner')}
            >
              <Text style={styles.btnTextPrimary}>Generate Meal Plan</Text>
            </Pressable>

            <Pressable 
              style={[styles.btn, styles.btnSecondary]} 
              onPress={() => router.push('/scanner')}
            >
              <Text style={styles.btnTextSecondary}>Scan Food Image</Text>
            </Pressable>
          </View>
        </View>

        {/* History Card list */}
        <View style={styles.glassCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Logged History & Scans</Text>
            {history.length > 0 && (
              <Pressable onPress={handleClearHistory}>
                <Text style={styles.clearHistoryText}>Clear Log</Text>
              </Pressable>
            )}
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No logs saved yet.</Text>
              <Text style={styles.emptySub}>Set up a meal plan or analyze dish components to get started.</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {history.map((item) => (
                <Pressable 
                  key={item.id} 
                  style={styles.historyItem}
                  onPress={() => setSelectedItem(item)}
                >
                  <View>
                    <Text style={styles.historyName}>{item.name}</Text>
                    <Text style={styles.historyMeta}>
                      {item.type === 'scan' ? '📷 Scanner' : item.type === 'qr' ? '🔍 QR Share' : '📋 Planner'} • {new Date(item.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  {item.calories && (
                    <Text style={styles.historyCalories}>{item.calories} kcal</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {renderBmiModal()}
      {renderUserSwitcherModal()}

      {/* History Detail modal popup */}
      <Modal
        visible={selectedItem !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>{selectedItem?.name}</Text>
                <Text style={styles.modalDate}>
                  {selectedItem && new Date(selectedItem.timestamp).toLocaleString()}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedItem(null)}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView style={{ marginTop: 16 }}>
              {selectedItem?.type === 'plan' ? (
                <View style={styles.planDetailsContainer}>
                  <Text style={styles.planText}>
                    {selectedItem.details?.result || selectedItem.details || ""}
                  </Text>
                  
                  <Pressable 
                    style={[styles.btn, styles.btnPrimary, { marginTop: 16 }]}
                    onPress={() => {
                      const planId = selectedItem.details?.id || selectedItem.id;
                      handleOpenLink(`${getBackendUrl()}/api/plans/${planId}`);
                    }}
                  >
                    <Text style={styles.btnTextPrimary}>Open Plan / Save PDF</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.scanDetailsContainer}>
                  <View style={styles.calorieBubble}>
                    <Text style={styles.bubbleValue}>{selectedItem?.details?.calories}</Text>
                    <Text style={styles.bubbleLabel}>kcal</Text>
                  </View>

                  <View style={styles.macroList}>
                    <Text style={styles.macroText}>Protein: {selectedItem?.details?.macros?.protein}g</Text>
                    <Text style={styles.macroText}>Carbs: {selectedItem?.details?.macros?.carbs}g</Text>
                    <Text style={styles.macroText}>Fat: {selectedItem?.details?.macros?.fat}g</Text>
                  </View>

                  {selectedItem?.details?.suitability && (
                    <View style={{
                      marginVertical: 12,
                      padding: 10,
                      borderRadius: 12,
                      backgroundColor: selectedItem.details.suitability.allowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      borderColor: selectedItem.details.suitability.allowed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      borderWidth: 1
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 14 }}>{selectedItem.details.suitability.allowed ? '✅' : '❌'}</Text>
                        <Text style={{ fontWeight: '800', color: selectedItem.details.suitability.allowed ? '#10b981' : '#ef4444', fontSize: 12 }}>
                          {selectedItem.details.suitability.allowed ? 'SUITABLE / RECOMMENDED' : 'AVOID / NOT RECOMMENDED'}
                        </Text>
                      </View>
                      {selectedItem.details.suitability.reasons?.map((reason: string, idx: number) => (
                        <Text key={idx} style={{ fontSize: 11, color: '#94a3b8', marginLeft: 20 }}>• {reason}</Text>
                      ))}
                    </View>
                  )}

                  <Text style={styles.sectionHeading}>Description</Text>
                  <Text style={styles.descriptionText}>{selectedItem?.details?.description}</Text>

                  <Text style={styles.sectionHeading}>Ingredients</Text>
                  {selectedItem?.details?.ingredients?.map((ing: string, i: number) => (
                    <Text key={i} style={styles.bulletItem}>• {ing}</Text>
                  ))}

                  <Text style={styles.sectionHeading}>Instructions</Text>
                  {selectedItem?.details?.recipe?.map((step: string, i: number) => (
                    <Text key={i} style={styles.bulletItem}>{i + 1}. {step}</Text>
                  ))}
                  
                  <Pressable 
                    style={[styles.btn, styles.btnSecondary, { marginTop: 16 }]}
                    onPress={() => {
                      handleOpenLink(`${getBackendUrl()}/api/dishes/${encodeURIComponent(selectedItem?.name || '')}`);
                    }}
                  >
                    <Text style={styles.btnTextSecondary}>Open Recipe / Save PDF</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
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
  col4: {
    flex: 1,
    minWidth: '45%',
  },
  col12: {
    width: '100%',
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    marginTop: 8,
  },
  cardSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'Outfit',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGlass: {
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    borderColor: 'rgba(14, 165, 233, 0.2)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  btnGlassText: {
    color: '#0ea5e9',
    fontSize: 11,
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 17, 34, 0.4)',
    borderColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  profileItem: {
    alignItems: 'center',
  },
  profileLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 4,
  },
  profileVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  btnTextPrimary: {
    color: '#060814',
    fontWeight: '800',
    fontSize: 14,
  },
  btnSecondary: {
    backgroundColor: 'rgba(14, 165, 233, 0.04)',
    borderColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
  },
  btnTextSecondary: {
    color: '#0ea5e9',
    fontWeight: '800',
    fontSize: 14,
  },
  clearHistoryText: {
    color: '#ff4e50',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 17, 34, 0.5)',
    borderColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  historyMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  historyCalories: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0ea5e9',
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
  modalTitle: {
    fontFamily: 'Outfit',
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleText: {
    fontFamily: 'Outfit',
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  closeText: {
    color: '#0ea5e9',
    fontSize: 12,
    fontWeight: '700',
  },
  planDetailsContainer: {
    paddingVertical: 10,
  },
  planText: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 20,
  },
  scanDetailsContainer: {
    paddingVertical: 10,
  },
  calorieBubble: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.2)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bubbleValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0ea5e9',
  },
  bubbleLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginTop: -2,
  },
  macroList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
    borderColor: 'rgba(14, 165, 233, 0.1)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  macroText: {
    fontSize: 12,
    color: '#f8fafc',
    fontWeight: '600',
  },
  sectionHeading: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 18,
    marginBottom: 8,
    borderBottomColor: 'rgba(14, 165, 233, 0.1)',
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  descriptionText: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  bulletItem: {
    color: '#f8fafc',
    fontSize: 13,
    marginBottom: 5,
    paddingLeft: 8,
  },
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#060814',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingGlassCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.8)',
    borderColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    width: '90%',
    maxWidth: 450,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 8,
  },
  slide: {
    width: SLIDE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainerBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    borderColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
  },
  slideTitle: {
    fontFamily: 'Outfit',
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 14,
  },
  slideText: {
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 26,
  },
  slideBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  slideBtnText: {
    color: '#060814',
    fontWeight: '800',
    fontSize: 14,
  },
  formSlideContent: {
    justifyContent: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 30,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 18,
    backgroundColor: '#ffffff',
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
  skipHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 12,
    zIndex: 10,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 12,
    right: 0,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  skipBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  slideContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 60,
    marginBottom: 80,
  },
  slideCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.8)',
    borderColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    width: '90%',
    maxWidth: 450,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 8,
  },
  formScrollView: {
    width: '100%',
    maxWidth: 450,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(11, 17, 34, 0.4)',
    borderColor: 'rgba(14, 165, 233, 0.1)',
    borderWidth: 1,
    borderRadius: 12,
    color: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorBtn: {
    flex: 1,
    backgroundColor: 'rgba(11, 17, 34, 0.4)',
    borderColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectorActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  selectorText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
  },
  selectorTextActive: {
    color: '#060814',
  },
  selectorCol: {
    gap: 8,
  },
  selectorItem: {
    backgroundColor: 'rgba(11, 17, 34, 0.4)',
    borderColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectorItemActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: '#0ea5e9',
  },
  selectorItemText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  selectorItemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalDate: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
});
