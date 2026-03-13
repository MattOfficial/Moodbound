const createRootMock = vi.fn();
const renderMock = vi.fn();

vi.mock('react-dom/client', () => ({
  createRoot: (...args: unknown[]) => createRootMock(...args),
}));

vi.mock('./App.tsx', () => ({
  default: () => <div>App Shell</div>,
}));

describe('main entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    createRootMock.mockReset();
    renderMock.mockReset();
    createRootMock.mockReturnValue({ render: renderMock });
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts the app into the root element', async () => {
    await import('./main.tsx');

    expect(createRootMock).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
