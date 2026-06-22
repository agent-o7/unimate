use std::collections::HashMap;
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Emitter, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::oneshot;
use uuid::Uuid;
use regex::Regex;

#[derive(Default)]
pub struct AppState {
    pub active_processes: Mutex<HashMap<String, oneshot::Sender<()>>>,
    pub completed_files: Mutex<HashMap<String, PathBuf>>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VideoFormat {
    pub format_id: String,
    pub quality: String,
    pub ext: String,
    pub filesize: Option<u64>,
    pub has_audio: bool,
    pub has_video: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub id: String,
    pub title: String,
    pub thumbnail: Option<String>,
    pub duration: Option<f64>,
    pub uploader: Option<String>,
    pub platform: String,
    pub formats: Vec<VideoFormat>,
    pub is_playlist: bool,
    pub playlist_count: Option<usize>,
    pub original_url: String,
}

#[derive(serde::Deserialize, Debug)]
struct RawVideoFormat {
    format_id: Option<String>,
    height: Option<u32>,
    ext: Option<String>,
    filesize: Option<u64>,
    filesize_approx: Option<u64>,
    acodec: Option<String>,
    vcodec: Option<String>,
}

#[derive(serde::Deserialize, Debug)]
struct RawVideoInfo {
    id: Option<String>,
    title: Option<String>,
    thumbnail: Option<String>,
    duration: Option<f64>,
    uploader: Option<String>,
    channel: Option<String>,
    extractor_key: Option<String>,
    formats: Option<Vec<RawVideoFormat>>,
    entries: Option<serde_json::Value>,
}

#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    r#type: String, // "starting" | "progress" | "complete" | "error" | "cancelled"
    download_id: String,
    progress: f64,
    speed: Option<String>,
    eta: Option<String>,
    error: Option<String>,
    file: Option<String>,
}

#[tauri::command]
async fn check_ytdlp() -> bool {
    let mut cmd = Command::new("yt-dlp");
    cmd.arg("--version");

    match cmd.output().await {
        Ok(output) => output.status.success(),
        Err(_) => false,
    }
}

#[tauri::command]
async fn get_video_info(url: String) -> Result<VideoInfo, String> {
    let mut cmd = Command::new("yt-dlp");
    cmd.args(["--dump-json", "--no-download", "--no-warnings", &url]);

    let output = cmd.output().await.map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(if stderr.is_empty() {
            "Failed to get video info from yt-dlp".to_string()
        } else {
            stderr.trim().to_string()
        });
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let raw: RawVideoInfo = serde_json::from_str(&stdout_str)
        .map_err(|e| format!("Failed to parse video info JSON: {}", e))?;

    let id = raw.id.unwrap_or_default();
    let title = raw.title.unwrap_or_else(|| "Unknown Title".to_string());
    let thumbnail = raw.thumbnail;
    let duration = raw.duration;
    let uploader = raw.uploader.or(raw.channel);

    let detect_platform = |url: &str| {
        if url.contains("youtube.com") || url.contains("youtu.be") {
            "YouTube".to_string()
        } else if url.contains("tiktok.com") {
            "TikTok".to_string()
        } else {
            "Unknown".to_string()
        }
    };
    let platform = raw.extractor_key.unwrap_or_else(|| detect_platform(&url));

    let mut simplified = Vec::new();
    let mut seen = std::collections::HashSet::new();

    if let Some(formats) = raw.formats {
        for f in formats {
            if let (Some(format_id), Some(height), Some(ext)) = (f.format_id, f.height, f.ext) {
                let key = format!("{}p-{}", height, ext);
                if seen.contains(&key) {
                    continue;
                }
                seen.insert(key.clone());

                let has_audio = f.acodec.as_deref().unwrap_or("none") != "none";
                let has_video = f.vcodec.as_deref().unwrap_or("none") != "none";
                let filesize = f.filesize.or(f.filesize_approx);

                simplified.push(VideoFormat {
                    format_id,
                    quality: format!("{}p", height),
                    ext,
                    filesize,
                    has_audio,
                    has_video,
                });
            }
        }
    }

    simplified.sort_by(|a, b| {
        let a_h: u32 = a.quality.replace("p", "").parse().unwrap_or(0);
        let b_h: u32 = b.quality.replace("p", "").parse().unwrap_or(0);
        b_h.cmp(&a_h)
    });

    simplified.insert(0, VideoFormat {
        format_id: "best".to_string(),
        quality: "Best Quality".to_string(),
        ext: "mp4".to_string(),
        filesize: None,
        has_audio: true,
        has_video: true,
    });

    simplified.truncate(10);

    let is_playlist = raw.entries.is_some();
    let playlist_count = if let Some(entries) = &raw.entries {
        if let Some(arr) = entries.as_array() {
            Some(arr.len())
        } else {
            None
        }
    } else {
        None
    };

    Ok(VideoInfo {
        id,
        title,
        thumbnail,
        duration,
        uploader,
        platform,
        formats: simplified,
        is_playlist,
        playlist_count,
        original_url: url,
    })
}

