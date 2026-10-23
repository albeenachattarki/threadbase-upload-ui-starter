import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function validate(file) {
  if (!ALLOWED.includes(file.type)) {
    return "Only image files are allowed (JPEG, PNG, WebP, GIF)";
  }

  if (file.size > MAX_SIZE) {
    return "File is too large (max 5MB)";
  }

  return null;
}

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(nextFile) {
    if (!nextFile) return;

    const validationError = validate(nextFile);
    setError(validationError || "");
    setUploadedUrl("");
    setProgress(0);

    if (validationError) {
      setFile(null);
      return;
    }

    setFile(nextFile);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  function handleInputChange(event) {
    selectFile(event.target.files[0]);
    // Allow selecting the same file again after an error or upload.
    event.target.value = "";
  }

  async function upload() {
    if (!file || isUploading) return;

    setError("");
    setUploadedUrl("");
    setProgress(0);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });

      setProgress(100);
      setUploadedUrl(response.data.url);
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          "Upload failed. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={isDragging ? "drop-zone dragging" : "drop-zone"}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
      >
        <p>{isDragging ? "Drop to upload" : "Drag an image here, or click to choose"}</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          hidden
          onChange={handleInputChange}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {preview && (
        <div>
          <img src={preview} alt="Selected avatar preview" className="preview" />
          <p>{file.name}</p>
        </div>
      )}

      {progress > 0 && (
        <div aria-label={`Upload progress: ${progress}%`}>
          <div className="bar">
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{isUploading ? `Uploading ${progress}%` : `${progress}%`}</p>
        </div>
      )}

      <button onClick={upload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {uploadedUrl && (
        <p role="status">Upload complete: {uploadedUrl}</p>
      )}
    </div>
  );
}
