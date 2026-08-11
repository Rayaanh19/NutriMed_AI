import { useState, useEffect, useRef } from 'react';
import { getProfile } from '../utils/storage.js';

export default function LiveScanner({ onSaveHistory }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [active, setActive] = useState(false);
  const [hint, setHint] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setActive(true);
    setResult(null);
    setError('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Camera startup error", err);
      setError("Failed to access camera stream. Make sure camera permissions are granted.");
      setActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error("Failed to stop track", e);
      }
      streamRef.current = null;
    }
    setActive(false);
  };

  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setLoading(true);
    setError('');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Capture high-res frame from video stream
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      // Send to backend
      const profileData = getProfile();
      const response = await fetch('/api/scan-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Image, 
          hint: hint || "fresh dish, fruit, or vegetable",
          allergies: profileData?.allergies || '',
          diseases: profileData?.diseases || []
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI analysis failed');
      }

      setResult(data);
      stopCamera();

      // Save to local logs
      if (onSaveHistory) {
        onSaveHistory({
          name: data.name,
          type: 'scan',
          calories: data.calories,
          details: data,
        });
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err.message || 'Error occurred while running Gemini image detection.');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setResult(null);
    setError('');
    setHint('');
    startCamera();
  };

  // Macro wheels percentage calculations
  const calculatePercentages = (macros) => {
    const { protein = 0, carbs = 0, fat = 0 } = macros || {};
    const total = (protein * 4) + (carbs * 4) + (fat * 9) || 1;
    return {
      pPercent: Math.round(((protein * 4) / total) * 100),
      cPercent: Math.round(((carbs * 4) / total) * 100),
      fPercent: Math.round(((fat * 9) / total) * 100),
    };
  };

  const percentages = result ? calculatePercentages(result.macros) : { pPercent: 30, cPercent: 40, fPercent: 30 };

  return (
    <div className="scanner-container fade-in">
      <div className="glass-card">
        <h2 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }} className="text-gradient-emerald">Live AI Scanner</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Point your camera at any dish, fruit, or vegetable. Click capture to automatically run real-time AI recognition and fetch detailed nutritional stats.
        </p>

        {/* Hints */}
        {!result && !loading && (
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Scan Hint / Context (Optional - e.g. "Green apple", "Chicken salad")</label>
            <input 
              type="text" 
              value={hint} 
              onChange={e => setHint(e.target.value)} 
              placeholder="Helps the model identify the food item more accurately" 
            />
          </div>
        )}

        {/* Start camera trigger */}
        {!active && !result && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '1.5rem' }}>
              <svg style={{width:'36px', height:'36px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <h3>Automatic Food Recognizer</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Point at foods, vegetables, ingredients, or cooked meals to extract their properties instantly.
            </p>
            <button className="btn btn-glow-primary" onClick={startCamera}>Open Live Camera Feed</button>
          </div>
        )}

        {/* Camera stream view */}
        {active && !loading && (
          <div style={{ textAlign: 'center' }}>
            <div className="camera-preview-container" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="scan-sweep-line"></div>
              <video ref={videoRef} autoPlay playsInline className="camera-preview"></video>
              <div className="camera-overlay" style={{ borderColor: 'var(--primary)', borderWidth: '2px' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px', height: '220px', border: '2px dashed rgba(16, 185, 129, 0.6)', borderRadius: '24px' }}></div>
              </div>
            </div>
            <div className="scan-buttons">
              <button className="btn btn-glow-primary" onClick={captureAndIdentify}>Identify Food Item</button>
              <button className="btn btn-glass" onClick={stopCamera}>Close Camera</button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', position: 'relative', border: '1px dashed var(--primary)', borderRadius: '16px', backgroundColor: 'rgba(14, 165, 233, 0.02)', overflow: 'hidden' }}>
            <div className="scan-sweep-line"></div>
            <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '4px', borderTopColor: 'var(--primary)', marginBottom: '1.5rem' }}></div>
            <h3 style={{ fontFamily: 'Outfit', letterSpacing: '0.02em' }}>CLINICAL DIAGNOSTICS IN PROGRESS...</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Deconstructing ingredients, estimating calorie volumes, and assessing diagnostic hazards...
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="alert-error">
            <strong>Analysis Failed:</strong> {error}
            <div style={{ marginTop: '1rem' }}>
              <button className="btn btn-glass" onClick={resetScanner} style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}>Retry</button>
            </div>
          </div>
        )}

        {/* Result rendering */}
        {result && (
          <div className="food-details-grid fade-in">
            {/* Column 1: Nutrition Dial */}
            <div className="glass-card nutrition-wheel-card">
              <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.05em', marginBottom: '1rem', textTransform: 'uppercase' }}>Detected Macros</h4>
              
              <div className="nutrition-wheel">
                <svg className="nutrition-wheel-svg" viewBox="0 0 36 36">
                  <path
                    className="wheel-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3.5"
                    strokeDasharray={`${percentages.pPercent}, 100`}
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--secondary)"
                    strokeWidth="3.5"
                    strokeDashoffset={`-${percentages.pPercent}`}
                    strokeDasharray={`${percentages.cPercent}, 100`}
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3.5"
                    strokeDashoffset={`-${percentages.pPercent + percentages.cPercent}`}
                    strokeDasharray={`${percentages.fPercent}, 100`}
                  />
                </svg>
                <div className="nutrition-wheel-value">
                  <span className="wheel-number">{result.calories}</span>
                  <span className="wheel-label">kcal</span>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
                <div className="progress-container">
                  <div className="progress-header" style={{ color: 'var(--primary)' }}>
                    <span>Protein</span>
                    <span>{result.macros.protein}g ({percentages.pPercent}%)</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill fill-primary" style={{ width: `${percentages.pPercent}%` }}></div></div>
                </div>

                <div className="progress-container">
                  <div className="progress-header" style={{ color: 'var(--secondary)' }}>
                    <span>Carbohydrates</span>
                    <span>{result.macros.carbs}g ({percentages.cPercent}%)</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill fill-secondary" style={{ width: `${percentages.cPercent}%` }}></div></div>
                </div>

                <div className="progress-container">
                  <div className="progress-header" style={{ color: 'var(--accent)' }}>
                    <span>Fat</span>
                    <span>{result.macros.fat}g ({percentages.fPercent}%)</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill fill-accent" style={{ width: `${percentages.fPercent}%` }}></div></div>
                </div>
              </div>
            </div>

            {/* Column 2: Details */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.6rem', fontFamily: 'Outfit, sans-serif' }} className="text-gradient-emerald">{result.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence score: {Math.round(result.confidence * 100)}%</div>
                </div>
                <button className="btn btn-glass" onClick={resetScanner} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Scan New Item</button>
              </div>

              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                {result.description}
              </p>

              {result.suitability && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: result.suitability.allowed ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                  border: `1px solid ${result.suitability.allowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                  fontSize: '0.9rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', color: result.suitability.allowed ? 'var(--primary)' : '#ef4444', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{result.suitability.allowed ? '✅' : '❌'}</span>
                    <span>{result.suitability.allowed ? 'HEALTH SUITABILITY: RECOMMENDED' : 'HEALTH SUITABILITY: AVOID / NOT RECOMMENDED'}</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-muted)' }}>
                    {result.suitability.reasons?.map((reason, idx) => (
                      <li key={idx} style={{ marginBottom: '0.2rem' }}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem' }}>Nutritional Content / Ingredients</h4>
              <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {result.ingredients.map((ing, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem' }}>{ing}</li>
                ))}
              </ul>

              <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem' }}>Recommended Serving / Prep</h4>
              <ol style={{ paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                {result.recipe.map((step, index) => (
                  <li key={index} style={{ marginBottom: '0.4rem' }}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
