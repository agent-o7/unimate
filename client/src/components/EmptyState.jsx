import './EmptyState.css'

function EmptyState({ title, description, icon, action }) {
    return (
        <div className="empty-state fade-in">
            <div className="empty-state-illustration">
                {icon || (
                    <svg viewBox="0 0 120 120" fill="none" className="empty-state-svg">
                        {/* Down arrow in rounded box */}
                        <rect x="30" y="10" width="60" height="80" rx="8" stroke="currentColor" strokeWidth="3" fill="none" className="empty-state-box" />
                        <path d="M60 30v40M45 55l15 15 15-15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="empty-state-arrow" />
                        {/* Play button */}
                        <circle cx="60" cy="50" r="18" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.4" />
                        <polygon points="52,42 52,58 64,50" fill="currentColor" opacity="0.4" />
                        {/* Sparkles */}
                        <circle cx="85" cy="25" r="3" fill="currentColor" opacity="0.3" className="empty-state-sparkle s1" />
                        <circle cx="90" cy="40" r="2" fill="currentColor" opacity="0.2" className="empty-state-sparkle s2" />
                        <circle cx="30" cy="95" r="2.5" fill="currentColor" opacity="0.25" className="empty-state-sparkle s3" />
                        <circle cx="95" cy="80" r="2" fill="currentColor" opacity="0.15" className="empty-state-sparkle s4" />
                        {/* Music note */}
                        <path d="M75 85l15-5v-8l-15 5v8z" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
                        <circle cx="72" cy="90" r="4" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
                    </svg>
                )}
            </div>
            <h3 className="empty-state-title">{title || 'Nothing here yet'}</h3>
            <p className="empty-state-description">{description || 'Paste a video URL above to get started'}</p>
            {action && (
                <button className="empty-state-action" onClick={action.onClick}>
                    {action.label}
                </button>
            )}
        </div>
    )
}

export default EmptyState
