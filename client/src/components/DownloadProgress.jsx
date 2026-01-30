import './DownloadProgress.css'

function DownloadProgress({ download, onDownloadFile, onRemove }) {
    const isComplete = download.type === 'complete'
    const isError = download.type === 'error'
    const progress = Math.round(download.progress || 0)

    const getStatusText = () => {
        switch (download.type) {
            case 'starting':
                return 'Starting download...'
            case 'progress':
                return `Downloading... ${progress}%`
            case 'complete':
                return 'Download complete!'
            case 'error':
                return download.error || 'Download failed'
            default:
                return 'Processing...'
        }
    }

    const platformClass = download.platform?.toLowerCase() || 'unknown'

    return (
        <div className={`download-progress glass ${isComplete ? 'complete' : ''} ${isError ? 'error' : ''}`}>
            {/* Thumbnail */}
            {download.thumbnail && (
                <div className="download-thumbnail">
                    <img src={download.thumbnail} alt="" />
                    <div className={`platform-dot ${platformClass}`}></div>
                </div>
            )}

            {/* Info */}
            <div className="download-info">
                <h4 className="download-title">{download.title}</h4>
                <p className="download-status">{getStatusText()}</p>

                {/* Progress Bar */}
                {!isComplete && !isError && (
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="download-actions">
                {isComplete && (
                    <button
                        className="action-btn save-btn"
                        onClick={() => onDownloadFile(download.downloadId)}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                        Save
                    </button>
                )}

                <button
                    className="action-btn remove-btn"
                    onClick={() => onRemove(download.downloadId)}
                    title="Remove"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

export default DownloadProgress
