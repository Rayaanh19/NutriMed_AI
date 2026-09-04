import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILES_LIST_KEY = 'nutri_profiles_list';
const ACTIVE_PROFILE_ID_KEY = 'nutri_active_profile_id';
const HISTORY_PREFIX = 'nutri_history_';

const LEGACY_PROFILE_KEY = 'nutri_profile';
const LEGACY_HISTORY_KEY = 'nutri_history';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  height: number;
  weight: number;
  activity: string;
  diseases?: string[];
  allergies?: string;
  eggsPerWeek?: number;
  nonVegPerWeek?: number;
  dailyMealPlan?: string;
  meatHabit?: string;
  allowedMeats?: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  name: string;
  type: 'plan' | 'scan' | 'qr';
  calories?: number;
  details: any;
}

export async function getProfilesList(): Promise<UserProfile[]> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_LIST_KEY);
    let list = raw ? JSON.parse(raw) : [];

    // Legacy migration check
    const legacyRaw = await AsyncStorage.getItem(LEGACY_PROFILE_KEY);
    if (legacyRaw && list.length === 0) {
      try {
        const legacyProfile = JSON.parse(legacyRaw);
        const pid = 'user_legacy_' + Date.now();
        const migrated: UserProfile = {
          ...legacyProfile,
          id: pid
        };
        list = [migrated];
        await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(list));
        await AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, pid);

        // Migrate legacy history
        const legacyHistoryRaw = await AsyncStorage.getItem(LEGACY_HISTORY_KEY);
        if (legacyHistoryRaw) {
          await AsyncStorage.setItem(HISTORY_PREFIX + pid, legacyHistoryRaw);
          await AsyncStorage.removeItem(LEGACY_HISTORY_KEY);
        }
        await AsyncStorage.removeItem(LEGACY_PROFILE_KEY);
      } catch (e) {
        console.error('Failed to migrate legacy profile', e);
      }
    }
    return list;
  } catch (e) {
    console.error('Failed to load profiles list', e);
    return [];
  }
}

export async function getActiveProfileId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_PROFILE_ID_KEY);
  } catch (e) {
    console.error('Failed to get active profile ID', e);
    return null;
  }
}

export async function setActiveProfileId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
  } catch (e) {
    console.error('Failed to set active profile ID', e);
  }
}

export async function getProfile(): Promise<UserProfile | null> {
  try {
    const list = await getProfilesList();
    if (list.length === 0) return null;
    const activeId = await getActiveProfileId();
    const found = list.find(p => p.id === activeId);
    return found || list[0];
  } catch (e) {
    console.error('Failed to load active profile', e);
    return null;
  }
}

export async function saveProfile(profile: Omit<UserProfile, 'id'> & { id?: string }): Promise<UserProfile> {
  try {
    const list = await getProfilesList();
    let updatedProfile: UserProfile;
    if (profile.id) {
      updatedProfile = profile as UserProfile;
      const idx = list.findIndex(p => p.id === profile.id);
      if (idx !== -1) {
        list[idx] = updatedProfile;
      } else {
        list.push(updatedProfile);
      }
    } else {
      updatedProfile = {
        ...profile,
        id: 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
      } as UserProfile;
      list.push(updatedProfile);
    }
    await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(list));
    await setActiveProfileId(updatedProfile.id);
    return updatedProfile;
  } catch (e) {
    console.error('Failed to save profile', e);
    throw e;
  }
}

export async function deleteProfile(id: string): Promise<void> {
  try {
    let list = await getProfilesList();
    list = list.filter(p => p.id !== id);
    await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(list));

    // Clear history associated with this profile
    await AsyncStorage.removeItem(HISTORY_PREFIX + id);

    const activeId = await getActiveProfileId();
    if (activeId === id) {
      if (list.length > 0) {
        await setActiveProfileId(list[0].id);
      } else {
        await AsyncStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
      }
    }
  } catch (e) {
    console.error('Failed to delete profile', e);
  }
}

export async function getHistory(profileId?: string): Promise<HistoryItem[]> {
  try {
    let pid = profileId;
    if (!pid) {
      const active = await getProfile();
      if (!active) return [];
      pid = active.id;
    }
    const raw = await AsyncStorage.getItem(HISTORY_PREFIX + pid);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load history', e);
    return [];
  }
}

export async function saveHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>, profileId?: string): Promise<HistoryItem> {
  try {
    let pid = profileId;
    if (!pid) {
      const active = await getProfile();
      if (!active) throw new Error("No active profile to save history");
      pid = active.id;
    }
    const history = await getHistory(pid);
    const newItem: HistoryItem = {
      id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      ...item,
    };
    history.unshift(newItem);
    await AsyncStorage.setItem(HISTORY_PREFIX + pid, JSON.stringify(history));
    return newItem;
  } catch (e) {
    console.error('Failed to save history item', e);
    throw e;
  }
}

export async function clearHistory(profileId?: string): Promise<void> {
  try {
    let pid = profileId;
    if (!pid) {
      const active = await getProfile();
      if (!active) return;
      pid = active.id;
    }
    await AsyncStorage.removeItem(HISTORY_PREFIX + pid);
  } catch (e) {
    console.error('Failed to clear history', e);
  }
}

export async function clearProfile(): Promise<void> {
  try {
    const list = await getProfilesList();
    for (const p of list) {
      await AsyncStorage.removeItem(HISTORY_PREFIX + p.id);
    }
    await AsyncStorage.removeItem(PROFILES_LIST_KEY);
    await AsyncStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
  } catch (e) {
    console.error('Failed to clear profile data', e);
  }
}
