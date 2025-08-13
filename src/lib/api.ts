import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://wh-front.codiaumtech.com/api";

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

      if (response.status === 201) {
        return { ok: true, sessionData: body.data || { id: body.sessionId || sessionId || 'default', status: 'initializing' } };
      }
      if (response.status === 503 && body?.retryable) {
        return { ok: false, retryable: true, message: body?.message || 'Service busy', retryAfter: response.headers['retry-after'] };
      }
      return { ok: false, retryable: false, message: body?.message || `HTTP ${response.status}` };
    } catch (error: any) {
      // Handle axios errors
      if (error.response) {
        const body = error.response.data || {};
        if (error.response.status === 503 && body?.retryable) {
          return { ok: false, retryable: true, message: body?.message || 'Service busy', retryAfter: error.response.headers['retry-after'] };
        }
        return { ok: false, retryable: false, message: body?.message || `HTTP ${error.response.status}` };
      }
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

// Error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error || error.message || "Unknown error occurred";
    console.error("API Error:", message);
    return Promise.reject(new Error(message));
  }
);
