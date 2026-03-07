import axios from 'axios';

export const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface SearchResponse {
    answer: string;
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

export const searchVibes = async (query: string): Promise<SearchResponse> => {
    const response = await apiClient.post<SearchResponse>('/search/', { query });
    return response.data;
};

export const uploadDocument = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/documents/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};
