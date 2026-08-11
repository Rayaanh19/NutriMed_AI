import { useState, useRef } from 'react';
import { getProfile } from '../utils/storage.js';

export default function FoodScanner({ onSaveHistory }) {
  const [image, setImage] = useState(null);
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Camera capture states
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Start webcam
  const startWebcam = async () => {
    setUseCamera(true);
    setResult(null);
    setError('');
    setImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Failed to access camera. Please check camera permissions or upload an image file instead.");
      setUseCamera(false);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setImage(dataUrl);
      stopWebcam();
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setUseCamera(false);
  };

  // File drop/selection handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setResult(null);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const resetScanner = () => {
    setImage(null);
    setResult(null);
    setError('');
    setHint('');
    stopWebcam();
  };

  // Submit scan to backend
  const handleScanSubmit = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    try {
      const profileData = getProfile();
      const response = await fetch('/api/scan-food', {
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
        throw new Error(data.error || 'Failed to scan image');
      }
      setResult(data);
      
      // Save to local history
      if (onSaveHistory) {
        onSaveHistory({
          name: data.name,
          type: 'scan',
          calories: data.calories,
          details: data,
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error occurred while communicating with LLM.');
    } finally {
      setLoading(false);
    }
  };

  // Calculated macro circle percentages
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
        <h2 style={{ marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>AI Dish Analyzer & Food Scanner</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Upload an image of your plate or turn on the camera to extract instant nutritional diagnostics.
        </p>

        {/* Input parameters (Hint) */}
        {!result && !loading && (
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Food Hint / Guessed Title (Optional - helps precision)</label>
            <input 
              type="text" 
              value={hint} 
              onChange={e => setHint(e.target.value)} 
              placeholder="e.g. Grilled salmon salad, chicken fried rice" 
            />
          </div>
        )}

        {/* Upload Interface */}
        {!image && !useCamera && !loading && !result && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <label className="upload-area">
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              <div className="upload-icon">
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <span style={{ fontWeight: 700 }}>Choose image file</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports PNG, JPEG, WEBP</span>
            </label>
            
            <div className="upload-area" onClick={startWebcam}>
              <div className="upload-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--secondary)' }}>
                <svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              </div>
              <span style={{ fontWeight: 700 }}>Use Webcam Camera</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Capture straight from desktop/mobile</span>
            </div>
          </div>
        )}

        {/* Camera stream view */}
        {useCamera && (
          <div style={{ textAlign: 'center' }}>
            <div className="camera-preview-container" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="scan-sweep-line"></div>
              <video ref={videoRef} autoPlay playsInline className="camera-preview"></video>
              <div className="camera-overlay"></div>
            </div>
            <div className="scan-buttons">
              <button className="btn btn-glow-primary" onClick={capturePhoto}>Capture Photo</button>
              <button className="btn btn-glass" onClick={stopWebcam}>Cancel</button>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          </div>
        )}

        {/* Uploaded / Captured Image Preview */}
        {image && !loading && !result && (
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Selected Plate Photo</h4>
            <img src={image} alt="Preview" className="scan-preview-img" />
            <div className="scan-buttons">
              <button className="btn btn-glow-primary" onClick={handleScanSubmit}>Analyze Image with Gemini AI</button>
              <button className="btn btn-glass" onClick={resetScanner}>Reset / Retake</button>
            </div>
          </div>
        )}

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

        {/* Errors */}
        {error && (
          <div className="alert-error">
            <strong>Error:</strong> {error}
            <div style={{ marginTop: '1rem' }}>
              <button className="btn btn-glass" onClick={resetScanner} style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}>Reset Scanner</button>
            </div>
          </div>
        )}

        {/* Results Card */}
        {result && (
          <div className="food-details-grid fade-in">
            {/* Column 1: Nutrition details / graph */}
            <div className="glass-card nutrition-wheel-card">
              <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.05em', marginBottom: '1rem', textTransform: 'uppercase' }}>Nutrition Dashboard</h4>
              
              <div className="nutrition-wheel">
                <svg className="nutrition-wheel-svg" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <path
                    className="wheel-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="3.5"
                  />
                  {/* Protein segment */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3.5"
                    strokeDasharray={`${percentages.pPercent}, 100`}
                  />
                  {/* Carbs segment */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--secondary)"
                    strokeWidth="3.5"
                    strokeDashoffset={`-${percentages.pPercent}`}
                    strokeDasharray={`${percentages.cPercent}, 100`}
                  />
                  {/* Fats segment */}
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

              {/* Legend with absolute values */}
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
                    <span>Carbs</span>
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

            {/* Column 2: Recipe & Details */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.6rem', fontFamily: 'Outfit, sans-serif' }} className="text-gradient-emerald">{result.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence score: {Math.round(result.confidence * 100)}%</div>
                </div>
                <button className="btn btn-glass" onClick={resetScanner} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Scan Another</button>
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

              <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem' }}>Ingredients</h4>
              <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                {result.ingredients.map((ing, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem' }}>{ing}</li>
                ))}
              </ul>

              <h4 style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.25rem' }}>Preparation Instructions</h4>
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