#[tauri::command]
async fn start_download(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    format: String,
    audio_only: bool,
) -> Result<String, String> {
    let download_id = Uuid::new_v4().to_string();

    let downloads_dir = app.path().app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("downloads");
    
    tokio::fs::create_dir_all(&downloads_dir).await.map_err(|e| e.to_string())?;

    let output_template = downloads_dir.join(format!("{}_%(title)s.%(ext)s", download_id));
    let output_template_str = output_template.to_string_lossy().to_string();

    let mut args = Vec::new();
    if audio_only {
        args.extend(["-f", "bestaudio/best", "--extract-audio", "--audio-format", "mp3", "--audio-quality", "0"]);
    } else {
        args.extend(["-f", &format]);
    }
    args.extend(["-o", &output_template_str, "--newline", "--no-warnings", "--no-playlist", &url]);

    let mut cmd = Command::new("yt-dlp");
    cmd.args(args);
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn yt-dlp: {}", e))?;
    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;

    let (cancel_tx, mut cancel_rx) = oneshot::channel::<()>();
    {
        let mut active = state.active_processes.lock().unwrap();
        active.insert(download_id.clone(), cancel_tx);
    }

    let app_clone = app.clone();
    let download_id_clone = download_id.clone();

    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        let progress_rx = Regex::new(r"\[download\]\s+(\d+(?:\.\d*)?)%").unwrap();
        let speed_rx = Regex::new(r"at\s+([\d\.]+[KM]?i?B/s)").unwrap();
        let eta_rx = Regex::new(r"ETA\s+(\S+)").unwrap();

        let mut last_progress = 0.0;

        let stdout_loop = async {
            while let Ok(Some(line)) = reader.next_line().await {
                let mut progress = 0.0;
                let mut speed = None;
                let mut eta = None;
                let mut matched = false;

                if let Some(caps) = progress_rx.captures(&line) {
                    if let Some(p_str) = caps.get(1) {
                        if let Ok(p) = p_str.as_str().parse::<f64>() {
                            progress = if audio_only { p / 2.0 } else { p };
                            matched = true;
                        }
                    }
                }

                if let Some(caps) = speed_rx.captures(&line) {
                    if let Some(s_str) = caps.get(1) {
                        speed = Some(s_str.as_str().to_string());
                        matched = true;
                    }
                }

                if let Some(caps) = eta_rx.captures(&line) {
                    if let Some(e_str) = caps.get(1) {
                        eta = Some(e_str.as_str().to_string());
                        matched = true;
                    }
                }

                if matched && (progress != last_progress || speed.is_some() || eta.is_some()) {
                    last_progress = progress;
                    let payload = ProgressPayload {
                        r#type: "progress".to_string(),
                        download_id: download_id_clone.clone(),
                        progress,
                        speed,
                        eta,
                        error: None,
                        file: None,
                    };
                    let _ = app_clone.emit("download-progress", payload);
                }
            }
            Ok::<(), String>(())
        };

        let result = tokio::select! {
            res = stdout_loop => {
                match res {
                    Ok(_) => {
                        let status = child.wait().await;
                        match status {
                            Ok(exit_status) if exit_status.success() => Ok(()),
                            Ok(exit_status) => Err(format!("yt-dlp exited with status: {}", exit_status)),
                            Err(e) => Err(format!("Failed to wait for child: {}", e)),
                        }
                    }
                    Err(e) => Err(e),
                }
            }
            _ = &mut cancel_rx => {
                let _ = child.kill().await;
                Err("cancelled".to_string())
            }
        };

        // Remove from active processes
        {
            if let Some(active_state) = app_clone.try_state::<AppState>() {
                let mut active = active_state.active_processes.lock().unwrap();
                active.remove(&download_id_clone);
            }
        }

        match result {
            Ok(_) => {
                // Find completed file
                let mut final_file = None;
                if let Ok(mut entries) = tokio::fs::read_dir(&downloads_dir).await {
                    while let Ok(Some(entry)) = entries.next_entry().await {
                        if let Some(filename) = entry.file_name().to_str() {
                            if filename.starts_with(&format!("{}_", download_id_clone)) {
                                final_file = Some(entry.path());
                                break;
                            }
                        }
                    }
                }

                if let Some(path) = final_file {
                    // Store completed file
                    if let Some(active_state) = app_clone.try_state::<AppState>() {
                        let mut completed = active_state.completed_files.lock().unwrap();
                        completed.insert(download_id_clone.clone(), path.clone());
                    }

                    let payload = ProgressPayload {
                        r#type: "complete".to_string(),
                        download_id: download_id_clone,
                        progress: 100.0,
                        speed: None,
                        eta: None,
                        error: None,
                        file: Some(path.to_string_lossy().to_string()),
                    };
                    let _ = app_clone.emit("download-progress", payload);
                } else {
                    let payload = ProgressPayload {
                        r#type: "error".to_string(),
                        download_id: download_id_clone,
                        progress: 0.0,
                        speed: None,
                        eta: None,
                        error: Some("Downloaded file not found".to_string()),
                        file: None,
                    };
                    let _ = app_clone.emit("download-progress", payload);
                }
            }
            Err(e) if e == "cancelled" => {
                let payload = ProgressPayload {
                    r#type: "cancelled".to_string(),
                    download_id: download_id_clone,
                    progress: 0.0,
                    speed: None,
                    eta: None,
                    error: None,
                    file: None,
                };
                let _ = app_clone.emit("download-progress", payload);
            }
            Err(e) => {
                let payload = ProgressPayload {
                    r#type: "error".to_string(),
                    download_id: download_id_clone,
                    progress: 0.0,
                    speed: None,
                    eta: None,
                    error: Some(e),
                    file: None,
                };
                let _ = app_clone.emit("download-progress", payload);
            }
        }
    });

    Ok(download_id)
}

