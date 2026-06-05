import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RegionEditor } from './RegionEditor';

jest.mock('../../hooks/useTextEditors', () => ({
  useTextEditors: () => ({ mainEditorRef: { current: null }, translationEditorRef: { current: null } }),
}));

jest.mock('../../hooks/useDeleteRegion', () => ({
  useDeleteRegion: () => ({ deleteRegion: jest.fn() }),
}));

jest.mock('../../hooks/useSelectAndPlayRegion', () => ({
  useSelectAndPlayRegion: () => jest.fn(),
}));

const mockMergeRegion = jest.fn();
jest.mock('../../hooks/useMergeRegion', () => ({
  useMergeRegion: () => ({ mergeRegion: mockMergeRegion }),
}));

// Provide canEdit and setSelectedRegion in store
const mockSetSelectedRegion = jest.fn();
const mockRegion = {
  id: 'r1',
  start: 0,
  end: 1,
  transcriptionId: 't1',
  isNote: false,
  regionAnalysis: [],
};
const prevRegion = { id: 'r0', start: 0, end: 0.5, transcriptionId: 't1', isNote: false, regionAnalysis: [] };
const nextRegion = { id: 'r2', start: 1, end: 2, transcriptionId: 't1', isNote: false, regionAnalysis: [] };

let mockStoreState: Record<string, unknown> = {};

jest.mock('../../stores/useEditorStore', () => ({
  useEditorStore: (selector: (s: any) => any) => selector(mockStoreState),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreState = {
    canEdit: true,
    regions: [prevRegion, mockRegion, nextRegion],
    regionSelections: { r1: { text: '', length: 0 } },
    regionCursorWords: {},
    setSelectedRegion: mockSetSelectedRegion,
    regionById: (id: string) => [prevRegion, mockRegion, nextRegion].find((r) => r.id === id) ?? null,
  };
});

describe('RegionEditor deselect button', () => {
  it('calls setSelectedRegion(null) when clicking the deselect button', () => {
    render(<RegionEditor region={{ id: 'r1', start: 0, end: 1, isNote: false } as any} />);
    fireEvent.click(screen.getByTitle('Deselect region'));
    expect(mockSetSelectedRegion).toHaveBeenCalledWith(null);
  });
});

describe('RegionEditor merge buttons', () => {
  it('renders both merge buttons', () => {
    render(<RegionEditor region={mockRegion as any} />);
    expect(screen.getByTestId('merge-previous-button')).toBeInTheDocument();
    expect(screen.getByTestId('merge-next-button')).toBeInTheDocument();
  });

  it('clicking merge-previous invokes mergeRegion with correct ids', () => {
    render(<RegionEditor region={mockRegion as any} />);
    fireEvent.click(screen.getByTestId('merge-previous-button'));
    expect(mockMergeRegion).toHaveBeenCalledWith({
      survivorId: prevRegion.id,
      absorbedId: mockRegion.id,
      transcriptionId: mockRegion.transcriptionId,
    });
  });

  it('clicking merge-next invokes mergeRegion with correct ids', () => {
    render(<RegionEditor region={mockRegion as any} />);
    fireEvent.click(screen.getByTestId('merge-next-button'));
    expect(mockMergeRegion).toHaveBeenCalledWith({
      survivorId: mockRegion.id,
      absorbedId: nextRegion.id,
      transcriptionId: mockRegion.transcriptionId,
    });
  });

  it('merge-previous is disabled for the first region', () => {
    mockStoreState = { ...mockStoreState, regions: [mockRegion, nextRegion] };
    render(<RegionEditor region={mockRegion as any} />);
    expect(screen.getByTestId('merge-previous-button')).toBeDisabled();
  });

  it('merge-next is disabled for the last region', () => {
    mockStoreState = { ...mockStoreState, regions: [prevRegion, mockRegion] };
    render(<RegionEditor region={mockRegion as any} />);
    expect(screen.getByTestId('merge-next-button')).toBeDisabled();
  });

  it('both buttons disabled when canEdit is false', () => {
    mockStoreState = { ...mockStoreState, canEdit: false };
    render(<RegionEditor region={mockRegion as any} />);
    expect(screen.getByTestId('merge-previous-button')).toBeDisabled();
    expect(screen.getByTestId('merge-next-button')).toBeDisabled();
  });

  it('merge-previous disabled when neighbor isNote differs', () => {
    const noteRegion = { ...prevRegion, isNote: true };
    mockStoreState = {
      ...mockStoreState,
      regions: [noteRegion, mockRegion, nextRegion],
      regionById: (id: string) => [noteRegion, mockRegion, nextRegion].find((r) => r.id === id) ?? null,
    };
    render(<RegionEditor region={mockRegion as any} />);
    expect(screen.getByTestId('merge-previous-button')).toBeDisabled();
  });

  it('merge-next disabled when neighbor isNote differs', () => {
    const noteNext = { ...nextRegion, isNote: true };
    mockStoreState = {
      ...mockStoreState,
      regions: [prevRegion, mockRegion, noteNext],
      regionById: (id: string) => [prevRegion, mockRegion, noteNext].find((r) => r.id === id) ?? null,
    };
    render(<RegionEditor region={mockRegion as any} />);
    expect(screen.getByTestId('merge-next-button')).toBeDisabled();
  });
});
