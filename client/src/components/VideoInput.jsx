import { useState, useCallback } from 'react'
import './VideoInput.css'

function VideoInput({ onSubmit, loading, onClear }) {
    const [url, setUrl] = useState('')

    const detectPlatform = useCallback((url) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return 'youtube'
        }
        if (url.includes('tiktok.com')) {
            return 'tiktok'
        }
        return null
    }, [])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (url.trim()) {
            onSubmit(url.trim())
        }
    }

    const handleClear = () => {
        setUrl('')
        onClear?.()
    }

    const platform = detectPlatform(url)

    return (
        <form className="video-input" onSubmit={handleSubmit}>
            <div className="input-container glass">
                {/* Platform Icon */}
                <div className={`platform-icon ${platform || 'empty'}`}>
                    {platform === 'youtube' && (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.4 3.5-6.4 3.5z" />
                        </svg>
                    )}
                    {platform === 'tiktok' && (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.6 6.7c-1.6-.3-2.8-1.4-3.2-2.9-.1-.3-.1-.6-.1-.9h-3.3v13.5c0 1.7-1.4 3.1-3.1 3.1s-3.1-1.4-3.1-3.1 1.4-3.1 3.1-3.1c.3 0 .6 0 .9.1v-3.4c-.3 0-.6-.1-.9-.1-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5V9.3c1.2.8 2.7 1.3 4.2 1.3V7.3c0 0-.7-.3-1-.6z" />
                        </svg>
                    )}
                    {!platform && (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                    )}
                </div>

                {/* Input Field */}
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste YouTube or TikTok URL here..."
                    className="url-input"
                    disabled={loading}
                />

                {/* Clear Button */}
                {url && (
                    <button
                        type="button"
                        className="clear-btn"
                        onClick={handleClear}
                        disabled={loading}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    className="submit-btn"
                    disabled={!url.trim() || loading}
                >
                    {loading ? (
                        <span className="loading-spinner"></span>
                    ) : (
                        <>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                            </svg>
                            <span>Get Video</span>
                        </>
                    )}
                </button>
            </div>

            {/* Supported Platforms */}
            <div className="supported-platforms">
                <span className="platform-badge youtube">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.4 3.5-6.4 3.5z" />
                    </svg>
                    YouTube
                </span>
                <span className="platform-badge tiktok">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M19.6 6.7c-1.6-.3-2.8-1.4-3.2-2.9-.1-.3-.1-.6-.1-.9h-3.3v13.5c0 1.7-1.4 3.1-3.1 3.1s-3.1-1.4-3.1-3.1 1.4-3.1 3.1-3.1c.3 0 .6 0 .9.1v-3.4c-.3 0-.6-.1-.9-.1-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5V9.3c1.2.8 2.7 1.3 4.2 1.3V7.3c0 0-.7-.3-1-.6z" />
                    </svg>
                    TikTok
                </span>
            </div>
        </form>
    )
}

export default VideoInput