#[tauri::command]
async fn cancel_download(state: State<'_, AppState>, download_id: String) -> Result<bool, String> {
    let sender = {
        let mut active = state.active_processes.lock().unwrap();
        active.remove(&download_id)
    };

    if let Some(tx) = sender {
        let _ = tx.send(());
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
async fn save_file(state: State<'_, AppState>, download_id: String) -> Result<bool, String> {
    let file_path = {
        let completed = state.completed_files.lock().unwrap();
        completed.get(&download_id).cloned()
    };

    let source_path = match file_path {
        Some(path) => path,
        None => return Err("File not found or not completed".to_string()),
    };

    // Get suggested name by stripping download_id_ prefix
    let filename = source_path.file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("video.mp4");
    
    // The filename has the pattern "<download_id>_<title>.<ext>"
    // Strip the download_id part which is 36 chars + 1 underscore = 37 chars
    let suggested_name = if filename.len() > 37 {
        &filename[37..]
    } else {
        filename
    };

    let extension = source_path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("mp4");

    let save_dialog = rfd::FileDialog::new()
        .set_file_name(suggested_name)
        .add_filter("Video/Audio File", &[extension])
        .save_file();

    if let Some(dest_path) = save_dialog {
        tokio::fs::copy(&source_path, &dest_path)
            .await
            .map_err(|e| format!("Failed to copy file: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
async fn delete_temp_file(state: State<'_, AppState>, download_id: String) -> Result<(), String> {
    let file_path = {
        let mut completed = state.completed_files.lock().unwrap();
        completed.remove(&download_id)
    };

    if let Some(path) = file_path {
        if path.exists() {
            let _ = tokio::fs::remove_file(path).await;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(AppState::default())
    .invoke_handler(tauri::generate_handler![
        check_ytdlp,
        get_video_info,
        start_download,
        cancel_download,
        save_file,
        delete_temp_file
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
