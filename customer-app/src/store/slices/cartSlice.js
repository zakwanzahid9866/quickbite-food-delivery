import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  totalAmount: 0,
  totalItems: 0,
  deliveryFee: 300, // $3.00 in cents
  tax: 0,
  grandTotal: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const { item, quantity, selectedModifiers, specialInstructions } = action.payload;
      
      // Calculate item price with modifiers
      const modifierPrice = selectedModifiers.reduce((sum, mod) => sum + mod.price_cents, 0);
      const itemTotalPrice = (item.price_cents + modifierPrice) * quantity;
      
      // Create unique ID for cart item (includes modifiers)
      const modifierIds = selectedModifiers.map(mod => mod.id).sort().join(',');
      const cartItemId = `${item.id}_${modifierIds}_${specialInstructions || ''}`;
      
      // Check if item with same modifiers already exists
      const existingItemIndex = state.items.findIndex(cartItem => cartItem.id === cartItemId);
      
      if (existingItemIndex >= 0) {
        // Update existing item
        state.items[existingItemIndex].quantity += quantity;
        state.items[existingItemIndex].totalPrice += itemTotalPrice;
      } else {
        // Add new item
        state.items.push({
          id: cartItemId,
          menuItemId: item.id,
          name: item.name,
          price: item.price_cents,
          quantity,
          selectedModifiers,
          specialInstructions: specialInstructions || '',
          totalPrice: itemTotalPrice,
          image: item.image_url,
        });
      }
      
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    removeFromCart: (state, action) => {
      const itemId = action.payload;
      state.items = state.items.filter(item => item.id !== itemId);
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    updateQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find(item => item.id === itemId);
      
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.id !== itemId);
        } else {
          const unitPrice = item.price + item.selectedModifiers.reduce((sum, mod) => sum + mod.price_cents, 0);
          item.quantity = quantity;
          item.totalPrice = unitPrice * quantity;
        }
      }
      
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    clearCart: (state) => {
      state.items = [];
      cartSlice.caseReducers.calculateTotals(state);
    },
    
    calculateTotals: (state) => {
      state.totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
      state.totalAmount = state.items.reduce((sum, item) => sum + item.totalPrice, 0);
      state.tax = Math.round(state.totalAmount * 0.08); // 8% tax
      state.grandTotal = state.totalAmount + state.deliveryFee + state.tax;
    },
    
    setDeliveryFee: (state, action) => {
      state.deliveryFee = action.payload;
      cartSlice.caseReducers.calculateTotals(state);
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  calculateTotals,
  setDeliveryFee,
} = cartSlice.actions;

export default cartSlice.reducer;