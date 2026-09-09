import { Check, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ResumeUpload({
  fileName,
  reading,
  disabled = false,
  onFile,
}: {
  fileName: string;
  reading: boolean;
  disabled?: boolean;
  onFile: (file: File) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
  const accept = (file: File | undefined) => {
    if (!file || disabled || reading) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      toast.error("Choose a PDF, DOCX, or TXT file");
      return;
    }
    void onFile(file);
  };

  return (
    <label
      className="upload-zone"
      data-dragging={dragging}
      data-loaded={Boolean(fileName)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled && !reading) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files[0]);
      }}
    >
      <input
        type="file"
        accept=".pdf,.docx,.txt"
        disabled={disabled || reading}
        aria-label={
          fileName
            ? `Replace resume: ${fileName}`
            : "Upload your resume as PDF, DOCX, or TXT, maximum 10MB"
        }
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <span className="upload-icon" aria-hidden="true">
        {reading ? (
          <Loader2 size={22} className="animate-spin" />
        ) : fileName ? (
          <Check size={22} />
        ) : (
          <Upload size={22} />
        )}
      </span>
      <strong>{reading ? "Reading your resume…" : fileName || "Drop your resume here"}</strong>
      <small>{fileName ? "Choose another file to replace it" : "or click to choose a file"}</small>
      <small>PDF, DOCX or TXT · Up to 10 MB</small>
    </label>
  );
}
