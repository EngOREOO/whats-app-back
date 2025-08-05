"use client";

import FileUpload from "@/components/ui/FileUpload";
import PhoneNumberUpload from "@/components/ui/PhoneNumberUpload";
import StudentDataUpload from "@/components/ui/StudentDataUpload";
import PlaceholderManager from "@/components/ui/PlaceholderManager";
import BulkJobProgress from "@/components/ui/BulkJobProgress";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { 
  SendMessageRequest, 
  BulkMessageRequest, 
  BulkMessageWithPersonalizationRequest,
  BulkJob, 
  StudentData,
  Placeholder,
  whatsappApi 
} from "@/lib/api";
import { createStudentDataObjects, validatePlaceholders, renderMessage } from "@/lib/utils";
import { useState } from "react";

interface MessageFormProps {
  sessionId: string;
  onMessageSent?: (messageId: string) => void;
  disabled?: boolean;
}

export default function MessageForm({
  sessionId,
  onMessageSent,
  disabled,
}: MessageFormProps) {
  const [activeTab, setActiveTab] = useState<"text" | "media" | "bulk">("text");
  const [loading, setLoading] = useState(false);
  const { toasts, removeToast, success, error: showError } = useToast();

  // Text message state
  const [textData, setTextData] = useState<SendMessageRequest>({
    to: "",
    message: "",
  });

  // Media message state
  const [mediaData, setMediaData] = useState({
    to: "",
    caption: "",
    file: null as File | null,
  });

  // Bulk message state
  const [bulkData, setBulkData] = useState<BulkMessageRequest>({
    numbers: [],
    message: "",
    delayRange: { min: 2, max: 9 },
  });
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Enhanced bulk messaging state
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [showPlaceholderManager, setShowPlaceholderManager] = useState(false);
  const [bulkMode, setBulkMode] = useState<"simple" | "advanced">("simple");
  const [showMessagePreview, setShowMessagePreview] = useState(false);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textData.to || !textData.message) return;

    setLoading(true);

    try {
      const response = await whatsappApi.sendTextMessage(sessionId, textData);

      if (response.success && response.data) {
        success(
          "Message sent successfully!",
          `Message ID: ${response.data.messageId}`
        );
        setTextData({ to: textData.to, message: "" }); // Keep phone number, clear message
        onMessageSent?.(response.data.messageId);
      } else {
        showError(
          "Failed to send message",
          response.error || "Unknown error occurred"
        );
      }
    } catch (err) {
      showError(
        "Network error",
        err instanceof Error ? err.message : "Failed to send message"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaData.to || !mediaData.file) return;

    setLoading(true);

    try {
      const response = await whatsappApi.sendMediaMessage(sessionId, {
        to: mediaData.to,
        file: mediaData.file,
        caption: mediaData.caption || undefined,
      });

      if (response.success && response.data) {
        success(
          "Media sent successfully!",
          `Message ID: ${response.data.messageId}`
        );
        setMediaData({ to: mediaData.to, caption: "", file: null }); // Keep phone number, clear rest
        onMessageSent?.(response.data.messageId);
      } else {
        showError(
          "Failed to send media",
          response.error || "Unknown error occurred"
        );
      }
    } catch (err) {
      showError(
        "Network error",
        err instanceof Error ? err.message : "Failed to send media"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkData.numbers.length === 0 || !bulkData.message) return;

    setLoading(true);

    try {
      const response = await whatsappApi.sendBulkTextMessage(sessionId, bulkData);

      if (response.success && response.data) {
        success(
          "Bulk message job started!",
          `Job ID: ${response.data.jobId}`
        );
        setCurrentJobId(response.data.jobId);
        onMessageSent?.(response.data.jobId);
      } else {
        showError(
          "Failed to start bulk message job",
          response.error || "Unknown error occurred"
        );
      }
    } catch (err) {
      showError(
        "Network error",
        err instanceof Error ? err.message : "Failed to start bulk message job"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBulkJobComplete = (job: BulkJob) => {
    const progress = job.progress || { sent: 0, failed: 0 };
    const successCount = progress.sent;
    const failedCount = progress.failed;
    
    if (job.status === "completed") {
      success(
        "Bulk message job completed!",
        `${successCount} messages sent successfully, ${failedCount} failed`
      );
    } else {
      showError(
        "Bulk message job failed",
        `${successCount} messages sent, ${failedCount} failed`
      );
    }
  };

  const handleAdvancedBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentData.length === 0 || !bulkData.message) return;

    setLoading(true);

    try {
      // Validate placeholders
      const availableFields = ['Name', 'Phone', 'Student Number', 'Group Name', 'Code', 'Password'];
      const missingFields = validatePlaceholders(bulkData.message, availableFields);
      
      if (missingFields.length > 0) {
        showError(
          "Invalid placeholders found",
          `The following placeholders are not available: ${missingFields.join(', ')}`
        );
        setLoading(false);
        return;
      }

      // Create data objects for each student
      const studentDataObjects = createStudentDataObjects(studentData);

      if (studentDataObjects.length === 0) {
        showError(
          "No valid data created",
          "Please ensure all students have valid data"
        );
        setLoading(false);
        return;
      }

      console.log('Sending personalized bulk messages with data:', studentDataObjects);

      const request: BulkMessageWithPersonalizationRequest = {
        message: bulkData.message,
        data: studentDataObjects,
        delayRange: bulkData.delayRange,
      };

      const response = await whatsappApi.sendBulkTextMessageWithPersonalization(sessionId, request);

      if (response.success && response.data) {
        success(
          "Personalized bulk message job started!",
          `Job ID: ${response.data.jobId}`
        );
        setCurrentJobId(response.data.jobId);
        onMessageSent?.(response.data.jobId);
      } else {
        showError(
          "Failed to start personalized bulk message job",
          response.error || "Unknown error occurred"
        );
      }
    } catch (err) {
      showError(
        "Network error",
        err instanceof Error ? err.message : "Failed to start personalized bulk message job"
      );
    } finally {
      setLoading(false);
    }
  };

  const insertPlaceholder = (placeholderName: string) => {
    const placeholder = `{{${placeholderName}}}`;
    const textarea = document.getElementById("bulk-message") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = bulkData.message;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      setBulkData(prev => ({ ...prev, message: newText }));
      
      // Set cursor position after the inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  const getAvailablePlaceholders = () => {
    const standardPlaceholders = [
      { id: "name", name: "Name", example: "Ahmed Kabary" },
      { id: "phone", name: "Phone", example: "+201122267427" },
      { id: "studentNumber", name: "Student Number", example: "11" },
      { id: "groupName", name: "Group Name", example: "السبت 8" },
      { id: "code", name: "Code", example: "3256888" },
      { id: "password", name: "Password", example: "12345" },
    ];
    return [...standardPlaceholders, ...placeholders];
  };

  const getMessagePreview = () => {
    if (!bulkData.message || studentData.length === 0) return [];
    
    try {
      // Create data objects for preview
      const previewData = createStudentDataObjects(studentData.slice(0, 3));
      
      // Create personalized messages for preview
      return previewData.map((data) => ({
        number: data.Phone,
        message: renderMessage(bulkData.message, data)
      }));
    } catch (error) {
      console.error('Error creating message preview:', error);
      return [];
    }
  };

  return (
    <>
      <div className="bg-github-canvas-subtle rounded-lg shadow-xl border border-github-border-default backdrop-blur-sm">
        {/* Header */}
        <div className="border-b border-github-border-muted p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">💬</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-github-fg-default">
                Send Message
              </h3>
              <p className="text-sm text-github-fg-muted">
                Session:{" "}
                <span className="font-mono text-[#1f6feb]">{sessionId}</span>
              </p>
            </div>
          </div>

          {disabled && (
            <div className="mt-4 p-3 bg-[#f85149]/10 border border-[#f85149]/20 rounded-lg">
              <p className="text-sm text-[#f85149] flex items-center gap-2">
                <span>⚠️</span>
                Session is not ready. Please ensure the session is connected.
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-github-border-muted">
          <div className="flex">
            <button
              onClick={() => setActiveTab("text")}
              className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                activeTab === "text"
                  ? "border-[#1f6feb] text-[#1f6feb] bg-[#1f6feb]/5"
                  : "border-transparent text-github-fg-muted hover:text-github-fg-default hover:bg-github-canvas-inset"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📝</span>
                Text Message
              </span>
            </button>
            <button
              onClick={() => setActiveTab("media")}
              className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                activeTab === "media"
                  ? "border-[#1f6feb] text-[#1f6feb] bg-[#1f6feb]/5"
                  : "border-transparent text-github-fg-muted hover:text-github-fg-default hover:bg-github-canvas-inset"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📎</span>
                Media Message
              </span>
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                activeTab === "bulk"
                  ? "border-[#1f6feb] text-[#1f6feb] bg-[#1f6feb]/5"
                  : "border-transparent text-github-fg-muted hover:text-github-fg-default hover:bg-github-canvas-inset"
              }`}
            >
              <span className="flex items-center gap-2">
                <span>📤</span>
                Bulk Messages
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Text Message Form */}
          {activeTab === "text" && (
            <form onSubmit={handleTextSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="text-to"
                  className="block text-sm font-medium text-github-fg-default mb-2"
                >
                  Phone Number
                </label>
                <input
                  id="text-to"
                  type="text"
                  placeholder="e.g., +1234567890 or 1234567890"
                  value={textData.to}
                  onChange={(e) =>
                    setTextData((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default placeholder-github-fg-muted transition-all duration-200"
                  disabled={disabled || loading}
                  required
                />
                <p className="text-xs text-github-fg-muted mt-2 flex items-center gap-1">
                  <span>💡</span>
                  Enter phone number with country code (e.g., +1234567890)
                </p>
              </div>

              <div>
                <label
                  htmlFor="text-message"
                  className="block text-sm font-medium text-github-fg-default mb-2"
                >
                  Message
                </label>
                <textarea
                  id="text-message"
                  rows={4}
                  placeholder="Enter your message here..."
                  value={textData.message}
                  onChange={(e) =>
                    setTextData((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default placeholder-github-fg-muted resize-none transition-all duration-200"
                  disabled={disabled || loading}
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-github-fg-muted">
                    {textData.message.length} characters
                  </p>
                  <p className="text-xs text-github-fg-muted">
                    Max: 4096 characters
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  disabled || loading || !textData.to || !textData.message
                }
                className="w-full py-3 px-6 bg-gradient-to-r from-[#1f6feb] to-[#58a6ff] text-white rounded-lg hover:from-[#1a5feb] hover:to-[#4fa6ff] focus:ring-2 focus:ring-[#1f6feb] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-[#1f6feb]/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin top-1 left-1"></div>
                    </div>
                    Sending Message...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>📤</span>
                    Send Text Message
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Media Message Form */}
          {activeTab === "media" && (
            <form onSubmit={handleMediaSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="media-to"
                  className="block text-sm font-medium text-github-fg-default mb-2"
                >
                  Phone Number
                </label>
                <input
                  id="media-to"
                  type="text"
                  placeholder="e.g., +1234567890 or 1234567890"
                  value={mediaData.to}
                  onChange={(e) =>
                    setMediaData((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default placeholder-github-fg-muted transition-all duration-200"
                  disabled={disabled || loading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-github-fg-default mb-2">
                  File
                </label>
                <FileUpload
                  onFileSelect={(file) =>
                    setMediaData((prev) => ({ ...prev, file }))
                  }
                  currentFile={mediaData.file}
                  disabled={disabled || loading}
                  maxSize={16}
                />
              </div>

              <div>
                <label
                  htmlFor="media-caption"
                  className="block text-sm font-medium text-github-fg-default mb-2"
                >
                  Caption (Optional)
                </label>
                <textarea
                  id="media-caption"
                  rows={3}
                  placeholder="Add a caption to your media..."
                  value={mediaData.caption}
                  onChange={(e) =>
                    setMediaData((prev) => ({
                      ...prev,
                      caption: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default placeholder-github-fg-muted resize-none transition-all duration-200"
                  disabled={disabled || loading}
                />
              </div>

              <button
                type="submit"
                disabled={
                  disabled || loading || !mediaData.to || !mediaData.file
                }
                className="w-full py-3 px-6 bg-gradient-to-r from-[#238636] to-[#2ea043] text-white rounded-lg hover:from-[#1f7a2e] hover:to-[#26893b] focus:ring-2 focus:ring-[#238636] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-[#238636]/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin top-1 left-1"></div>
                    </div>
                    Sending Media...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>🚀</span>
                    Send Media Message
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Bulk Message Form */}
          {activeTab === "bulk" && (
            <div className="space-y-6">
              {currentJobId ? (
                <div className="space-y-4">
                  <BulkJobProgress 
                    jobId={currentJobId} 
                    onJobComplete={handleBulkJobComplete}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentJobId(null);
                      setBulkData({ numbers: [], message: "", delayRange: { min: 2, max: 9 } });
                      setBulkFile(null);
                      setStudentData([]);
                      setStudentFile(null);
                    }}
                    className="w-full py-2 px-4 text-sm text-github-fg-muted hover:text-github-fg-default border border-github-border-default rounded-lg hover:bg-github-canvas-inset transition-all duration-200"
                  >
                    Start New Bulk Job
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Mode Selector */}
                  <div className="bg-github-canvas-default rounded-lg p-4 border border-github-border-muted">
                    <label className="block text-sm font-medium text-github-fg-default mb-3">
                      Bulk Message Mode
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setBulkMode("simple")}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                          bulkMode === "simple"
                            ? "bg-[#1f6feb] text-white"
                            : "bg-github-canvas-subtle text-github-fg-muted hover:text-github-fg-default hover:bg-github-canvas-inset"
                        }`}
                      >
                        📱 Simple (Phone Numbers Only)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkMode("advanced")}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                          bulkMode === "advanced"
                            ? "bg-[#1f6feb] text-white"
                            : "bg-github-canvas-subtle text-github-fg-muted hover:text-github-fg-default hover:bg-github-canvas-inset"
                        }`}
                      >
                        👥 Advanced (Student Data + Placeholders)
                      </button>
                    </div>
                  </div>

                  {/* Simple Mode */}
                  {bulkMode === "simple" && (
                    <form onSubmit={handleBulkSubmit} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-github-fg-default mb-2">
                          Phone Numbers File
                        </label>
                        <PhoneNumberUpload
                          onNumbersExtracted={(numbers, file) => {
                            setBulkData((prev) => ({ ...prev, numbers }));
                            setBulkFile(file);
                          }}
                          currentFile={bulkFile}
                          disabled={disabled || loading}
                        />
                        {bulkData.numbers.length > 0 && (
                          <div className="mt-3 p-3 bg-github-canvas-default border border-github-border-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-github-fg-default">
                                {bulkData.numbers.length} phone numbers loaded
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setBulkData((prev) => ({ ...prev, numbers: [] }));
                                  setBulkFile(null);
                                }}
                                className="text-xs text-[#da3633] hover:text-[#da3633]/80"
                              >
                                Clear All
                              </button>
                            </div>
                            <div className="max-h-32 overflow-y-auto custom-scrollbar">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                                {bulkData.numbers.slice(0, 12).map((number, index) => (
                                  <span
                                    key={index}
                                    className="text-xs font-mono text-github-fg-muted bg-github-canvas-inset px-2 py-1 rounded"
                                  >
                                    {number}
                                  </span>
                                ))}
                                {bulkData.numbers.length > 12 && (
                                  <span className="text-xs text-github-fg-subtle col-span-full">
                                    +{bulkData.numbers.length - 12} more...
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="bulk-message"
                          className="block text-sm font-medium text-github-fg-default mb-2"
                        >
                          Message
                        </label>
                        <textarea
                          id="bulk-message"
                          rows={4}
                          placeholder="Enter your message here..."
                          value={bulkData.message}
                          onChange={(e) =>
                            setBulkData((prev) => ({
                              ...prev,
                              message: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default placeholder-github-fg-muted resize-none transition-all duration-200"
                          disabled={disabled || loading}
                          required
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-github-fg-muted">
                            {bulkData.message.length} characters
                          </p>
                          <p className="text-xs text-github-fg-muted">
                            Max: 4096 characters
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-github-fg-default mb-2">
                          Delay Range (seconds)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-github-fg-muted mb-1">
                              Minimum
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={bulkData.delayRange?.min || 2}
                              onChange={(e) =>
                                setBulkData((prev) => ({
                                  ...prev,
                                  delayRange: {
                                    ...prev.delayRange!,
                                    min: parseInt(e.target.value) || 2,
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default transition-all duration-200"
                              disabled={disabled || loading}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-github-fg-muted mb-1">
                              Maximum
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={bulkData.delayRange?.max || 9}
                              onChange={(e) =>
                                setBulkData((prev) => ({
                                  ...prev,
                                  delayRange: {
                                    ...prev.delayRange!,
                                    max: parseInt(e.target.value) || 9,
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default transition-all duration-200"
                              disabled={disabled || loading}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-github-fg-muted mt-2 flex items-center gap-1">
                          <span>⏱️</span>
                          Random delay between messages to avoid rate limiting
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          disabled || loading || bulkData.numbers.length === 0 || !bulkData.message
                        }
                        className="w-full py-3 px-6 bg-gradient-to-r from-[#f0883e] to-[#f4845f] text-white rounded-lg hover:from-[#e67e22] hover:to-[#f39c12] focus:ring-2 focus:ring-[#f0883e] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-[#f0883e]/25"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-3">
                            <div className="relative">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <div className="absolute inset-0 w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin top-1 left-1"></div>
                            </div>
                            Starting Bulk Job...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span>📤</span>
                            Send Bulk Messages ({bulkData.numbers.length} recipients)
                          </span>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Advanced Mode */}
                  {bulkMode === "advanced" && (
                    <form onSubmit={handleAdvancedBulkSubmit} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-github-fg-default mb-2">
                          Student Data File
                        </label>
                        <StudentDataUpload
                          onDataExtracted={(data, file) => {
                            setStudentData(data);
                            setStudentFile(file);
                          }}
                          currentFile={studentFile}
                          disabled={disabled || loading}
                        />
                        {studentData.length > 0 && (
                          <div className="mt-3 p-3 bg-github-canvas-default border border-github-border-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-github-fg-default">
                                {studentData.length} students loaded
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setStudentData([]);
                                  setStudentFile(null);
                                }}
                                className="text-xs text-[#da3633] hover:text-[#da3633]/80"
                              >
                                Clear All
                              </button>
                            </div>
                            <div className="text-xs text-github-fg-muted">
                              Phone numbers will be formatted as: {studentData.slice(0, 3).map(s => {
                                const phone = s.phoneNumber.trim();
                                if (!phone.startsWith('+')) {
                                  if (phone.startsWith('0')) {
                                    return '+20' + phone.substring(1);
                                  }
                                  if (phone.length === 11 && phone.startsWith('1')) {
                                    return '+20' + phone;
                                  }
                                  return '+' + phone;
                                }
                                return phone;
                              }).join(', ')}
                              {studentData.length > 3 && ` and ${studentData.length - 3} more...`}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-github-fg-default">
                            Message with Placeholders
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPlaceholderManager(true)}
                            className="text-xs text-[#1f6feb] hover:text-[#1a5feb] transition-colors"
                          >
                            Manage Placeholders
                          </button>
                        </div>
                        <textarea
                          id="bulk-message"
                          rows={4}
                          placeholder="Enter your message with placeholders like {{Name}}, {{Code}}, etc..."
                          value={bulkData.message}
                          onChange={(e) =>
                            setBulkData((prev) => ({
                              ...prev,
                              message: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default placeholder-github-fg-muted resize-none transition-all duration-200"
                          disabled={disabled || loading}
                          required
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-github-fg-muted">
                            {bulkData.message.length} characters
                          </p>
                          <p className="text-xs text-github-fg-muted">
                            Max: 4096 characters
                          </p>
                        </div>
                      </div>

                      {/* Available Placeholders */}
                      <div>
                        <label className="block text-sm font-medium text-github-fg-default mb-2">
                          Available Placeholders
                        </label>
                        <div className="bg-github-canvas-default rounded-lg p-3 border border-github-border-muted">
                          <div className="flex flex-wrap gap-2">
                            {getAvailablePlaceholders().map((placeholder) => (
                              <button
                                key={placeholder.id}
                                type="button"
                                onClick={() => insertPlaceholder(placeholder.name)}
                                className="px-3 py-1 text-xs bg-github-canvas-subtle text-github-fg-default border border-github-border-muted rounded hover:bg-github-canvas-inset transition-colors"
                                title={`Insert {{${placeholder.name}}} - Example: ${placeholder.example}`}
                              >
                                {placeholder.name}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-github-fg-muted mt-2">
                            Click any placeholder to insert it into your message
                          </p>
                        </div>
                      </div>

                      {/* Message Preview */}
                      {studentData.length > 0 && bulkData.message && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-github-fg-default">
                              Message Preview
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowMessagePreview(!showMessagePreview)}
                              className="text-xs text-[#1f6feb] hover:text-[#1a5feb] transition-colors"
                            >
                              {showMessagePreview ? 'Hide Preview' : 'Show Preview'}
                            </button>
                          </div>
                          {showMessagePreview && (
                            <div className="bg-github-canvas-default rounded-lg p-4 border border-github-border-muted">
                              <div className="space-y-3">
                                {getMessagePreview().map((preview, index) => (
                                  <div key={index} className="border-l-4 border-[#1f6feb] pl-3">
                                    <div className="text-xs text-github-fg-muted mb-1">
                                      To: {preview.number}
                                    </div>
                                    <div className="text-sm text-github-fg-default whitespace-pre-wrap">
                                      {preview.message}
                                    </div>
                                  </div>
                                ))}
                                {studentData.length > 3 && (
                                  <div className="text-xs text-github-fg-muted text-center">
                                    ... and {studentData.length - 3} more personalized messages
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-github-fg-default mb-2">
                          Delay Range (seconds)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-github-fg-muted mb-1">
                              Minimum
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={bulkData.delayRange?.min || 2}
                              onChange={(e) =>
                                setBulkData((prev) => ({
                                  ...prev,
                                  delayRange: {
                                    ...prev.delayRange!,
                                    min: parseInt(e.target.value) || 2,
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default transition-all duration-200"
                              disabled={disabled || loading}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-github-fg-muted mb-1">
                              Maximum
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="30"
                              value={bulkData.delayRange?.max || 9}
                              onChange={(e) =>
                                setBulkData((prev) => ({
                                  ...prev,
                                  delayRange: {
                                    ...prev.delayRange!,
                                    max: parseInt(e.target.value) || 9,
                                  },
                                }))
                              }
                              className="w-full px-3 py-2 bg-github-canvas-default border border-github-border-default rounded-lg focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent text-github-fg-default transition-all duration-200"
                              disabled={disabled || loading}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-github-fg-muted mt-2 flex items-center gap-1">
                          <span>⏱️</span>
                          Random delay between messages to avoid rate limiting
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          disabled || loading || studentData.length === 0 || !bulkData.message
                        }
                        className="w-full py-3 px-6 bg-gradient-to-r from-[#238636] to-[#2ea043] text-white rounded-lg hover:from-[#1f7a2e] hover:to-[#26893b] focus:ring-2 focus:ring-[#238636] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-[#238636]/25"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-3">
                            <div className="relative">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <div className="absolute inset-0 w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin top-1 left-1"></div>
                            </div>
                            Starting Advanced Bulk Job...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span>📤</span>
                            Send Advanced Bulk Messages ({studentData.length} students)
                          </span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Placeholder Manager Modal */}
      <PlaceholderManager
        isOpen={showPlaceholderManager}
        onClose={() => setShowPlaceholderManager(false)}
        placeholders={placeholders}
        onPlaceholdersChange={setPlaceholders}
      />
    </>
  );
}
