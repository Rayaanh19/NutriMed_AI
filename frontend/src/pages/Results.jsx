import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { marked } from 'marked'

export default function Results() {
  const navigate = useNavigate()
  const location = useLocation()
  const result = location.state?.result || ''

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result || '')
      alert('Copied to clipboard')
    } catch (_) { /* noop */ }
  }

  const handleDownload = () => {
    const blob = new Blob([result || ''], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'meal-plan.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const triggerQRShare = () => {
    // Generate a simple query to retrieve summary details
    const shareQuery = "Meal plan recipe details";
    const encoded = encodeURIComponent(shareQuery);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`);
    setShowQRModal(true);
  };

  return (
    <div className="fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="results-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-glass" onClick={() => navigate('/')}>← Dashboard</button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-glass" onClick={handleCopy}>Copy Markdown</button>
          <button className="btn btn-glass" onClick={handleDownload}>Download</button>
          <button className="btn btn-glow-primary" onClick={triggerQRShare}>Share QR</button>
        </div>
      </div>
      
      <div className="glass-card">
        <h2 style={{ marginBottom: '1.5rem', fontFamily: 'Outfit, sans-serif' }} className="text-gradient-emerald">Personalized Diet Chart</h2>
        
        <div className="markdown-view" style={{ background: 'rgba(255,255,255,0.01)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          {result ? (
            <div dangerouslySetInnerHTML={{ 
              __html: marked.parse(
                result.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, (match, alt, url) => {
                  return `![${alt}](${encodeURI(url.trim())})`;
                })
              ) 
            }} />
          ) : (
            <div className="skeleton-card">
              <div className="skeleton-item" style={{ width: '40%' }}></div>
              <div className="skeleton-item" style={{ width: '85%' }}></div>
              <div className="skeleton-item" style={{ width: '70%' }}></div>
              <div className="skeleton-item" style={{ width: '90%' }}></div>
              <div className="skeleton-item" style={{ width: '60%' }}></div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Share Modal */}
      {showQRModal && (
        <div className="qr-modal" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Outfit' }}>Scan Recipe Code</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Scan this QR code to load meal plan recipe breakdowns immediately on other mobile targets.</p>
            <div className="qr-image">
              <img src={qrUrl} alt="Meal plan QR code" style={{ display: 'block' }} />
            </div>
            <button className="btn btn-glass" onClick={() => setShowQRModal(false)} style={{ width: '100%' }}>Close Overlay</button>
          </div>
        </div>
      )}
    </div>
  )
}
