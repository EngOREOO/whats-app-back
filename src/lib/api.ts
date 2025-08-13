import axios from "axios";

const API_BASE_URL =
  process.env.NODE_ENV === "production" 
    ? "https://wh-front.codiaumtech.com/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WhatsAppSession {
  id: string;
  status: "initializing" | "qr" | "authenticated" | "ready" | "disconnected";
  qrCode?: string;
  clientInfo?: {
    pushname: string;
    wid: string;
    platform: string;
  };
}

export interface SendMessageRequest {
  to: string;
  message: string;
}

export interface SendMediaRequest {
  to: string;
  file: File;
  caption?: string;
}

export const whatsappApi = {
  // Session management
  async createSession(sessionId?: string): Promise<{ ok: boolean; retryable?: boolean; message?: string; sessionData?: WhatsAppSession; retryAfter?: string }> {
    try {
      const response = await api.post("/sessions", { sessionId });
      const body = response.data || {};

      // Debug logging
      console.log(`Session creation response - Status: ${response.status}, Retryable: ${body?.retryable}, Retry-After: ${response.headers['retry-after']}`);

      if (response.status === 201) {
        console.log("✅ Session created successfully");
        return { ok: true, sessionData: body.data || { id: body.sessionId || sessionId || 'default', status: 'initializing' } };
      }
      
      if (response.status === 503) {
        // For 503, check if retryable is explicitly false, otherwise assume it's retryable
        const isRetryable = body?.retryable !== false; // Default to true unless explicitly false
        console.log(`⚠️ Service temporarily unavailable, retryable: ${isRetryable}`);
        return { 
          ok: false, 
          retryable: isRetryable, 
          message: 'Service temporarily unavailable. Retrying...', 
          retryAfter: response.headers['retry-after'] 
        };
      }
      
      if (response.status === 500 && body?.retryable === false) {
        console.log("❌ Failed to initialize WhatsApp session, not retryable");
        return { 
          ok: false, 
          retryable: false, 
          message: 'Failed to initialize WhatsApp session. Please try again later.' 
        };
      }
      
      console.log(`❌ Unexpected response - Status: ${response.status}, Retryable: ${body?.retryable}`);
      return { ok: false, retryable: false, message: body?.message || `HTTP ${response.status}` };
    } catch (error: any) {
      // Handle axios errors
      if (error.response) {
        const body = error.response.data || {};
        const status = error.response.status;
        const retryAfter = error.response.headers['retry-after'];
        
        // Debug logging
        console.log(`Session creation error - Status: ${status}, Retryable: ${body?.retryable}, Retry-After: ${retryAfter}`);
        console.log("Full error response:", error.response);
        
        if (status === 503) {
          // For 503, check if retryable is explicitly false, otherwise assume it's retryable
          const isRetryable = body?.retryable !== false; // Default to true unless explicitly false
          console.log(`⚠️ Service temporarily unavailable (from catch), retryable: ${isRetryable}`);
          return { 
            ok: false, 
            retryable: isRetryable, 
            message: 'Service temporarily unavailable. Retrying...', 
            retryAfter: retryAfter 
          };
        }
        
        if (status === 500 && body?.retryable === false) {
          console.log("❌ Failed to initialize WhatsApp session (from catch), not retryable");
          return { 
            ok: false, 
            retryable: false, 
            message: 'Failed to initialize WhatsApp session. Please try again later.' 
          };
        }
        
        return { ok: false, retryable: false, message: body?.message || `HTTP ${status}` };
      }
      
      console.log("❌ Network error:", error.message);
      return { ok: false, retryable: false, message: error.message || 'Network error' };
    }
  },

  async getAllSessions(): Promise<ApiResponse<WhatsAppSession[]>> {
    const response = await api.get("/sessions");
    return response.data;
  },

  async getSessionStatus(
    sessionId: string
  ): Promise<ApiResponse<WhatsAppSession>> {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  },

  async logout(sessionId: string): Promise<ApiResponse> {
    const response = await api.post(`/sessions/${sessionId}/logout`);
    return response.data;
  },

  async destroySession(sessionId: string): Promise<ApiResponse> {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  },

  // Messaging
  async sendTextMessage(
    sessionId: string,
    data: SendMessageRequest
  ): Promise<ApiResponse<{ messageId: string }>> {
    const response = await api.post(`/sessions/${sessionId}/send-text`, data);
    return response.data;
  },

  async sendMediaMessage(
    sessionId: string,
    data: SendMediaRequest
  ): Promise<ApiResponse<{ messageId: string }>> {
    const formData = new FormData();
    formData.append("to", data.to);
    formData.append("file", data.file);
    if (data.caption) {
      formData.append("caption", data.caption);
    }

    const response = await api.post(
      `/sessions/${sessionId}/send-media`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response = await api.get("/health");
    return response.data;
  },
};

// Error interceptor - but don't intercept 503 errors for session creation
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't intercept 503 errors for session creation - let them be handled by the specific function
    if (error.response?.status === 503 && error.config?.url?.includes('/sessions')) {
      console.log("503 error for session creation - letting specific handler deal with it");
      return Promise.reject(error); // Re-throw the original error
    }
    
    const message =
      error.response?.data?.error || error.message || "Unknown error occurred";
    console.error("API Error:", message);
    return Promise.reject(new Error(message));
  }
);
