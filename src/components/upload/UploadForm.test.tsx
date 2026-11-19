import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { UploadForm } from './UploadForm';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../stores/useAuthStore', () => ({
  useAuthStore: (selector: (s: { user: { username: string; userId: string } }) => unknown) =>
    selector({ user: { username: 'aaron', userId: 'user-1' } }),
}));

jest.mock('../../services', () => ({ services: {} }));

const mockExecute = jest.fn();
jest.mock('../../use-cases/create-transcription', () => ({
  CreateTranscriptionUseCase: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
}));

const fillAndSubmit = () => {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'My recording' } });
  const file = new File(['audio'], 'clip.mp3', { type: 'audio/mpeg' });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
};

describe('UploadForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows an error when the upload fails and stays on the page', async () => {
    mockExecute.mockRejectedValue(new Error('AccessDenied'));
    render(<MemoryRouter><UploadForm /></MemoryRouter>);

    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Upload failed. Please try again.');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears the error on the next attempt and navigates on success', async () => {
    mockExecute.mockRejectedValueOnce(new Error('AccessDenied')).mockResolvedValueOnce(undefined);
    render(<MemoryRouter><UploadForm /></MemoryRouter>);

    fillAndSubmit();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/transcribe-list'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
