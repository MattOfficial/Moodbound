import { AxiosError } from 'axios';

import {
  apiClient,
  deleteDocument,
  getDocuments,
  getErrorMessage,
  getGraph,
  getSystemStatus,
  getUserProfile,
  searchVibes,
  updateUserProfile,
  uploadAvatar,
  uploadDocument,
} from './client';

describe('api client helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers FastAPI detail strings when formatting axios errors', () => {
    const error = new AxiosError(
      'Request failed',
      undefined,
      undefined,
      undefined,
      {
        data: { detail: 'Queued worker failed.' },
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: {} as never,
      }
    );

    expect(getErrorMessage(error, 'fallback')).toBe('Queued worker failed.');
  });

  it('falls back to generic error messages when needed', () => {
    expect(getErrorMessage(new Error('Boom'), 'fallback')).toBe('Boom');
    expect(getErrorMessage('weird', 'fallback')).toBe('fallback');
  });

  it('fetches system status and documents through the shared axios client', async () => {
    vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: { status: 'Online', agent_router: 'Gemini', vector_db: 'Qdrant' } })
      .mockResolvedValueOnce({ data: [{ id: 'doc-1', filename: 'storm.pdf', status: 'Completed', genre: 'Fantasy', created_at: '2026-03-13T00:00:00Z' }] });

    await expect(getSystemStatus()).resolves.toEqual({
      status: 'Online',
      agent_router: 'Gemini',
      vector_db: 'Qdrant',
    });
    await expect(getDocuments()).resolves.toHaveLength(1);
  });

  it('sends search, profile update, and delete requests to the expected endpoints', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { answer: 'Found it', sources: [] } });
    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { id: 'user-1', email: 'reader@example.com' } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: undefined });

    await expect(searchVibes('stormy')).resolves.toEqual({ answer: 'Found it', sources: [] });
    await expect(updateUserProfile({ nickname: 'Nova' })).resolves.toEqual({ id: 'user-1', email: 'reader@example.com' });
    await expect(deleteDocument('doc-1')).resolves.toBeUndefined();

    expect(postSpy).toHaveBeenCalledWith('/search/', { query: 'stormy' });
    expect(putSpy).toHaveBeenCalledWith('/auth/me', { nickname: 'Nova' });
    expect(deleteSpy).toHaveBeenCalledWith('/documents/doc-1');
  });

  it('uploads files with multipart form data for documents and avatars', async () => {
    const postSpy = vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce({ data: { document_id: 'doc-1' } })
      .mockResolvedValueOnce({ data: { id: 'user-1', email: 'reader@example.com' } });

    const documentFile = new File(['content'], 'storm.pdf', { type: 'application/pdf' });
    const avatarFile = new File(['img'], 'avatar.png', { type: 'image/png' });

    await uploadDocument(documentFile, 'Fantasy');
    await uploadAvatar(avatarFile);

    expect(postSpy).toHaveBeenNthCalledWith(
      1,
      '/documents/',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
    expect(postSpy).toHaveBeenNthCalledWith(
      2,
      '/auth/me/avatar',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  });

  it('fetches graph and user profile resources', async () => {
    const getSpy = vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: { nodes: [], edges: [], message: 'No graph' } })
      .mockResolvedValueOnce({ data: { id: 'user-1', email: 'reader@example.com', nickname: 'Reader' } });

    await expect(getGraph('doc-1')).resolves.toEqual({ nodes: [], edges: [], message: 'No graph' });
    await expect(getUserProfile()).resolves.toEqual({ id: 'user-1', email: 'reader@example.com', nickname: 'Reader' });

    expect(getSpy).toHaveBeenNthCalledWith(1, '/graph/doc-1');
    expect(getSpy).toHaveBeenNthCalledWith(2, '/auth/me');
  });
});
