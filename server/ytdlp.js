import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

/**
 * Check if yt-dlp is installed
 */
export async function checkYtdlp() {
    return new Promise((resolve) => {
        const proc = spawn('yt-dlp', ['--version']);
        proc.on('close', (code) => resolve(code === 0));
        proc.on('error', () => resolve(false));
    });
}

/**
 * Get video info from URL
 */
export async function getVideoInfo(url) {
    return new Promise((resolve, reject) => {
        const args = [
            '--dump-json',
            '--no-download',
            '--no-warnings',
            url
        ];

        const proc = spawn('yt-dlp', args);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                try {
                    const info = JSON.parse(stdout);
                    resolve({
                        id: info.id,
                        title: info.title,
                        thumbnail: info.thumbnail,
                        duration: info.duration,
                        uploader: info.uploader || info.channel,
                        platform: info.extractor_key || detectPlatform(url),
                        formats: extractFormats(info.formats || []),
                        originalUrl: url
                    });
                } catch (e) {
                    reject(new Error('Failed to parse video info'));
                }
            } else {
                reject(new Error(stderr || 'Failed to get video info'));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`yt-dlp not found: ${err.message}`));
        });
    });
}

/**
 * Download video with progress callback
 */
export function downloadVideo(url, options = {}, onProgress) {
    const { format = 'best', downloadId } = options;

    return new Promise((resolve, reject) => {
        const outputTemplate = path.join(DOWNLOADS_DIR, `${downloadId}_%(title)s.%(ext)s`);

        const args = [
            '-f', format,
            '-o', outputTemplate,
            '--newline',
            '--no-warnings',
            url
        ];

        const proc = spawn('yt-dlp', args);
        let outputFile = '';
        let lastProgress = 0;

        proc.stdout.on('data', (data) => {
            const line = data.toString();

            // Parse progress
            const progressMatch = line.match(/\[download\]\s+(\d+\.?\d*)%/);
            if (progressMatch) {
                const progress = parseFloat(progressMatch[1]);
                if (progress !== lastProgress) {
                    lastProgress = progress;
                    onProgress?.({ type: 'progress', progress, downloadId });
                }
            }

            // Parse destination file
            const destMatch = line.match(/\[download\] Destination: (.+)/);
            if (destMatch) {
                outputFile = destMatch[1].trim();
            }

            // Merger output
            const mergerMatch = line.match(/\[Merger\] Merging formats into "(.+)"/);
            if (mergerMatch) {
                outputFile = mergerMatch[1].trim();
            }
        });

        proc.stderr.on('data', (data) => {
            console.error('yt-dlp stderr:', data.toString());
        });

        proc.on('close', (code) => {
            if (code === 0) {
                // Find the actual output file
                const files = fs.readdirSync(DOWNLOADS_DIR)
                    .filter(f => f.startsWith(downloadId + '_'));

                if (files.length > 0) {
                    outputFile = path.join(DOWNLOADS_DIR, files[0]);
                }

                onProgress?.({ type: 'complete', progress: 100, downloadId, file: outputFile });
                resolve({ success: true, file: outputFile, downloadId });
            } else {
                onProgress?.({ type: 'error', downloadId, error: 'Download failed' });
                reject(new Error('Download failed'));
            }
        });

        proc.on('error', (err) => {
            onProgress?.({ type: 'error', downloadId, error: err.message });
            reject(err);
        });
    });
}

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'YouTube';
    }
    if (url.includes('tiktok.com')) {
        return 'TikTok';
    }
    return 'Unknown';
}

/**
 * Extract simplified format list
 */
function extractFormats(formats) {
    const simplified = [];
    const seen = new Set();

    // Filter and deduplicate formats
    for (const f of formats) {
        if (!f.height || !f.ext) continue;

        const key = `${f.height}p-${f.ext}`;
        if (seen.has(key)) continue;
        seen.add(key);

        simplified.push({
            formatId: f.format_id,
            quality: `${f.height}p`,
            ext: f.ext,
            filesize: f.filesize || f.filesize_approx,
            hasAudio: f.acodec !== 'none',
            hasVideo: f.vcodec !== 'none'
        });
    }

    // Sort by quality (highest first)
    simplified.sort((a, b) => {
        const aH = parseInt(a.quality);
        const bH = parseInt(b.quality);
        return bH - aH;
    });

    // Add a "best" option
    simplified.unshift({
        formatId: 'best',
        quality: 'Best Quality',
        ext: 'mp4',
        hasAudio: true,
        hasVideo: true
    });

    return simplified.slice(0, 10); // Limit to 10 options
}

export { DOWNLOADS_DIR };
