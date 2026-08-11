import { useState, useEffect } from 'react'
import { marked } from 'marked'
import { getProfile } from '../utils/storage.js'

const initialState = {
  goals: 'fat loss',
  cuisine_preferences: '',
  plan_duration_value: 1,
  plan_duration_unit: 'days'
}

export default function Home({ onSaveHistory, onGenerateSuccess, serverIp }) {
  const [form, setForm] = useState(initialState)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [generatedPlan, setGeneratedPlan] = useState('')
  const [planId, setPlanId] = useState('')
  const [showQRModal, setShowQRModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'plan_duration_unit') {
        const unit = value;
        const currentVal = parseInt(prev.plan_duration_value || 1, 10);
        let maxVal = 30;
        if (unit === 'weeks') maxVal = 4;
        else if (unit === 'months') maxVal = 12;
        
        if (currentVal > maxVal) {
          updated.plan_duration_value = maxVal;
        }
      }
      return updated;
    });
  };

  const getDurationValueOptions = () => {
    const unit = form.plan_duration_unit || 'days';
    let maxVal = 30;
    if (unit === 'weeks') maxVal = 4;
    else if (unit === 'months') maxVal = 12;
    
    return Array.from({ length: maxVal }, (_, i) => i + 1);
  };

  const toArray = (str) => str
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setProgress(0)
    setError('')
    setGeneratedPlan('')

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return 98;
        const step = prev < 30 ? 2.5 : prev < 60 ? 1.5 : prev < 85 ? 0.8 : 0.3;
        return Math.min(prev + step, 98);
      });
    }, 150);

    try {
      const prof = getProfile() || {};

      const payload = {
        age: Number(prof.age) || 30,
        sex: prof.sex || 'male',
        height_cm: Number(prof.height) || 175,
        weight_kg: Number(prof.weight) || 70,
        activity_level: prof.activity || 'moderate',
        dietary_preferences: prof.meatHabit === 'vegetarian' 
          ? ['Vegetarian'] 
          : [`Halal Non-Veg (${(prof.allowedMeats || []).join(', ')})`],
        allergies: [],
        diseases: prof.diseases || [],
        goals: toArray(form.goals),
        cuisine_preferences: toArray(form.cuisine_preferences),
        plan_duration_value: Number(form.plan_duration_value),
        plan_duration_unit: form.plan_duration_unit,
        eggs_per_week: 0,
        non_veg_per_week: 0,
        daily_meal_plan: '',
      }
      const res = await fetch('/api/generate-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const text = await res.text()
        let data
        try { data = JSON.parse(text) } catch { data = null }
        const message = (data && (data.error || data.message)) || text || 'Request failed'
        throw new Error(typeof message === 'string' ? message : 'Request failed')
      }

      const planIdHeader = res.headers.get('X-Plan-ID')
      if (planIdHeader) {
        setPlanId(planIdHeader)
      }

      // Read chunked response stream
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let resultText = ''
      
      const durationValue = Number(form.plan_duration_value) || 1
      const expectedLength = durationValue * 1200 // rough guess: ~1200 characters per day

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        resultText += chunk
        setGeneratedPlan(resultText)
        
        setProgress((prev) => {
          const calculated = 10 + (resultText.length / expectedLength) * 85
          return Math.min(Math.round(calculated), 98)
        })
      }
      
      setProgress(100)
      await new Promise(r => setTimeout(r, 450)) // let user see 100% complete


      // Save to History Log
      const planName = `${form.plan_duration_value} ${form.plan_duration_unit} Meal Plan (${form.goals || 'Balanced'})`;
      if (onSaveHistory) {
        onSaveHistory({
          name: planName,
          type: 'plan',
          calories: Math.round(1800 + (form.weight_kg * 5)), // rough estimation for log
          details: { result: resultText, name: planName }
        });
      }
    } catch (err) {
      setError(err.message)
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPlan || '')
      alert('Copied to clipboard')
    } catch (_) { /* noop */ }
  }

  const handleDownload = () => {
    const blob = new Blob([generatedPlan || ''], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'meal-plan.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const triggerQRShare = () => {
    if (!planId) {
      alert('No active plan found. Please generate a new meal plan first.')
      return
    }
    const host = serverIp || window.location.hostname
    const port = '5000'
    const shareUrl = `${window.location.protocol}//${host}:${port}/api/plans/${planId}`
    const encoded = encodeURIComponent(shareUrl)
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`)
    setShowQRModal(true)
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {!generatedPlan && !loading && (
        <div className="glass-card">
          <h2 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }} className="text-gradient-emerald">AI Meal Planner Setup</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Fill in your metrics and target parameters. Qwen2.5 will compute custom meal timetables, ingredients list, and precise step-by-step recipes.
          </p>

          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label>Duration Unit</label>
              <select name="plan_duration_unit" value={form.plan_duration_unit} onChange={handleChange}>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>

            <div className="form-group">
              <label>Plan Duration</label>
              <select name="plan_duration_value" value={form.plan_duration_value} onChange={handleChange} required>
                {getDurationValueOptions().map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-full">
              <label>Fitness / Nutritional Goals (comma separated)</label>
              <input type="text" name="goals" value={form.goals} onChange={handleChange} placeholder="e.g. fat loss, muscle building, stamina" />
            </div>

            <div className="form-group form-full">
              <label>Cuisine Preferences (comma separated)</label>
              <input type="text" name="cuisine_preferences" value={form.cuisine_preferences} onChange={handleChange} placeholder="e.g. mediterranean, indian, italian" />
            </div>

            <button type="submit" className="btn btn-glow-primary form-full" style={{ marginTop: '1.5rem', padding: '0.9rem' }}>
              Generate Personalized Meal Plan
            </button>
          </form>
        </div>
      )}

      {/* Loading state (Thinking - before stream starts) */}
      {loading && !generatedPlan && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="spinner-container" style={{ position: 'relative', display: 'inline-block', marginBottom: '2rem' }}>
            <div className="spinner" style={{ width: '80px', height: '80px', borderWidth: '5px', borderTopColor: 'var(--primary)' }}></div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'Outfit', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)' }}>
              {Math.round(progress)}%
            </div>
          </div>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', marginBottom: '0.5rem' }} className="text-gradient-emerald">
            Wait, your meals are generating...
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem', maxWidth: '500px', margin: '0.5rem auto 2.5rem' }}>
            Initializing connection, preparing constraints, and loading nutritionist AI engine...
          </p>
          
          <div style={{ maxWidth: '500px', margin: '0 auto', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Progress Status</span>
              <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
              <div className="fill-primary" style={{ width: `${progress}%`, height: '100%', transition: 'width 0.15s ease-out', borderRadius: '6px' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="alert-error">
          <strong>Plan Generation Failed:</strong> {error}
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-glass" onClick={() => setError('')} style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}>Retry</button>
          </div>
        </div>
      )}

      {/* Inline Results Rendering */}
      {generatedPlan && (
        <div className="glass-card fade-in">
          {/* Progress bar inside the results block during active text streaming */}
          {loading && (
            <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(16, 185, 129, 0.04)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  Wait, your meals are generating...
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                <div className="fill-primary" style={{ width: `${progress}%`, height: '100%', transition: 'width 0.15s ease-out', borderRadius: '5px' }}></div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif' }} className="text-gradient-emerald">Generated Meal Plan</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {loading ? 'Generating in real-time...' : 'Created successfully by Qwen2.5 AI'}
              </p>
            </div>
            {!loading && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-glass" onClick={handleCopy}>Copy Markdown</button>
                <button className="btn btn-glass" onClick={handleDownload}>Download File</button>
                <button className="btn btn-glow-primary" onClick={triggerQRShare}>Share QR</button>
                <button className="btn btn-glass" onClick={() => setGeneratedPlan('')}>New Plan</button>
              </div>
            )}
          </div>

          <div className="markdown-view" style={{ background: 'rgba(255,255,255,0.01)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <div dangerouslySetInnerHTML={{ 
              __html: marked.parse(
                generatedPlan.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, (match, alt, url) => {
                  return `![${alt}](${encodeURI(url.trim())})`;
                })
              ) 
            }} />
          </div>
        </div>
      )}

      {/* QR Code Share Modal */}
      {showQRModal && (
        <div className="qr-modal" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Outfit' }}>Scan Recipe Code</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Scan this QR code from another device to load details of this meal plan layout instantly.</p>
            <div className="qr-image">
              <img src={qrCodeUrl} alt="Meal plan QR code" style={{ display: 'block' }} />
            </div>
            <button className="btn btn-glass" onClick={() => setShowQRModal(false)} style={{ width: '100%' }}>Close Overlay</button>
          </div>
        </div>
      )}
    </div>
  )
}
