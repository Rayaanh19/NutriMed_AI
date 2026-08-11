import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import DashboardHome from './components/DashboardHome.jsx'
import FoodScanner from './components/FoodScanner.jsx'
import LiveScanner from './components/LiveScanner.jsx'
import Home from './pages/Home.jsx'
import Results from './pages/Results.jsx'
import Settings from './pages/Settings.jsx'
import { 
  getProfilesList, 
  getActiveProfileId, 
  setActiveProfileId, 
  getProfile, 
  saveProfile, 
  deleteProfile, 
  clearProfile 
} from './utils/storage.js'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, generate, scan, live-scan, settings
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null) // for viewing history detail modal
  const [historyVersion, setHistoryVersion] = useState(0) // increment to trigger reload
  const [detailQrUrl, setDetailQrUrl] = useState('')
  const [showDetailQrModal, setShowDetailQrModal] = useState(false)
  const [serverIp, setServerIp] = useState('')
  const [isOnboarded, setIsOnboarded] = useState(null)
  const [activeWebSlide, setActiveWebSlide] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('male')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activity, setActivity] = useState('moderate')
  const [diseaseSelect, setDiseaseSelect] = useState('none')
  const [otherDiseases, setOtherDiseases] = useState('')
  const [allergies, setAllergies] = useState('')
  
  // BMI Pop-up Form Modal State
  const [showBmiModal, setShowBmiModal] = useState(false)
  const [bmiHeight, setBmiHeight] = useState('')
  const [bmiWeight, setBmiWeight] = useState('')
  const [bmiActivity, setBmiActivity] = useState('moderate')
  const [bmiIsVegetarian, setBmiIsVegetarian] = useState(true)
  const [bmiAllowedMeats, setBmiAllowedMeats] = useState(['Chicken', 'Mutton', 'Beef'])
  const [bmiDiseaseSelect, setBmiDiseaseSelect] = useState('none')
  const [bmiOtherDiseases, setBmiOtherDiseases] = useState('')

  useEffect(() => {
    if (showBmiModal) {
      const savedProfile = localStorage.getItem('nutri_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setBmiHeight(parsed.height || '');
          setBmiWeight(parsed.weight || '');
          setBmiActivity(parsed.activity || 'moderate');
          setBmiIsVegetarian(parsed.meatHabit === 'vegetarian');
          if (parsed.allowedMeats && parsed.allowedMeats.length > 0) {
            setBmiAllowedMeats(parsed.allowedMeats);
          } else {
            setBmiAllowedMeats(['Chicken', 'Mutton', 'Beef']);
          }
          
          const list = parsed.diseases || [];
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
        } catch (_) {}
      }
    }
  }, [showBmiModal]);

  const syncProfileState = () => {
    const activeProfile = getProfile();
    if (activeProfile) {
      setIsOnboarded(true);
      setName(activeProfile.name || '');
      setAge(activeProfile.age || '');
      setSex(activeProfile.sex || 'male');
      setHeight(activeProfile.height || '');
      setWeight(activeProfile.weight || '');
      setActivity(activeProfile.activity || 'moderate');
    } else {
      setIsOnboarded(false);
    }
  };

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.localIp) {
          setServerIp(data.localIp)
        }
      })
      .catch(err => console.error("Failed to load server IP:", err))

    syncProfileState();

    const handleStorageChange = () => {
      syncProfileState();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSaveProfileWeb = (profileData) => {
    const active = getProfile();
    const toSave = {
      ...profileData,
      id: active ? active.id : undefined
    };
    saveProfile(toSave);
    setIsOnboarded(true);
    window.location.reload();
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your active account? This will permanently delete your profile history and meal logs.")) {
      const active = getProfile();
      if (active) {
        deleteProfile(active.id);
      }
      const list = getProfilesList();
      if (list.length === 0) {
        setIsOnboarded(false);
      }
      window.location.reload();
    }
  };

  const handleSkipOnboardingWeb = () => {
    const defaultProfile = {
      name: 'Guest',
      age: 30,
      sex: 'male',
      height: 175,
      weight: 70,
      activity: 'moderate',
      diseases: [],
      allergies: '',
      eggsPerWeek: 0,
      nonVegPerWeek: 0,
      dailyMealPlan: 'Regular home-cooked food. Breakfast: tea and toast. Lunch: rice and lentils. Dinner: flatbread and vegetables.'
    };
    saveProfile(defaultProfile);
    setIsOnboarded(true);
    window.location.reload();
  };

  const handleBmiSubmit = (bmiData) => {
    const active = getProfile();
    const base = active || {};

    const updatedProfile = {
      id: base.id, // preserve ID if editing existing profile
      name: name || base.name || 'User',
      age: Number(age) || base.age || 30,
      sex: sex || base.sex || 'male',
      height: Number(bmiData.height),
      weight: Number(bmiData.weight),
      activity: bmiData.activity || base.activity || 'moderate',
      meatHabit: bmiData.meatHabit || base.meatHabit || 'vegetarian',
      allowedMeats: bmiData.allowedMeats || base.allowedMeats || [],
      diseases: bmiData.diseases || base.diseases || [],
    };

    saveProfile(updatedProfile);
    setIsOnboarded(true);
    setShowBmiModal(false);
    window.location.reload();
  };

  const renderBmiModal = () => {
    if (!showBmiModal) return null;
    return (
      <div className="qr-modal" style={{ zIndex: 1100 }}>
        <div className="qr-modal-content" style={{ maxWidth: '540px', textAlign: 'left', display: 'block', maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', marginBottom: '0.25rem' }} className="text-gradient-cyan">
            BMI & Health Habits Form
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            Provide your height, weight, activity level, dietary habits, and medical conditions to calculate your BMI and customize recommendations.
          </p>

          <form onSubmit={(e) => {
            e.preventDefault();
            
            let selectedDiseases = [];
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
              height: Number(bmiHeight),
              weight: Number(bmiWeight),
              activity: bmiActivity,
              meatHabit: bmiIsVegetarian ? 'vegetarian' : 'halal_non_veg',
              allowedMeats: bmiIsVegetarian ? [] : bmiAllowedMeats,
              diseases: selectedDiseases
            });
          }} className="form-grid">
            
            <div className="form-group">
              <label>Height</label>
              <select 
                value={bmiHeight} 
                onChange={e => setBmiHeight(e.target.value)} 
                required
              >
                <option value="">Select Height</option>
                {Array.from({ length: 121 }, (_, i) => {
                  const cm = i + 100;
                  const totalInches = Math.round(cm / 2.54);
                  const feet = Math.floor(totalInches / 12);
                  const inches = totalInches % 12;
                  return (
                    <option key={cm} value={cm}>{cm} cm ({feet}'{inches}")</option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label>Weight</label>
              <select 
                value={bmiWeight} 
                onChange={e => setBmiWeight(e.target.value)} 
                required
              >
                <option value="">Select Weight</option>
                {Array.from({ length: 151 }, (_, i) => {
                  const kg = i + 30;
                  return (
                    <option key={kg} value={kg}>{kg} kg</option>
                  );
                })}
              </select>
            </div>

            <div className="form-group form-full">
              <label>Activity Level</label>
              <select value={bmiActivity} onChange={e => setBmiActivity(e.target.value)}>
                <option value="sedentary">Sedentary (Little or no exercise)</option>
                <option value="light">Lightly Active (Light exercise 1-3 days/week)</option>
                <option value="moderate">Moderately Active (Moderate exercise 3-5 days/week)</option>
                <option value="active">Very Active (Hard exercise 6-7 days/week)</option>
                <option value="very_active">Super Active (Physical work/exercise twice a day)</option>
              </select>
            </div>

            <div className="form-group form-full">
              <label>Dietary Habits (Meat Preferences)</label>
              <select value={bmiIsVegetarian ? 'vegetarian' : 'halal'} onChange={e => setBmiIsVegetarian(e.target.value === 'vegetarian')}>
                <option value="vegetarian">Vegetarian (No meat)</option>
                <option value="halal">Non-Veg (Halal Diet)</option>
              </select>
            </div>

            {!bmiIsVegetarian && (
              <div className="form-group form-full" style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(14, 165, 233, 0.15)', background: 'rgba(14,165,233,0.02)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', display: 'block', marginBottom: '0.5rem' }}>
                  Halal Meat Choices (Pork is strictly prohibited / Haram)
                </span>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                  {['Chicken', 'Mutton', 'Beef', 'Fish/Seafood'].map((meat) => {
                    const isChecked = bmiAllowedMeats.includes(meat);
                    return (
                      <label key={meat} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem', color: '#ffffff' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBmiAllowedMeats([...bmiAllowedMeats, meat]);
                            } else {
                              setBmiAllowedMeats(bmiAllowedMeats.filter(m => m !== meat));
                            }
                          }}
                        />
                        {meat}
                      </label>
                    );
                  })}
                </div>
                
                <span style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  ⚠️ Note: Pork/pig meat is strictly excluded from all recommendations (pure Halal).
                </span>
              </div>
            )}

            <div className="form-group form-full">
              <label style={{ marginBottom: '0.5rem', display: 'block' }}>Diseases & Medical Conditions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                {[
                  { key: 'none', label: 'None / No conditions' },
                  { key: 'diabetes', label: 'Diabetes' },
                  { key: 'bp', label: 'High Blood Pressure' },
                  { key: 'both', label: 'Both (Diabetes & High BP)' },
                  { key: 'other', label: 'Other / Custom Condition' }
                ].map((item) => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    <input 
                      type="radio" 
                      name="bmiDisease" 
                      value={item.key} 
                      checked={bmiDiseaseSelect === item.key} 
                      onChange={() => setBmiDiseaseSelect(item.key)} 
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            {bmiDiseaseSelect === 'other' && (
              <div className="form-group form-full">
                <label>Please specify other conditions (comma separated)</label>
                <input 
                  type="text" 
                  value={bmiOtherDiseases} 
                  onChange={e => setBmiOtherDiseases(e.target.value)} 
                  placeholder="e.g. thyroid, cholesterol" 
                  required 
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', width: '100%' }} className="form-full">
              <button type="submit" className="btn btn-glow-primary" style={{ flex: 1, padding: '0.85rem' }}>
                Save & Calculate BMI
              </button>
              {isOnboarded && (
                <button 
                  type="button" 
                  className="btn btn-glass" 
                  onClick={() => setShowBmiModal(false)}
                  style={{ flex: 1, padding: '0.85rem' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  };

  const navigate = useNavigate()
  const location = useLocation()

  // Synced state change if they navigate to results route
  useEffect(() => {
    if (location.pathname === '/results') {
      setActiveTab('results')
    } else if (activeTab === 'results') {
      setActiveTab('dashboard')
    }
  }, [location.pathname])

  // Save history log handler
  const handleSaveHistory = (historyItem) => {
    const saved = localStorage.getItem('nutri_history');
    let list = [];
    if (saved) {
      try { list = JSON.parse(saved); } catch (_) {}
    }
    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.floor(Math.random()*1000),
      timestamp: Date.now(),
      ...historyItem
    };
    list.unshift(newItem); // put in front
    localStorage.setItem('nutri_history', JSON.stringify(list));
    setHistoryVersion(v => v + 1); // trigger reload
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName)
    setMobileMenuOpen(false)
    if (location.pathname !== '/') {
      navigate('/')
    }
  }

  // Calculate percentages for history detail modal macro chart
  const calculatePercentages = (macros) => {
    const { protein = 0, carbs = 0, fat = 0 } = macros || {};
    const total = (protein * 4) + (carbs * 4) + (fat * 9) || 1;
    return {
      pPercent: Math.round(((protein * 4) / total) * 100),
      cPercent: Math.round(((carbs * 4) / total) * 100),
      fPercent: Math.round(((fat * 9) / total) * 100),
    };
  };

  const percentages = selectedItem && selectedItem.details && selectedItem.details.macros 
    ? calculatePercentages(selectedItem.details.macros) 
    : { pPercent: 30, cPercent: 40, fPercent: 30 };

  const triggerDetailQRShare = (dishName) => {
    const host = serverIp || window.location.hostname
    const port = '5000'
    const shareUrl = `${window.location.protocol}//${host}:${port}/api/dishes/${encodeURIComponent(dishName)}`
    const encoded = encodeURIComponent(shareUrl)
    setDetailQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`)
    setShowDetailQrModal(true)
  }

  if (isOnboarded === null) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-dark)', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '50px', height: '50px', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite', border: '4px solid rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  if (isOnboarded === false) {
    return (
      <div style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        backgroundColor: 'var(--bg-dark)', 
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(13, 148, 136, 0.08) 0px, transparent 50%)',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '2rem',
        position: 'relative'
      }}>
        
        {/* Skip button in header */}
        <div style={{ position: 'absolute', top: '2rem', right: '2rem' }}>
          <button className="btn btn-glass" onClick={handleSkipOnboardingWeb} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            Skip Onboarding
            <svg style={{ width: '14px', height: '14px', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5' }} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="glass-card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
          
          {/* Slide 1: Welcome */}
          {activeWebSlide === 0 && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div className="stat-icon text-gradient-cyan" style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <svg style={{ width: '48px', height: '48px', stroke: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif' }} className="text-gradient-cyan">Welcome to NutriMed AI</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Your intelligent, local AI-driven health and meal planning companion. Get custom diets computed on your device.
              </p>
              <button className="btn btn-glow-primary" onClick={() => setActiveWebSlide(1)} style={{ width: '100%', padding: '0.85rem' }}>
                Continue
              </button>
            </div>
          )}

          {/* Slide 2: AI Planner */}
          {activeWebSlide === 1 && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div className="stat-icon text-gradient-emerald" style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(13, 148, 136, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <svg style={{ width: '48px', height: '48px', stroke: 'var(--secondary)' }} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif' }} className="text-gradient-emerald">AI Meal Planner</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Generate custom recipe timetables, daily grocery list requirements, and ingredients customized to your fitness goal.
              </p>
              <button className="btn btn-glow-primary" onClick={() => setActiveWebSlide(2)} style={{ width: '100%', padding: '0.85rem', background: 'var(--secondary)', color: '#0b0f19' }}>
                Next
              </button>
            </div>
          )}

          {/* Slide 3: Scanner */}
          {activeWebSlide === 2 && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div className="stat-icon" style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255, 78, 80, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <svg style={{ width: '48px', height: '48px', stroke: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--accent)' }}>Plate Scanner</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Snap a picture of your dish using the camera to instantly calculate macros distribution and extract the recipe steps.
              </p>
              <button className="btn btn-glow-primary" onClick={() => setActiveWebSlide(3)} style={{ width: '100%', padding: '0.85rem', background: 'var(--accent)', color: '#ffffff' }}>
                Setup Profile
              </button>
            </div>
          )}

          {/* Slide 4: Metric Inputs Form */}
          {activeWebSlide === 3 && (
            <div className="fade-in" style={{ textAlign: 'left' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }} className="text-gradient-cyan">Set Up Profile</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>Provide your basic details and health profile to customize recommendations.</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                setShowBmiModal(true);
              }} className="form-grid">
                <div className="form-group form-full">
                  <label>Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" required />
                </div>

                <div className="form-group">
                  <label>Age (years)</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} min="1" max="120" placeholder="e.g. 25" required />
                </div>

                 <div className="form-group">
                  <label>Sex</label>
                  <select value={sex} onChange={e => setSex(e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-glow-primary form-full" style={{ marginTop: '1.5rem', padding: '0.9rem' }}>
                  Calculate BMI & Set Health Profile
                </button>
              </form>
            </div>
          )}

          {/* Indicator dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                onClick={() => setActiveWebSlide(i)}
                style={{ 
                  width: activeWebSlide === i ? '20px' : '8px', 
                  height: '8px', 
                  borderRadius: '4px', 
                  backgroundColor: activeWebSlide === i ? (activeWebSlide === 0 ? 'var(--primary)' : activeWebSlide === 1 ? 'var(--secondary)' : activeWebSlide === 2 ? 'var(--accent)' : 'var(--primary)') : 'rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }} 
              />
            ))}
          </div>
        </div>
        {renderBmiModal()}
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="2.5" stroke="var(--primary)" style={{ width: '28px', height: '28px' }} className="pulse-heartbeat"><path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          <span style={{ letterSpacing: '0.05em' }}>NutriMed AI</span>
        </div>

        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={activeTab === 'dashboard' ? 'pulse-heartbeat' : ''}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h3l3.375-9 3.375 18 3.375-12 1.688 3h3.187" />
            </svg>
            Dashboard
          </div>

          <div className={`nav-item ${activeTab === 'generate' ? 'active' : ''}`} onClick={() => handleTabChange('generate')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M12 11h4m-4 4h4m-6-4h.01M10 15h.01" />
            </svg>
            Meal Planner
          </div>

          <div className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => handleTabChange('scan')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 13a3 3 0 100-6 3 3 0 000 6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v12M7 13h10" />
            </svg>
            AI Food Scanner
          </div>

          <div className={`nav-item ${activeTab === 'live-scan' ? 'active' : ''}`} onClick={() => handleTabChange('live-scan')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="12" cy="12" r="1" />
              <path strokeLinecap="round" d="M12 3v18M3 12h18" />
            </svg>
            Live AI Scanner
          </div>

          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => handleTabChange('settings')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a4 4 0 00-4 4v3.5a4.5 4.5 0 009 0V8a4 4 0 00-4-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 12a4 4 0 00-4-4h-4a4 4 0 00-4 4v2a4 4 0 008 0" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v4m-3 0h6" />
            </svg>
            Settings
          </div>
        </nav>

        <div className="sidebar-footer">
          Qwen2.5:7b Engine
        </div>
      </aside>

      {/* Main Content shell */}
      <div className="main-wrapper">
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="mobile-nav-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div className="header-title">
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'generate' && 'AI Diet & Meal Planner'}
                {activeTab === 'scan' && 'AI Photo Recognition'}
                {activeTab === 'live-scan' && 'Live AI Food Identifier'}
                {activeTab === 'settings' && 'App Settings & Habits'}
                {activeTab === 'results' && 'Personalized Diet Results'}
              </div>
            </div>

            {/* Profile Dropdown Switcher */}
            {isOnboarded && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <svg style={{ width: '16px', height: '16px', stroke: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <select 
                  value={getActiveProfileId() || ''} 
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (selectedId === 'new_profile') {
                      setName('');
                      setAge('');
                      setSex('male');
                      setBmiHeight('');
                      setBmiWeight('');
                      setBmiActivity('moderate');
                      setBmiIsVegetarian(true);
                      setBmiAllowedMeats(['Chicken', 'Mutton', 'Beef']);
                      setBmiDiseaseSelect('none');
                      setBmiOtherDiseases('');
                      setShowBmiModal(true);
                    } else {
                      setActiveProfileId(selectedId);
                      window.location.reload();
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', outline: 'none', paddingRight: '0.5rem' }}
                >
                  {getProfilesList().map(p => (
                    <option key={p.id} value={p.id} style={{ background: '#0b0f19', color: '#ffffff' }}>
                      {p.name}
                    </option>
                  ))}
                  <option value="new_profile" style={{ background: '#0b0f19', color: 'var(--primary)', fontWeight: 'bold' }}>
                    + Create New Profile...
                  </option>
                </select>
              </div>
            )}
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={
              <>
                {activeTab === 'dashboard' && (
                  <DashboardHome 
                    key={historyVersion} 
                    onNavigate={handleTabChange} 
                    setSelectedItem={setSelectedItem} 
                  />
                )}
                {activeTab === 'generate' && (
                  <Home 
                    onSaveHistory={handleSaveHistory} 
                    serverIp={serverIp}
                  />
                )}
                {activeTab === 'scan' && (
                  <FoodScanner 
                    onSaveHistory={handleSaveHistory} 
                  />
                )}
                {activeTab === 'live-scan' && (
                  <LiveScanner 
                    onSaveHistory={handleSaveHistory} 
                  />
                )}
                {activeTab === 'settings' && (
                  <Settings 
                    onOpenBmiModal={() => setShowBmiModal(true)}
                    onDeleteAccount={handleDeleteAccount}
                  />
                )}
              </>
            } />
            <Route path="/results" element={<Results />} />
          </Routes>
        </main>
      </div>

      {/* History Detail Modal Popup */}
      {selectedItem && (
        <div className="qr-modal" onClick={() => setSelectedItem(null)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', width: '90%', textAlign: 'left', display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.4rem' }} className="text-gradient-emerald">{selectedItem.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Logged {new Date(selectedItem.timestamp).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-glow-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => triggerDetailQRShare(selectedItem.name)}>
                  Share QR
                </button>
                <button className="btn btn-glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedItem(null)}>
                  Close
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {selectedItem.type === 'plan' ? (
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {selectedItem.details?.result || selectedItem.details || ""}
                  </pre>
                </div>
              ) : (
                <div className="food-details-grid">
                  <div className="glass-card nutrition-wheel-card" style={{ background: 'rgba(255,255,255,0.02)', border: 'none' }}>
                    <div className="nutrition-wheel">
                      <svg className="nutrition-wheel-svg" viewBox="0 0 36 36">
                        <path className="wheel-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeDasharray={`${percentages.pPercent}, 100`} />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--secondary)" strokeWidth="3.5" strokeDashoffset={`-${percentages.pPercent}`} strokeDasharray={`${percentages.cPercent}, 100`} />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent)" strokeWidth="3.5" strokeDashoffset={`-${percentages.pPercent + percentages.cPercent}`} strokeDasharray={`${percentages.fPercent}, 100`} />
                      </svg>
                      <div className="nutrition-wheel-value">
                        <span className="wheel-number">{selectedItem.details?.calories}</span>
                        <span className="wheel-label">kcal</span>
                      </div>
                    </div>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                      <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--primary)' }}>Protein:</span>
                        <span>{selectedItem.details?.macros?.protein}g</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--secondary)' }}>Carbs:</span>
                        <span>{selectedItem.details?.macros?.carbs}g</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--accent)' }}>Fats:</span>
                        <span>{selectedItem.details?.macros?.fat}g</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      {selectedItem.details?.description}
                    </p>

                    {selectedItem.details?.suitability && (
                      <div style={{
                        marginTop: '1rem',
                        marginBottom: '1rem',
                        padding: '0.85rem',
                        borderRadius: '10px',
                        background: selectedItem.details.suitability.allowed ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                        border: `1px solid ${selectedItem.details.suitability.allowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', color: selectedItem.details.suitability.allowed ? 'var(--primary)' : '#f87171', marginBottom: '0.4rem' }}>
                          <span>{selectedItem.details.suitability.allowed ? '✅' : '❌'}</span>
                          <span>{selectedItem.details.suitability.allowed ? 'Suitable / Recommended' : 'Avoid / Not Recommended'}</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)' }}>
                          {selectedItem.details.suitability.reasons?.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem', borderBottom: '1px solid var(--border-glass)' }}>Ingredients</h4>
                    <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      {selectedItem.details?.ingredients?.map((ing, idx) => <li key={idx}>{ing}</li>)}
                    </ul>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem', borderBottom: '1px solid var(--border-glass)' }}>Instructions</h4>
                    <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                      {selectedItem.details?.recipe?.map((step, idx) => <li key={idx} style={{ marginBottom: '0.25rem' }}>{step}</li>)}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Internal QR details Modal overlay */}
      {showDetailQrModal && (
        <div className="qr-modal" onClick={() => setShowDetailQrModal(false)} style={{ zIndex: 1001 }}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Outfit' }}>Dish QR Share</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Scan this QR code with the NutriMed AI scanner to load this recipe profile instantly.</p>
            <div className="qr-image">
              <img src={detailQrUrl} alt="Dish details QR code" style={{ display: 'block' }} />
            </div>
            <button className="btn btn-glass" onClick={() => setShowDetailQrModal(false)} style={{ width: '100%' }}>Close Overlay</button>
          </div>
        </div>
      )}

      {renderBmiModal()}
    </div>
  )
}
