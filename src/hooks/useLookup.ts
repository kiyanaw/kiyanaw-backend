import { useState, useCallback } from 'react';

export interface LookupState {
  isOpen: boolean;
  searchTerm: string;
}

export const useLookup = () => {
  const [state, setState] = useState<LookupState>({
    isOpen: false,
    searchTerm: '',
  });

  const openLookup = useCallback((searchTerm: string = '') => {
    setState({
      isOpen: true,
      searchTerm: searchTerm.trim(),
    });
  }, []);

  const closeLookup = useCallback(() => {
    setState({
      isOpen: false,
      searchTerm: '',
    });
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setState((prev) => ({
      ...prev,
      searchTerm: term,
    }));
  }, []);

  return {
    ...state,
    openLookup,
    closeLookup,
    setSearchTerm,
  };
};
