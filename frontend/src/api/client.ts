import axios from 'axios';

export const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string' && detail.trim()) {
            return detail;
        }
        if (error.message) {
            return error.message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

export interface SearchResponse {
    answer: string;
    vibe?: string;
    engine?: string;
    sources: Array<{
        text: string;
        score: number;
        filename: string;
    }>;
}

export interface SystemStatusResponse {
    status: string;
    agent_router: string;
    vector_db: string;
}

export const getSystemStatus = async (): Promise<SystemStatusResponse> => {
    const response = await apiClient.get<SystemStatusResponse>('/system/status');
    return response.data;
};

export interface DocumentRecord {
    id: string;
    filename: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
    genre: string;
    created_at: string;
}

export const getDocuments = async (): Promise<DocumentRecord[]> => {
    const response = await apiClient.get<DocumentRecord[]>('/documents/');
    return response.data;
};

export const deleteDocument = async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
};

export const searchVibes = async (query: string): Promise<SearchResponse> => {
    const response = await apiClient.post<SearchResponse>('/search/', { query });
    return response.data;
};

export const uploadDocument = async (file: File, genre: string = 'Uncategorized') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('genre', genre);

    const response = await apiClient.post('/documents/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export interface GraphResponse {
    nodes: Array<{ id: string; label: string }>;
    edges: Array<{ source: string; target: string; label: string; color?: string }>;
    message?: string;
}

export const getGraph = async (documentId: string): Promise<GraphResponse> => {
    const response = await apiClient.get(`/graph/${documentId}`);
    return response.data;
};

export interface UserProfile {
    id: string;
    email: string;
    nickname?: string | null;
    profile_picture_url?: string | null;
}

export interface UserProfileUpdateParams {
    nickname?: string;
    profile_picture_url?: string;
    password?: string;
}

export const getUserProfile = async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/auth/me');
    return response.data;
};

export const updateUserProfile = async (data: UserProfileUpdateParams): Promise<UserProfile> => {
    const response = await apiClient.put<UserProfile>('/auth/me', data);
    return response.data;
};

export const uploadAvatar = async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<UserProfile>('/auth/me/avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};
