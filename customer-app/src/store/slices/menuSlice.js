import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { menuAPI } from '../../services/api';

// Async thunks
export const fetchCategories = createAsyncThunk(
  'menu/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await menuAPI.getCategories();
      return response.categories;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch categories');
    }
  }
);

export const fetchMenuItems = createAsyncThunk(
  'menu/fetchMenuItems',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await menuAPI.getMenuItems(params);
      return response.items;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch menu items');
    }
  }
);

export const fetchMenuItem = createAsyncThunk(
  'menu/fetchMenuItem',
  async (itemId, { rejectWithValue }) => {
    try {
      const response = await menuAPI.getMenuItem(itemId);
      return response.item;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch menu item');
    }
  }
);

export const searchMenuItems = createAsyncThunk(
  'menu/searchMenuItems',
  async (query, { rejectWithValue }) => {
    try {
      const response = await menuAPI.searchItems(query);
      return response.results;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Search failed');
    }
  }
);

const initialState = {
  categories: [],
  items: [],
  featuredItems: [],
  currentItem: null,
  searchResults: [],
  isLoading: false,
  isLoadingItem: false,
  isSearching: false,
  error: null,
  searchQuery: '',
  selectedCategory: null,
};

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
    },
    clearCurrentItem: (state) => {
      state.currentItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Categories
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Menu Items
      .addCase(fetchMenuItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        
        // Also set featured items
        state.featuredItems = action.payload.filter(item => item.is_featured);
        state.error = null;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Single Menu Item
      .addCase(fetchMenuItem.pending, (state) => {
        state.isLoadingItem = true;
        state.error = null;
      })
      .addCase(fetchMenuItem.fulfilled, (state, action) => {
        state.isLoadingItem = false;
        state.currentItem = action.payload;
        state.error = null;
      })
      .addCase(fetchMenuItem.rejected, (state, action) => {
        state.isLoadingItem = false;
        state.error = action.payload;
      })
      
      // Search Menu Items
      .addCase(searchMenuItems.pending, (state) => {
        state.isSearching = true;
        state.error = null;
      })
      .addCase(searchMenuItems.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload;
        state.error = null;
      })
      .addCase(searchMenuItems.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearError,
  setSelectedCategory,
  setSearchQuery,
  clearSearchResults,
  clearCurrentItem,
} = menuSlice.actions;

export default menuSlice.reducer;