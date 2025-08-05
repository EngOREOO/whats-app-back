"use client";

import { StudentData } from "@/lib/api";
import { useCallback, useState } from "react";

interface StudentDataUploadProps {
  onDataExtracted: (data: StudentData[], file: File) => void;
  disabled?: boolean;
  currentFile?: File | null;
}

export default function StudentDataUpload({
  onDataExtracted,
  disabled = false,
  currentFile = null,
}: StudentDataUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<StudentData[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      "text/plain",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return "Please upload a .txt, .csv, or .xlsx file";
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return "File size must be less than 5MB";
    }
    
    return null;
  };

  const parseStudentData = async (file: File): Promise<StudentData[]> => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    const students: StudentData[] = [];
    
    for (const line of lines) {
      const columns = line.split(',').map(col => col.trim());
      
      if (columns.length >= 6) {
        const student: StudentData = {
          phoneNumber: columns[0] || '',
          name: columns[1] || '',
          stdNum: columns[2] || '',
          groupName: columns[3] || '',
          code: columns[4] || '',
          password: columns[5] || '',
        };
        students.push(student);
      }
    }
    
    return students;
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const students = await parseStudentData(file);
        
        if (students.length === 0) {
          setError("No valid student data found in the file");
          return;
        }

        if (students.length > 1000) {
          setError("Maximum 1000 students allowed per bulk message");
          return;
        }

        setPreviewData(students);
        setShowPreview(true);
      } catch {
        setError("Failed to parse student data from file");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleConfirmData = () => {
    onDataExtracted(previewData, currentFile!);
    setShowPreview(false);
  };

  const handleUpdateStudent = (index: number, field: keyof StudentData, value: string) => {
    const updatedData = [...previewData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    setPreviewData(updatedData);
  };

  const handleDeleteStudent = (index: number) => {
    const updatedData = previewData.filter((_, i) => i !== index);
    setPreviewData(updatedData);
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [disabled, handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const removeFile = useCallback(() => {
    onDataExtracted([], null as unknown as File);
    setError("");
    setPreviewData([]);
    setShowPreview(false);
  }, [onDataExtracted]);

  const getFileIcon = (file: File) => {
    if (file.type === "text/plain") return "📄";
    if (file.type === "text/csv") return "📊";
    if (file.type.includes("spreadsheet") || file.type.includes("excel")) return "📈";
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (showPreview) {
    return (
      <div className="space-y-4">
        <div className="bg-github-canvas-default border border-github-border-default rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] rounded-lg flex items-center justify-center text-white text-xl">
              {currentFile ? getFileIcon(currentFile) : "📊"}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-github-fg-default truncate">
                {currentFile?.name || "Student Data"}
              </h4>
              <p className="text-sm text-github-fg-muted">
                {previewData.length} students loaded
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirmData}
                className="px-4 py-2 bg-gradient-to-r from-[#238636] to-[#2ea043] text-white rounded-lg hover:from-[#1f7a2e] hover:to-[#26893b] transition-all duration-200"
              >
                Confirm Data
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-github-fg-muted hover:text-github-fg-default border border-github-border-default rounded-lg hover:bg-github-canvas-inset transition-all duration-200"
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="bg-github-canvas-subtle rounded-lg border border-github-border-default p-4">
          <h3 className="text-lg font-medium text-github-fg-default mb-4">
            Preview Student Data ({previewData.length} students)
          </h3>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              {previewData.map((student, index) => (
                <div
                  key={index}
                  className="bg-github-canvas-default rounded-lg p-4 border border-github-border-muted"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-xs text-github-fg-muted mb-1">📱 Phone</label>
                      <input
                        type="text"
                        value={student.phoneNumber}
                        onChange={(e) => handleUpdateStudent(index, 'phoneNumber', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-github-canvas-subtle border border-github-border-muted rounded focus:ring-1 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-github-fg-muted mb-1">👤 Name</label>
                      <input
                        type="text"
                        value={student.name}
                        onChange={(e) => handleUpdateStudent(index, 'name', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-github-canvas-subtle border border-github-border-muted rounded focus:ring-1 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-github-fg-muted mb-1">🔢 Student #</label>
                      <input
                        type="text"
                        value={student.stdNum}
                        onChange={(e) => handleUpdateStudent(index, 'stdNum', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-github-canvas-subtle border border-github-border-muted rounded focus:ring-1 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-github-fg-muted mb-1">🏷️ Group</label>
                      <input
                        type="text"
                        value={student.groupName}
                        onChange={(e) => handleUpdateStudent(index, 'groupName', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-github-canvas-subtle border border-github-border-muted rounded focus:ring-1 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-github-fg-muted mb-1">🆔 Code</label>
                      <input
                        type="text"
                        value={student.code}
                        onChange={(e) => handleUpdateStudent(index, 'code', e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-github-canvas-subtle border border-github-border-muted rounded focus:ring-1 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-github-fg-muted mb-1">🔐 Password</label>
                        <input
                          type="text"
                          value={student.password}
                          onChange={(e) => handleUpdateStudent(index, 'password', e.target.value)}
                          className="w-full px-2 py-1 text-sm bg-github-canvas-subtle border border-github-border-muted rounded focus:ring-1 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteStudent(index)}
                        className="text-[#da3633] hover:text-[#da3633]/80 transition-colors"
                        title="Delete student"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!currentFile ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            isDragging
              ? "border-[#1f6feb] bg-[#1f6feb]/5"
              : disabled
              ? "border-github-border-muted bg-github-canvas-inset cursor-not-allowed"
              : "border-github-border-default hover:border-[#1f6feb] hover:bg-[#1f6feb]/5 cursor-pointer"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() =>
            !disabled && document.getElementById("student-file-input")?.click()
          }
        >
          <input
            id="student-file-input"
            type="file"
            accept=".txt,.csv,.xlsx,.xls"
            onChange={handleInputChange}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Student data file upload"
          />

          <div className="space-y-4">
            <div
              className={`w-16 h-16 mx-auto rounded-lg flex items-center justify-center ${
                isDragging ? "bg-[#1f6feb]/20" : "bg-github-canvas-default"
              } transition-colors duration-200`}
            >
              <span className="text-2xl">👥</span>
            </div>

            <div>
              <h3 className="text-lg font-medium text-github-fg-default mb-2">
                {isDragging
                  ? "Drop your file here"
                  : "Upload student data file"}
              </h3>
              <p className="text-sm text-github-fg-muted">
                Support for .txt, .csv, and .xlsx files
              </p>
              <p className="text-xs text-github-fg-subtle mt-1">
                Format: Phone,Name,Student#,Group,Code,Password
              </p>
              <p className="text-xs text-github-fg-subtle">
                Maximum 1000 students, 5MB file size
              </p>
            </div>

            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] text-white rounded-lg hover:from-[#1a5feb] hover:to-[#4fa6ff] transition-all duration-200">
              <span className="text-sm font-medium">Browse Files</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-github-canvas-default border border-github-border-default rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] rounded-lg flex items-center justify-center text-white text-xl">
              {getFileIcon(currentFile)}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-github-fg-default truncate">
                {currentFile.name}
              </h4>
              <p className="text-sm text-github-fg-muted">
                {formatFileSize(currentFile.size)}
              </p>
            </div>

            <button
              onClick={removeFile}
              disabled={disabled || loading}
              className="w-8 h-8 bg-[#da3633]/10 hover:bg-[#da3633]/20 text-[#da3633] rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="p-3 bg-[#1f6feb]/10 border border-[#1f6feb]/20 rounded-lg">
          <div className="text-sm text-[#1f6feb] flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#1f6feb] border-t-transparent rounded-full animate-spin"></div>
            Processing student data...
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[#da3633]/10 border border-[#da3633]/20 rounded-lg">
          <div className="text-sm text-[#da3633] flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </div>
        </div>
      )}
    </div>
  );
} 