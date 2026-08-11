import { useState, useEffect } from 'react';
import { getProfile, getHistory, clearHistory as clearHistoryStorage } from '../utils/storage.js';

export default function DashboardHome({ onNavigate, setSelectedItem }) {
  const [profile, setProfile] = useState({
    name: 'User',
    age: 30,
    sex: 'male',
    height: 175,
    weight: 70,
    activity: 'moderate',
    diseases: [],
    allergies: '',
    eggsPerWeek: 0,
    nonVegPerWeek: 0,
    dailyMealPlan: ''
  });

  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Load profile from storage
    const activeProfile = getProfile();
    if (activeProfile) {
      setProfile(prev => ({ ...prev, ...activeProfile }));
    }

    // Load history
    setHistory(getHistory());
  }, []);

  // Target Calculations
  const calculateTargets = () => {
    const { age, sex, height, weight, activity } = profile;
    let bmr = 0;
    if (sex === 'male') {
      bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    }

    const activityFactors = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const calories = Math.round(bmr * (activityFactors[activity] || 1.55));
    
    // Standard splits: 30% Protein, 40% Carbs, 30% Fat
    const protein = Math.round((calories * 0.30) / 4);
    const carbs = Math.round((calories * 0.40) / 4);
    const fat = Math.round((calories * 0.30) / 9);

    return { calories, protein, carbs, fat };
  };

  const targets = calculateTargets();

  // BMI and focus recommendations calculation
  const heightM = profile.height / 100;
  const bmi = heightM > 0 ? parseFloat((profile.weight / (heightM * heightM)).toFixed(1)) : 0;
  
  let bmiStatus = 'Normal';
  let bmiClass = 'text-gradient-emerald';
  let bmiColor = 'var(--secondary)';
  let bmiFocus = '';
  if (bmi < 18.5) {
    bmiStatus = 'Underweight';
    bmiClass = 'text-gradient-cyan';
    bmiColor = 'var(--primary)';
    bmiFocus = 'Weight Gain & Nutritional Enrichment: Focus on achieving a healthy caloric surplus. Increase your meal frequency, incorporate calorie-dense whole foods (nuts, nut butters, avocados, dry fruits), maintain adequate protein intake, and practice strength exercises to support lean muscle gain.';
  } else if (bmi >= 18.5 && bmi < 25) {
    bmiStatus = 'Normal weight';
    bmiClass = 'text-gradient-emerald';
    bmiColor = 'var(--secondary)';
    bmiFocus = 'Weight Maintenance & Muscle Toning: Focus on overall nutritional balance, consistency in protein distribution, colorful micronutrients, and maintaining active fitness levels for metabolic and cardiovascular longevity.';
  } else if (bmi >= 25 && bmi < 30) {
    bmiStatus = 'Overweight';
    bmiClass = 'text-gradient-amber';
    bmiColor = '#fbbf24';
    bmiFocus = 'Caloric Deficit & Active Fat Loss: Focus on a moderate, sustainable caloric deficit. Emphasize dietary fiber for satiety, lean protein sources to preserve lean mass, reduce refined sugars/cardio, and increase daily movement.';
  } else {
    bmiStatus = 'Obese';
    bmiClass = 'text-gradient-accent';
    bmiColor = 'var(--accent)';
    bmiFocus = 'Structured Calorie Restriction & Metabolic Care: Focus on a safe caloric deficit, portion control, and low glycemic index foods to stabilize insulin sensitivity. High dietary fiber and low-impact workouts (swimming, walking) are highly recommended.';
  }

  // Pointer position on the BMI track (Scale: BMI 15 to 40)
  const minBmi = 15;
  const maxBmi = 40;
  const bmiPercent = Math.min(Math.max(((bmi - minBmi) / (maxBmi - minBmi)) * 100, 0), 100);

  // Clear log history
  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your meal logs and scan history?")) {
      clearHistoryStorage();
      setHistory([]);
    }
  };

  return (
    <div className="dashboard-grid fade-in">
      {/* Target Metrics Cards */}
      <div className="glass-card col-4 lift">
        <div className="stat-header">
          <span>DAILY CALORIE BUDGET</span>
          <div className="stat-icon text-gradient-cyan" style={{ background: 'rgba(14, 165, 233, 0.08)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          </div>
        </div>
        <div className="stat-value text-gradient-cyan pulse-heartbeat" style={{ color: '#0ea5e9' }}>{targets.calories} kcal</div>
        <div className="stat-sub">Target for biological maintenance & activity</div>
      </div>

      <div className="glass-card col-4 lift">
        <div className="stat-header">
          <span>DAILY PROTEIN TARGET</span>
          <div className="stat-icon text-gradient-emerald" style={{ background: 'rgba(13, 148, 136, 0.08)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}><path d="M4.5 16.5c-1.5 1.26-2.5 3.19-2.5 5.5h20c0-2.31-1-4.24-2.5-5.5M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" /></svg>
          </div>
        </div>
        <div className="stat-value text-gradient-emerald" style={{ color: '#0d9488' }}>{targets.protein} g</div>
        <div className="stat-sub">Builds muscle and aids cell recovery</div>
      </div>

      <div className="glass-card col-4 lift">
        <div className="stat-header">
          <span>CARBS & FATS TARGET</span>
          <div className="stat-icon" style={{ background: 'rgba(255, 78, 80, 0.08)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ff4e50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0 5.4 5.4 0 0 0 0 7.65l.77.78L12 20.78l7.65-7.65.77-.78a5.4 5.4 0 0 0 0-7.65z" /></svg>
          </div>
        </div>
        <div className="stat-value" style={{ color: '#ff4e50', background: 'none' }}>{targets.carbs}g / {targets.fat}g</div>
        <div className="stat-sub">Fuels workouts & maintains hormone balance</div>
      </div>

      {/* BMI and Recommendations Widget */}
      <div className="glass-card col-12" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '0.04em' }}>CLINICAL METABOLIC DIAGNOSTICS</h3>
          <span className="model-badge" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: bmiColor, color: bmiColor, fontSize: '0.8rem', fontWeight: 700 }}>
            {bmiStatus.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem', alignItems: 'center' }}>
          {/* Big BMI Circle display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-glass)', minWidth: '130px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>YOUR BMI</span>
            <span className={bmiClass} style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'Outfit' }}>{bmi}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{profile.weight}kg / {profile.height}cm</span>
          </div>

          {/* Recommendation Focus Details */}
          <div style={{ textAlign: 'left' }}>
            <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '0.5rem', fontWeight: 700 }}>Recommended Focus Area</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>
              {bmiFocus}
            </p>
          </div>
        </div>

        {/* Horizontal BMI scale track with pointer */}
        <div style={{ marginTop: '0.5rem', padding: '0 0.5rem' }}>
          <div style={{ position: 'relative', width: '100%', height: '14px', borderRadius: '7px', background: 'linear-gradient(to right, var(--primary) 0%, var(--primary) 14%, var(--secondary) 14%, var(--secondary) 40%, #fbbf24 40%, #fbbf24 60%, var(--accent) 60%, var(--accent) 100%)', marginBottom: '0.5rem' }}>
            {/* Pointer */}
            <div 
              style={{ 
                position: 'absolute', 
                top: '-8px', 
                left: `${bmiPercent}%`, 
                transform: 'translateX(-50%)', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                transition: 'left 0.5s ease-out'
              }}
            >
              <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 800, textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>▼</span>
            </div>
          </div>

          {/* Scale labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0 0.2rem' }}>
            <span>15.0 (Underweight)</span>
            <span style={{ textAlign: 'center' }}>18.5 (Normal)</span>
            <span style={{ textAlign: 'center' }}>25.0 (Overweight)</span>
            <span>30.0 (Obese)</span>
            <span>40.0</span>
          </div>
        </div>
      </div>

      {/* Profile summary */}
      <div className="glass-card col-8">
        <h3 style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Biological Nutrition Profile</span>
          <button className="btn btn-glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => onNavigate('settings')}>
            Update Profile
          </button>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>NAME</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile.name}>{profile.name || 'User'}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>SEX</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize' }}>{profile.sex}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>AGE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{profile.age} yrs</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>HEIGHT</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{profile.height} cm</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>WEIGHT</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{profile.weight} kg</div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', textAlign: 'left' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>ACTIVITY LEVEL</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'capitalize' }}>
              {profile.activity || 'Moderate'}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', textAlign: 'left' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>DIETARY HABIT</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {profile.meatHabit === 'vegetarian' 
                ? 'Vegetarian' 
                : `Non-Veg (Halal: ${(profile.allowedMeats && profile.allowedMeats.length > 0 ? profile.allowedMeats.join(', ') : 'None')})`
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', textAlign: 'left' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>DISEASES & CONDITIONS</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {profile.diseases && profile.diseases.length > 0 ? profile.diseases.join(', ') : 'None'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>Macronutrient Allocation (30/40/30)</h4>
          <div className="progress-container">
            <div className="progress-header">
              <span>Protein</span>
              <span>{targets.protein}g / 30%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill fill-primary" style={{ width: '30%' }}></div>
            </div>
          </div>
          <div className="progress-container" style={{ marginTop: '0.85rem' }}>
            <div className="progress-header">
              <span>Carbohydrates</span>
              <span>{targets.carbs}g / 40%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill fill-secondary" style={{ width: '40%' }}></div>
            </div>
          </div>
          <div className="progress-container" style={{ marginTop: '0.85rem' }}>
            <div className="progress-header">
              <span>Fats</span>
              <span>{targets.fat}g / 30%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill fill-accent" style={{ width: '30%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch Panel */}
      <div className="glass-card col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ marginBottom: '0.75rem' }}>Quick Actions</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Accelerate your fitness goals. Instantly build personalized menu templates, evaluate dish ingredients using AI, or scan barcodes.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className="btn btn-glow-primary" onClick={() => onNavigate('generate')} style={{ width: '100%' }}>
            <svg style={{width:'18px', height:'18px'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Generate Meal Plan
          </button>
          <button className="btn btn-glass" onClick={() => onNavigate('scan')} style={{ width: '100%' }}>
            <svg style={{width:'18px', height:'18px'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Scan Food Image
          </button>
          <button className="btn btn-glass" onClick={() => onNavigate('live-scan')} style={{ width: '100%' }}>
            <svg style={{width:'18px', height:'18px'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Live AI Scanner
          </button>
        </div>
      </div>

      {/* History / Meal Log */}
      <div className="glass-card col-12">
        <h3 style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Meal Logs & AI Scan History</span>
          {history.length > 0 && (
            <button className="btn btn-glass" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }} onClick={clearHistory}>
              Clear History
            </button>
          )}
        </h3>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}>
            <svg style={{ width: '48px', height: '48px', margin: '0 auto 1rem', stroke: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p style={{ fontWeight: 600 }}>No history logs yet</p>
            <p style={{ fontSize: '0.85rem' }}>Create a meal plan or scan a food photo to populate your feed.</p>
          </div>
        ) : (
          <div className="list-container">
            {history.map((item) => (
              <div key={item.id} className="history-item" onClick={() => setSelectedItem(item)}>
                <div className="history-info">
                  <div className="history-title">{item.name}</div>
                  <div className="history-meta">
                    <span>{item.type === 'scan' ? '📷 AI Scan' : item.type === 'qr' ? '🔍 QR Match' : '📋 Meal Plan'}</span>
                    <span>•</span>
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {item.calories && <span className="history-calories">{item.calories} kcal</span>}
                  <svg style={{ width: '16px', height: '16px', stroke: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
