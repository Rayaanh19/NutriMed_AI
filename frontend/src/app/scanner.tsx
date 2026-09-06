import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getBackendUrl } from '../utils/api';
import { saveHistoryItem, getProfile } from '../utils/storage';

export default function ScannerScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const getBase64FromAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    if (asset.base64) {
      if (asset.base64.startsWith('data:')) {
        return asset.base64;
      }
      const mime = asset.mimeType || 'image/jpeg';
      return `data:${mime};base64,${asset.base64}`;
    }
    if (asset.uri && asset.uri.startsWith('data:')) {
      return asset.uri;
    }
    if (asset.uri) {
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to convert blob to data URL'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Could not read asset URI as base64 data URL:', e);
      }
    }
    return null;
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your gallery to upload plate photos.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: Platform.OS !== 'web',
        quality: 0.7,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
        const formattedImg = await getBase64FromAsset(pickerResult.assets[0]);
        if (formattedImg) {
          setImage(formattedImg);
          setResult(null);
          setError('');
        } else {
          setError('Failed to extract valid image data.');
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera permission to take a photo of your food.');
        return;
      }

      const captureResult = await ImagePicker.launchCameraAsync({
        allowsEditing: Platform.OS !== 'web',
        quality: 0.7,
        base64: true,
      });

      if (!captureResult.canceled && captureResult.assets && captureResult.assets[0]) {
        const formattedImg = await getBase64FromAsset(captureResult.assets[0]);
        if (formattedImg) {
          setImage(formattedImg);
          setResult(null);
          setError('');
        } else {
          setError('Failed to capture valid image data.');
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to launch camera');
    }
  };

  const resetScanner = () => {
    setImage(null);
    setResult(null);
    setError('');
    setHint('');
    setProgress(0);
  };

  const handleScanSubmit = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    setProgress(10);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) return prev + 5;
        if (prev < 80) return prev + 2;
        if (prev < 96) return prev + 1;
        return prev;
      });
    }, 200);

    try {
      const backendUrl = getBackendUrl();
      const profileData = await getProfile();

      const response = await fetch(`${backendUrl}/api/scan-food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image, 
          hint,
          allergies: profileData?.allergies || '',
          diseases: profileData?.diseases || []
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze plate image');
      }

      clearInterval(interval);
      setProgress(100);
      setResult(data);

      // Save to local storage history log
      await saveHistoryItem({
        name: data.name,
        type: 'scan',
        calories: data.calories,
        details: data
      });
    } catch (e: any) {
      clearInterval(interval);
      console.error(e);
      setError(e.message || 'Error occurred while communicating with AI.');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const calculatePercentages = (macros: any) => {
    const { protein = 0, carbs = 0, fat = 0 } = macros || {};
    const total = (protein * 4) + (carbs * 4) + (fat * 9) || 1;
    return {
      pPercent: Math.round(((protein * 4) / total) * 100),
      cPercent: Math.round(((carbs * 4) / total) * 100),
      fPercent: Math.round(((fat * 9) / total) * 100),
    };
  };

  const percentages = result ? calculatePercentages(result.macros) : { pPercent: 33, cPercent: 33, fPercent: 33 };

  const handleOpenLink = async (url: string) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (e) {
      console.error("Failed to open browser", e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Ambient background glows */}
      <View style={styles.glowOrbGreen} />
      <View style={styles.glowOrbBlue} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Food Analyzer</Text>
          <Text style={styles.headerSubtitle}>Identify nutritional profiles & recipes from pictures</Text>
        </View>

        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>Analyzer Input</Text>

          {/* Hint input */}
          {!result && !loading && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dish Title / Guess Hint (Optional)</Text>
              <TextInput
                style={styles.input}
                value={hint}
                onChangeText={setHint}
                placeholder="e.g. Chicken breast with white rice, avo toast"
                placeholderTextColor="#64748b"
              />
            </View>
          )}

          {/* Image Select Buttons */}
          {!image && !loading && !result && (
            <View style={styles.buttonGrid}>
              <Pressable style={styles.uploadBtn} onPress={pickImage}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(14, 165, 233, 0.08)' }]}>
                  <MaterialCommunityIcons name="image-multiple" size={28} color="#0ea5e9" />
                </View>
                <Text style={styles.uploadText}>Select Photo</Text>
                <Text style={styles.uploadSub}>Pick from gallery</Text>
              </Pressable>

              <Pressable style={styles.uploadBtn} onPress={takePhoto}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(13, 148, 136, 0.08)' }]}>
                  <MaterialCommunityIcons name="camera" size={28} color="#0d9488" />
                </View>
                <Text style={styles.uploadText}>Open Camera</Text>
                <Text style={styles.uploadSub}>Capture food photo</Text>
              </Pressable>
            </View>
          )}

          {/* Image Preview & Submit */}
          {image && !loading && !result && (
            <View style={styles.previewContainer}>
              <Text style={styles.label}>Captured plate photo</Text>
              <Image source={{ uri: image }} style={styles.previewImage} />
              
              <View style={styles.actionRow}>
                <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleScanSubmit}>
                  <Text style={styles.btnTextPrimary}>Analyze with AI</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.btnSecondary]} onPress={resetScanner}>
                  <Text style={styles.btnTextSecondary}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Loading view */}
          {loading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text style={styles.loaderText}>Processing image with Gemini...</Text>
              
              <View style={[styles.progressBarBgFull, { width: '80%', height: 8, marginTop: 12 }]}>
                <View style={[styles.progressBarFillFull, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressPct}>{progress}%</Text>

              <Text style={styles.loaderSub}>Detecting components, volumes, and calculating macros...</Text>
            </View>
          )}

          {/* Error view */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error Scanning Plate</Text>
              <Text style={styles.errorSub}>{error}</Text>
              <Pressable style={[styles.btn, styles.btnSecondary, { marginTop: 12 }]} onPress={resetScanner}>
                <Text style={styles.btnTextSecondary}>Reset Scanner</Text>
              </Pressable>
            </View>
          )}

          {/* Results Analysis */}
          {result && !loading && (
            <View style={styles.resultsContainer}>
              <View style={styles.resultHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishName}>{result.name}</Text>
                  <Text style={styles.confidence}>Confidence: {Math.round((result.confidence || 1.0) * 100)}%</Text>
                </View>
                <Pressable style={styles.resetBtn} onPress={resetScanner}>
                  <Text style={styles.resetBtnText}>New Scan</Text>
                </Pressable>
              </View>

              {/* Nutrition Card info */}
              <View style={styles.nutritionCard}>
                <View style={styles.calorieBox}>
                  <Text style={styles.calorieValue}>{result.calories}</Text>
                  <Text style={styles.calorieLabel}>kcal</Text>
                </View>

                <View style={styles.macroProgressRow}>
                  <Text style={[styles.macroLabelText, { color: '#0ea5e9' }]}>Protein: {result.macros.protein}g ({percentages.pPercent}%)</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { backgroundColor: '#0ea5e9', width: `${percentages.pPercent}%` }]} />
                  </View>

                  <Text style={[styles.macroLabelText, { color: '#0d9488' }]}>Carbs: {result.macros.carbs}g ({percentages.cPercent}%)</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { backgroundColor: '#0d9488', width: `${percentages.cPercent}%` }]} />
                  </View>

                  <Text style={[styles.macroLabelText, { color: '#ff4e50' }]}>Fat: {result.macros.fat}g ({percentages.fPercent}%)</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { backgroundColor: '#ff4e50', width: `${percentages.fPercent}%` }]} />
                  </View>
                </View>
              </View>

              <Text style={styles.sectionHeading}>Description</Text>
              <Text style={styles.descriptionText}>{result.description}</Text>

              {result.suitability && (
                <View style={{
                  marginVertical: 12,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: result.suitability.allowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: result.suitability.allowed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  borderWidth: 1
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 14 }}>{result.suitability.allowed ? '✅' : '❌'}</Text>
                    <Text style={{ fontWeight: '800', color: result.suitability.allowed ? '#10b981' : '#ef4444', fontSize: 12 }}>
                      {result.suitability.allowed ? 'SUITABLE / RECOMMENDED' : 'AVOID / NOT RECOMMENDED'}
                    </Text>
                  </View>
                  {result.suitability.reasons?.map((reason: string, idx: number) => (
                    <Text key={idx} style={{ fontSize: 11, color: '#94a3b8', marginLeft: 20 }}>• {reason}</Text>
                  ))}
                </View>
              )}

              <Text style={styles.sectionHeading}>Ingredients</Text>
              {result.ingredients.map((ing: string, i: number) => (
                <Text key={i} style={styles.bulletItem}>• {ing}</Text>
              ))}

              <Text style={styles.sectionHeading}>Recipe Instructions</Text>
              {result.recipe.map((step: string, i: number) => (
                <Text key={i} style={styles.bulletItem}>{i + 1}. {step}</Text>
              ))}

              {/* Save PDF */}
              <Pressable 
                style={[styles.btn, styles.btnPrimary, { marginTop: 20 }]}
                onPress={() => {
                  handleOpenLink(`${getBackendUrl()}/api/dishes/${encodeURIComponent(result.name)}`);
                }}
              >
                <Text style={styles.btnTextPrimary}>Open PDF / Save Recipe</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
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
  inputGroup: {
    marginBottom: 16,
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
  buttonGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: 'rgba(11, 17, 34, 0.4)',
    borderColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.15)',
  },
  uploadText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  uploadSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  previewContainer: {
    alignItems: 'stretch',
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.15)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
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
  loaderText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  loaderSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'stretch',
  },
  errorText: {
    color: '#ff4e50',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorSub: {
    color: '#94a3b8',
    fontSize: 13,
  },
  resultsContainer: {
    alignItems: 'stretch',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dishName: {
    fontFamily: 'Outfit',
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  confidence: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  resetBtn: {
    backgroundColor: 'rgba(14, 165, 233, 0.06)',
    borderColor: 'rgba(14, 165, 233, 0.2)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#0ea5e9',
    fontSize: 11,
    fontWeight: '700',
  },
  nutritionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 17, 34, 0.4)',
    borderColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  calorieBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.2)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  calorieValue: {
    color: '#0ea5e9',
    fontSize: 18,
    fontWeight: '800',
  },
  calorieLabel: {
    color: '#64748b',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  macroProgressRow: {
    flex: 1,
  },
  macroLabelText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 3,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
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
  progressPct: {
    color: '#0ea5e9',
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  progressBarBgFull: {
    height: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFillFull: {
    height: '100%',
    backgroundColor: '#0ea5e9',
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
