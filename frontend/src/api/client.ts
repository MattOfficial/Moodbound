import axios from 'axios';

export const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface SearchResponse {
    answer: string;
    vibe?: string;
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
