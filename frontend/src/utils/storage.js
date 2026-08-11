const PROFILES_LIST_KEY = 'nutri_profiles_list';
const ACTIVE_PROFILE_ID_KEY = 'nutri_active_profile_id';
const HISTORY_PREFIX = 'nutri_history_';

const LEGACY_PROFILE_KEY = 'nutri_profile';
const LEGACY_HISTORY_KEY = 'nutri_history';

export function getProfilesList() {
  try {
    const raw = localStorage.getItem(PROFILES_LIST_KEY);
    let list = raw ? JSON.parse(raw) : [];

    // Legacy migration check
    const legacyRaw = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (legacyRaw && list.length === 0) {
      try {
        const legacyProfile = JSON.parse(legacyRaw);
        const pid = 'user_legacy_' + Date.now();
        const migrated = {
          ...legacyProfile,
          id: pid
        };
        list = [migrated];
        localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(list));
        localStorage.setItem(ACTIVE_PROFILE_ID_KEY, pid);

        // Migrate legacy history
        const legacyHistoryRaw = localStorage.getItem(LEGACY_HISTORY_KEY);
        if (legacyHistoryRaw) {
          localStorage.setItem(HISTORY_PREFIX + pid, legacyHistoryRaw);
          localStorage.removeItem(LEGACY_HISTORY_KEY);
        }
        localStorage.removeItem(LEGACY_PROFILE_KEY);
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

export function getActiveProfileId() {
  try {
    return localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
  } catch (e) {
    console.error('Failed to get active profile ID', e);
    return null;
  }
}

export function setActiveProfileId(id) {
  try {
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Failed to set active profile ID', e);
  }
}

export function getProfile() {
  try {
    const list = getProfilesList();
    if (list.length === 0) return null;
    const activeId = getActiveProfileId();
    const found = list.find(p => p.id === activeId);
    return found || list[0];
  } catch (e) {
    console.error('Failed to load active profile', e);
    return null;
  }
}

export function saveProfile(profile) {
  try {
    const list = getProfilesList();
    let updatedProfile;
    if (profile.id) {
      updatedProfile = profile;
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
      };
      list.push(updatedProfile);
    }
    localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(list));
    setActiveProfileId(updatedProfile.id);
    window.dispatchEvent(new Event('storage'));
    return updatedProfile;
  } catch (e) {
    console.error('Failed to save profile', e);
    throw e;
  }
}

export function deleteProfile(id) {
  try {
    let list = getProfilesList();
    list = list.filter(p => p.id !== id);
    localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(list));

    // Clear history associated with this profile
    localStorage.removeItem(HISTORY_PREFIX + id);

    const activeId = getActiveProfileId();
    if (activeId === id) {
      if (list.length > 0) {
        setActiveProfileId(list[0].id);
      } else {
        localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
        window.dispatchEvent(new Event('storage'));
      }
    } else {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.error('Failed to delete profile', e);
  }
}

export function getHistory(profileId) {
  try {
    let pid = profileId;
    if (!pid) {
      const active = getProfile();
      if (!active) return [];
      pid = active.id;
    }
    const raw = localStorage.getItem(HISTORY_PREFIX + pid);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load history', e);
    return [];
  }
}

export function saveHistoryItem(item, profileId) {
  try {
    let pid = profileId;
    if (!pid) {
      const active = getProfile();
      if (!active) throw new Error("No active profile to save history");
      pid = active.id;
    }
    const history = getHistory(pid);
    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      ...item,
    };
    history.unshift(newItem);
    localStorage.setItem(HISTORY_PREFIX + pid, JSON.stringify(history));
    window.dispatchEvent(new Event('storage'));
    return newItem;
  } catch (e) {
    console.error('Failed to save history item', e);
    throw e;
  }
}

export function clearHistory(profileId) {
  try {
    let pid = profileId;
    if (!pid) {
      const active = getProfile();
      if (!active) return;
      pid = active.id;
    }
    localStorage.removeItem(HISTORY_PREFIX + pid);
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Failed to clear history', e);
  }
}

export function clearProfile() {
  try {
    const list = getProfilesList();
    for (const p of list) {
      localStorage.removeItem(HISTORY_PREFIX + p.id);
    }
    localStorage.removeItem(PROFILES_LIST_KEY);
    localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Failed to clear profile data', e);
  }
}
