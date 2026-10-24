import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'smartstaff.savedRequests.v1';
const AppContext = createContext(null);

const emptyRequest = {
  id: null,
  rawText: '',
  parsedData: null,
  editedData: null,
  matchingResults: null,
  selectedPartners: {},
  status: 'idle',
};

const initialState = {
  apiKey:
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.EXPO_PUBLIC_GEMENAI_API_KEY ||
    process.env.GEMENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  currentRequest: { ...emptyRequest },
  savedRequests: [],
  isLoading: false,
  error: null,
};

export function appReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, savedRequests: action.payload };

    case 'SET_RAW_TEXT':
      return {
        ...state,
        error: null,
        currentRequest: { ...emptyRequest, rawText: action.payload },
      };

    case 'START_PARSING':
      return { ...state, isLoading: true, error: null };

    case 'PARSE_SUCCESS':
      return {
        ...state,
        isLoading: false,
        currentRequest: {
          ...state.currentRequest,
          parsedData: action.payload,
          editedData: JSON.parse(JSON.stringify(action.payload)),
          selectedPartners: {},
          status: 'reviewing',
        },
      };

    case 'PARSE_ERROR':
      return { ...state, isLoading: false, error: action.payload };

    case 'LOAD_REQUEST':
      return {
        ...state,
        error: null,
        currentRequest: {
          ...action.payload,
          editedData: JSON.parse(JSON.stringify(action.payload.editedData)),
          selectedPartners: action.payload.selectedPartners || {},
          status: action.payload.status || 'reviewing',
        },
      };

    case 'UPDATE_EDITED_FIELD': {
      const { itemIndex, field, value } = action.payload;
      const data = state.currentRequest.editedData;
      const items = data.items.map((item, index) =>
        index === itemIndex
          ? { ...item, [field]: value, ...(field === 'location' ? { locationData: null } : {}) }
          : item
      );
      return {
        ...state,
        currentRequest: {
          ...state.currentRequest,
          editedData: {
            ...data,
            items,
            uncertainFields: (data.uncertainFields || []).filter(
              (entry) => !(entry.itemIndex === itemIndex && entry.field === field)
            ),
          },
        },
      };
    }

    case 'ADD_ITEM':
      return {
        ...state,
        currentRequest: {
          ...state.currentRequest,
          editedData: {
            ...state.currentRequest.editedData,
            items: [
              ...state.currentRequest.editedData.items,
              {
                subcategory: '',
                count: 1,
                date: '',
                startTime: '',
                endTime: '',
                location: '',
                budgetPerDay: null,
                specialNotes: '',
              },
            ],
          },
        },
      };

    case 'REMOVE_ITEM': {
      const data = state.currentRequest.editedData;
      return {
        ...state,
        currentRequest: {
          ...state.currentRequest,
          editedData: {
            ...data,
            items: data.items.filter((_, i) => i !== action.payload),
            uncertainFields: (data.uncertainFields || [])
              .filter((entry) => entry.itemIndex !== action.payload)
              .map((entry) => ({
                ...entry,
                itemIndex:
                  entry.itemIndex > action.payload ? entry.itemIndex - 1 : entry.itemIndex,
              })),
          },
        },
      };
    }

    case 'SET_MATCHING_RESULTS': {
      const initialSelected = {};
      action.payload.forEach((entry, idx) => {
        if (entry.matching?.results?.length > 0) {
          initialSelected[idx] = entry.matching.results[0].partner;
        }
      });
      return {
        ...state,
        currentRequest: {
          ...state.currentRequest,
          matchingResults: action.payload,
          selectedPartners: initialSelected,
          status: 'matched',
        },
      };
    }

    case 'SELECT_PARTNER':
      return {
        ...state,
        currentRequest: {
          ...state.currentRequest,
          selectedPartners: {
            ...state.currentRequest.selectedPartners,
            [action.payload.itemIndex]: action.payload.partner,
          },
        },
      };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        savedRequests: action.payload.requests,
        currentRequest: {
          ...state.currentRequest,
          id: action.payload.id,
          status: action.payload.status || 'saved',
        },
        error: null,
      };

    case 'RESET_CURRENT':
      return { ...state, currentRequest: { ...emptyRequest }, error: null };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const requests = JSON.parse(raw);
        if (!Array.isArray(requests)) throw new Error('Invalid saved requests');
        dispatch({
          type: 'HYDRATE',
          payload: requests.filter(
            (r) => r && typeof r.id === 'string' && Array.isArray(r.editedData?.items)
          ),
        });
      })
      .catch(() =>
        dispatch({
          type: 'PARSE_ERROR',
          payload: 'Saved requests could not be loaded. Please restart the app to try again.',
        })
      )
      .finally(() => setReady(true));
  }, []);

  const saveRequest = async (status = 'saved', customPartners = null) => {
    if (!ready) throw new Error('Your saved requests are still loading. Please try again.');
    const id = state.currentRequest.id || Date.now().toString();
    const selectedPartners = customPartners || state.currentRequest.selectedPartners || {};
    const request = {
      id,
      rawText: state.currentRequest.rawText,
      editedData: state.currentRequest.editedData,
      selectedPartners,
      status, // 'saved' | 'confirmed' | 'cancelled'
      savedAt: new Date().toISOString(),
      confirmedAt: status === 'confirmed' ? new Date().toISOString() : null,
    };
    const requests = [request, ...state.savedRequests.filter((entry) => entry.id !== id)];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    dispatch({ type: 'SAVE_SUCCESS', payload: { requests, id, status } });
    return request;
  };

  const cancelRequest = async (id) => {
    const updated = state.savedRequests.map((req) =>
      req.id === id ? { ...req, status: 'cancelled', cancelledAt: new Date().toISOString() } : req
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    dispatch({ type: 'HYDRATE', payload: updated });
  };

  return (
    <AppContext.Provider value={{ state, dispatch, ready, saveRequest, cancelRequest }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
