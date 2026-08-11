import { useState, useEffect } from 'react';
import { 
  getProfile, 
  saveProfile, 
  getProfilesList, 
  getActiveProfileId, 
  setActiveProfileId, 
  deleteProfile 
} from '../utils/storage.js';

export default function Settings({ onOpenBmiModal, onDeleteAccount }) {
  const [profile, setProfile] = useState({
    name: 'User',
    age: 30,
    sex: 'male',
    height: 175,
    weight: 70,
    activity: 'moderate',
    meatHabit: 'vegetarian',
    diseases: []
  });

  const [successMsg, setSuccessMsg] = useState('');

  const loadProfile = () => {
    const activeProfile = getProfile();
    if (activeProfile) {
      setProfile(prev => ({ ...prev, ...activeProfile }));
    }
  };

  useEffect(() => {
    loadProfile();
    const handleStorageChange = () => {
      loadProfile();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    saveProfile(profile);
    setSuccessMsg('Profile updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-card">
        <h2 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }} className="text-gradient-cyan">Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Manage your personal information, name, age, and biological sex.
        </p>

        {successMsg && <div className="alert-success">{successMsg}</div>}

        <form onSubmit={handleSaveProfile} className="form-grid">
          <div className="form-group form-full">
            <label>Full Name</label>
            <input 
              type="text" 
              value={profile.name || ''} 
              onChange={e => setProfile({...profile, name: e.target.value})} 
              placeholder="e.g. John Doe" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Age (years)</label>
            <input 
              type="number" 
              value={profile.age || ''} 
              onChange={e => setProfile({...profile, age: Number(e.target.value)})} 
              min="1" 
              max="120" 
              required 
            />
          </div>

          <div className="form-group">
            <label>Sex</label>
            <select value={profile.sex} onChange={e => setProfile({...profile, sex: e.target.value})}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <button type="submit" className="btn btn-glow-primary form-full" style={{ padding: '0.85rem', marginTop: '1rem' }}>
            Save Profile Details
          </button>
        </form>
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }} className="text-gradient-emerald">BMI & Eating Habits</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Your physical measurements, workout level, and dietary constraints used to calculate BMI and customize plans.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>HEIGHT</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{profile.height || '--'} cm</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>WEIGHT</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{profile.weight || '--'} kg</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>ACTIVITY LEVEL</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize' }}>{profile.activity || '--'}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>DIET TYPE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {profile.meatHabit === 'vegetarian' 
                ? 'Vegetarian' 
                : `Non-Veg (Halal: ${(profile.allowedMeats && profile.allowedMeats.length > 0 ? profile.allowedMeats.join(', ') : 'None')})`
              }
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', gridColumn: 'span 2', textAlign: 'left' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>DISEASES & CONDITIONS</div>
            <div style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>{profile.diseases && profile.diseases.length > 0 ? profile.diseases.join(', ') : 'None'}</div>
          </div>
        </div>

        <button 
          onClick={onOpenBmiModal}
          className="btn btn-glass form-full" 
          style={{ width: '100%', borderColor: 'var(--secondary)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem' }}
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Update BMI & Eating Habits
        </button>
      </div>

      <div className="glass-card" style={{ borderColor: 'rgba(14, 165, 233, 0.2)' }}>
        <h3 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif', color: 'var(--primary)' }}>Profiles & User Accounts</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Switch between different users or create a new profile without losing your current metrics and logs.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {getProfilesList().map((p) => {
            const isActive = p.id === getActiveProfileId();
            return (
              <div 
                key={p.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '12px', 
                  border: `1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`,
                  background: isActive ? 'rgba(14, 165, 233, 0.05)' : 'rgba(255,255,255,0.01)'
                }}
              >
                <div>
                  <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '0.95rem' }}>{p.name}</span>
                  {isActive && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'var(--primary)', color: '#0b0f19', padding: '0.15rem 0.4rem', borderRadius: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}>Active</span>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {p.age} yrs • {p.height} cm • {p.weight} kg • {p.meatHabit === 'vegetarian' ? 'Vegetarian' : 'Halal Non-Veg'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!isActive && (
                    <button 
                      onClick={() => {
                        setActiveProfileId(p.id);
                        window.location.reload();
                      }}
                      className="btn btn-glass"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    >
                      Switch
                    </button>
                  )}
                  {getProfilesList().length > 1 && (
                    <button 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete profile "${p.name}"?`)) {
                          deleteProfile(p.id);
                          window.location.reload();
                        }
                      }}
                      className="btn btn-glass"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={onOpenBmiModal}
          className="btn btn-glass form-full" 
          style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)', padding: '0.85rem' }}
        >
          + Add New User Profile
        </button>
      </div>

      <div className="glass-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
        <h3 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif', color: 'var(--error)' }}>Danger Zone</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Once you delete your account, all your profile details, calculated targets, meal history, and diagnostic scan history will be permanently deleted.
        </p>

        <button 
          onClick={onDeleteAccount}
          className="btn" 
          style={{ width: '100%', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem' }}
        >
          <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Account & Reset Data
        </button>
      </div>
    </div>
  );
}
