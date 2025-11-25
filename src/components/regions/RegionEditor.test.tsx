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

// Provide canEdit and setSelectedRegion in store
const mockSetSelectedRegion = jest.fn();
const mockRegion = { 
  id: 'r1', 
  start: 0, 
  end: 1, 
  transcriptionId: 't1',
  regionAnalysis: []
};
jest.mock('../../stores/useEditorStore', () => ({
  useEditorStore: (selector: (s: any) => any) =>
    selector({
      canEdit: true,
      regions: [mockRegion],
      regionSelections: { r1: { text: '', length: 0 } },
      regionCursorWords: {},
      setSelectedRegion: mockSetSelectedRegion,
      regionById: (id: string) => id === 'r1' ? mockRegion : undefined,
    }),
}));

describe('RegionEditor deselect button', () => {
  it('calls setSelectedRegion(null) when clicking the deselect button', () => {
    render(
      <RegionEditor
        region={{ id: 'r1', start: 0, end: 1, isNote: false } as any}
      />
    );

    const btn = screen.getByTitle('Deselect region');
    fireEvent.click(btn);

    expect(mockSetSelectedRegion).toHaveBeenCalledWith(null);
  });
});

