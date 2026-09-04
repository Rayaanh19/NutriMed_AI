import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  Share,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getProfile, saveHistoryItem, UserProfile } from '../utils/storage';
import { getBackendUrl } from '../utils/api';

const initialForm = {
  goals: 'fat loss',
  cuisine_preferences: '',
  plan_duration_value: '3',
  plan_duration_unit: 'days'
};

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
      <Text style={styles.label}>{label}</Text>
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

export default function PlannerScreen() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

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

  const getDurationValueOptions = () => {
    const unit = form.plan_duration_unit || 'days';
    let maxVal = 30;
    if (unit === 'weeks') maxVal = 4;
    else if (unit === 'months') maxVal = 12;
    
    return Array.from({ length: maxVal }, (_, i) => ({
      key: String(i + 1),
      label: String(i + 1)
    }));
  };

  const durationUnitOptions = [
    { key: 'days', label: 'days' },
    { key: 'weeks', label: 'weeks' },
    { key: 'months', label: 'months' }
  ];
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [planId, setPlanId] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [sharingPDF, setSharingPDF] = useState(false);

  // Profile autoloading removed; profile loaded dynamically inside handleSubmit
  const handleChange = (name: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'plan_duration_unit') {
        const unit = value;
        const currentVal = parseInt(prev.plan_duration_value || '1', 10);
        let maxVal = 30;
        if (unit === 'weeks') maxVal = 4;
        else if (unit === 'months') maxVal = 12;
        
        if (currentVal > maxVal) {
          updated.plan_duration_value = String(maxVal);
        }
      }
      return updated;
    });
  };
  const toArray = (str: string) => 
    str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setProgress(0);
    setGeneratedPlan('');
    setPlanId('');

    // Simulate progress updates for smooth UI status movement
    let simulatedProgress = 5;
    setProgress(simulatedProgress);
    const progressInterval = setInterval(() => {
      simulatedProgress = Math.min(95, simulatedProgress + Math.floor(Math.random() * 8) + 4);
      setProgress(simulatedProgress);
    }, 450);

    try {
      const profile = await getProfile();
      const base: Partial<UserProfile> = profile || {};

      const payload = {
        age: Number(base.age) || 30,
        sex: base.sex || 'male',
        height_cm: Number(base.height) || 175,
        weight_kg: Number(base.weight) || 70,
        activity_level: base.activity || 'moderate',
        dietary_preferences: base.meatHabit === 'vegetarian' 
          ? ['Vegetarian'] 
          : [`Halal Non-Veg (${(base.allowedMeats || []).join(', ')})`],
        allergies: [],
        diseases: base.diseases || [],
        goals: toArray(form.goals),
        cuisine_preferences: toArray(form.cuisine_preferences),
        plan_duration_value: Number(form.plan_duration_value),
        plan_duration_unit: form.plan_duration_unit,
        eggs_per_week: 0,
        non_veg_per_week: 0,
        daily_meal_plan: '',
      };
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/generate-meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to generate plan');
      }

      const planIdHeader = res.headers.get('X-Plan-ID');
      if (planIdHeader) {
        setPlanId(planIdHeader);
      }

      // Check if body is streamable (Web platform support)
      if (Platform.OS === 'web' && res.body) {
        clearInterval(progressInterval);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let resultText = '';
        const durationValue = Number(form.plan_duration_value) || 1;
        const expectedChars = durationValue * 900; 

        setProgress(10);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          resultText += chunk;
          setGeneratedPlan(resultText);

          // Update progress bar
          const currentProgress = Math.min(
            98,
            Math.round(10 + (resultText.length / expectedChars) * 88)
          );
          setProgress(currentProgress);
        }
        setProgress(100);

        // Save to storage
        await saveHistoryItem({
          name: `${form.plan_duration_value} Day Plan (${form.goals})`,
          type: 'plan',
          details: { result: resultText, id: planIdHeader || 'plan_' + Date.now() }
        });
      } else {
        // Fallback for native devices
        const text = await res.text();
        clearInterval(progressInterval);
        setProgress(100);
        setGeneratedPlan(text);

        // Save to storage
        await saveHistoryItem({
          name: `${form.plan_duration_value} Day Plan (${form.goals})`,
          type: 'plan',
          details: { result: text, id: planIdHeader || 'plan_' + Date.now() }
        });
      }
    } catch (e: any) {
      clearInterval(progressInterval);
      setProgress(0);
      console.error(e);
      setError(e.message || 'Generation timeout or network error');
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const activeId = planId || 'plan_tmp';
    const shareUrl = `${getBackendUrl()}/api/plans/${activeId}`;
    try {
      await Share.share({
        message: `Check out my NutriMed AI meal plan: ${shareUrl}`,
        url: shareUrl,
        title: 'NutriMed AI Meal Plan'
      });
    } catch (e) {
      console.error('Error sharing', e);
    }
  };

  const handleSharePDF = async () => {
    const activeId = planId || 'plan_tmp';
    const pdfUrl = `${getBackendUrl()}/api/plans/${activeId}`;
    
    if (Platform.OS === 'web') {
      window.open(pdfUrl, '_blank');
      return;
    }
    
    setSharingPDF(true);
    try {
      // 1. Fetch print-ready HTML from backend
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error('Failed to fetch plan HTML from backend');
      const html = await res.text();

      // 2. Generate PDF locally
      const { uri } = await Print.printToFileAsync({ html });

      // 3. Share using expo-sharing
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Meal Plan PDF',
          UTI: 'com.adobe.pdf'
        });
      } else {
        alert('Sharing is not supported on this platform');
      }
    } catch (e: any) {
      console.error('Error generating or sharing PDF', e);
      alert(e.message || 'Error generating PDF');
    } finally {
      setSharingPDF(false);
    }
  };

  const triggerQRShare = () => {
    const activeId = planId || 'plan_tmp';
    const shareUrl = `${getBackendUrl()}/api/plans/${activeId}`;
    const encoded = encodeURIComponent(shareUrl);
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`);
    setShowQRModal(true);
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('### ')) {
        return <Text key={index} style={styles.mdH3}>{line.replace('### ', '')}</Text>;
      }
      if (line.startsWith('- ')) {
        const parts = line.replace('- ', '').split('**');
        return (
          <Text key={index} style={styles.mdListItem}>
            • {parts.map((part, partIdx) => 
              partIdx % 2 === 1 
                ? <Text key={partIdx} style={styles.mdBold}>{part}</Text> 
                : part
            )}
          </Text>
        );
      }
      if (line.trim() === '') {
        return <View key={index} style={{ height: 6 }} />;
      }
      const parts = line.split('**');
      return (
        <Text key={index} style={styles.mdParagraph}>
          {parts.map((part, partIdx) => 
            partIdx % 2 === 1 
              ? <Text key={partIdx} style={styles.mdBold}>{part}</Text> 
              : part
          )}
        </Text>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Ambient background glows */}
      <View style={styles.glowOrbGreen} />
      <View style={styles.glowOrbBlue} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Meal Planner</Text>
          <Text style={styles.headerSubtitle}>Customize your daily calorie intake & recipes</Text>
        </View>
        {!generatedPlan && !loading && (
          <View style={styles.glassCard}>
            <Text style={styles.sectionTitle}>Planner Parameters</Text>
            <View style={styles.row}>
              <View style={{ flex: 1.2, marginRight: 8 }}>
                <MobileSelect
                  label="Duration Unit"
                  value={form.plan_duration_unit}
                  options={durationUnitOptions}
                  onSelect={v => handleChange('plan_duration_unit', v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <MobileSelect
                  label="Duration Value"
                  value={form.plan_duration_value}
                  options={getDurationValueOptions()}
                  onSelect={v => handleChange('plan_duration_value', v)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Primary Fitness Goal</Text>
              <TextInput
                style={styles.input}
                value={form.goals}
                onChangeText={v => handleChange('goals', v)}
                placeholder="e.g., fat loss, muscle gain"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cuisine Preferences</Text>
              <TextInput
                style={styles.input}
                value={form.cuisine_preferences}
                onChangeText={v => handleChange('cuisine_preferences', v)}
                placeholder="mediterranean, indian, Italian (comma-separated)"
                placeholderTextColor="#64748b"
              />
            </View>

            <Pressable style={[styles.btn, styles.btnPrimary, { marginTop: 16 }]} onPress={handleSubmit}>
              <Text style={styles.btnTextPrimary}>Generate Meal Blueprint</Text>
            </Pressable>
          </View>
        )}

        {/* Loader Screen */}
        {loading && (
          <View style={[styles.glassCard, styles.loaderContainer]}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loaderTag}>Wait, your meals are generating...</Text>
            
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPct}>{progress}%</Text>
          </View>
        )}

        {/* Error Screen */}
        {error ? (
          <View style={styles.glassCard}>
            <Text style={styles.errorText}>Error Generating Plan</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <Pressable style={[styles.btn, styles.btnSecondary, { marginTop: 12 }]} onPress={() => setError('')}>
              <Text style={styles.btnTextSecondary}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Results view */}
        {generatedPlan && !loading ? (
          <View style={styles.glassCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.sectionTitle}>Your Custom Menu Blueprint</Text>
              
              <View style={styles.resultActions}>
                <Pressable style={styles.actionBtn} onPress={handleShare}>
                  <Text style={styles.actionBtnText}>Share Link</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={handleSharePDF} disabled={sharingPDF}>
                  <Text style={styles.actionBtnText}>{sharingPDF ? 'Generating...' : 'Share PDF'}</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={triggerQRShare}>
                  <Text style={styles.actionBtnText}>QR Share</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => { setGeneratedPlan(''); setPlanId(''); }}>
                  <Text style={styles.actionBtnText}>Reset</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView style={styles.markdownScroll}>
              {renderMarkdown(generatedPlan)}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {/* QR Code Share Modal */}
      <Modal
        visible={showQRModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Meal Plan</Text>
            <Text style={styles.modalSub}>Scan this QR code from any mobile camera to download or print your PDF menu instantly.</Text>
            
            {qrCodeUrl ? (
              <View style={styles.qrContainer}>
                {Platform.OS === 'web' ? (
                  <img src={qrCodeUrl} alt="QR Code" style={{ width: 220, height: 220 }} />
                ) : (
                  <Image source={{ uri: qrCodeUrl }} style={{ width: 220, height: 220 }} />
                )}
              </View>
            ) : null}

            <Pressable 
              style={[styles.btn, styles.btnPrimary, { marginBottom: 10 }]} 
              onPress={handleSharePDF}
              disabled={sharingPDF}
            >
              <Text style={styles.btnTextPrimary}>{sharingPDF ? 'Generating PDF...' : 'Share PDF / Download'}</Text>
            </Pressable>

            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => setShowQRModal(false)}>
              <Text style={styles.btnTextSecondary}>Close</Text>
            </Pressable>
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
  sectionTitle: {
    fontFamily: 'Outfit',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(11, 17, 34, 0.4)',
    borderColor: 'rgba(14, 165, 233, 0.1)',
    borderWidth: 1,
    borderRadius: 12,
    color: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
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
  loaderContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loaderTag: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    marginTop: 16,
    marginBottom: 16,
  },
  progressBarBg: {
    height: 8,
    width: '80%',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0ea5e9',
  },
  progressPct: {
    color: '#0ea5e9',
    fontWeight: '800',
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorSub: {
    color: '#94a3b8',
    fontSize: 13,
  },
  resultHeader: {
    marginBottom: 16,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    borderColor: 'rgba(14, 165, 233, 0.2)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#0ea5e9',
    fontSize: 11,
    fontWeight: '700',
  },
  markdownScroll: {
    maxHeight: 400,
    backgroundColor: 'rgba(11, 17, 34, 0.4)',
    borderColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  markdownText: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'rgba(11, 17, 34, 0.95)',
    borderColor: 'rgba(14, 165, 233, 0.2)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Outfit',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 20,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'center',
  },
  mdH3: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 14,
    marginBottom: 6,
  },
  mdListItem: {
    color: '#f8fafc',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
    paddingLeft: 8,
  },
  mdParagraph: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  mdBold: {
    color: '#0ea5e9',
    fontWeight: '700',
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
});
