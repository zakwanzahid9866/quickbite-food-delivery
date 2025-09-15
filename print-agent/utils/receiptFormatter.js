const { format } = require('date-fns');

class ReceiptFormatter {
  constructor(config) {
    this.config = config;
    this.restaurant = config.restaurant;
  }

  formatKitchenReceipt(order) {
    const lines = [];
    const orderId = order.id.slice(-8);
    const orderTime = format(new Date(order.created_at), 'HH:mm');
    
    lines.push('');
    lines.push('[CENTER]================================[/CENTER]');
    lines.push('[CENTER][BOLD]KITCHEN ORDER[/BOLD][/CENTER]');
    lines.push('[CENTER]================================[/CENTER]');
    lines.push('');
    lines.push(`[BIG]Order #: ${orderId}[/BIG]`);
    lines.push(`Time: ${orderTime}`);
    lines.push(`Type: ${order.order_type?.toUpperCase() || 'DELIVERY'}`);
    
    if (order.customer_name) {
      lines.push(`Customer: ${order.customer_name}`);
    }
    
    lines.push('--------------------------------');
    lines.push('');
    
    // Order items
    if (order.line_items && order.line_items.length > 0) {
      order.line_items.forEach(item => {
        lines.push(`[BOLD]${item.quantity}x ${item.menu_item_name || item.item_name}[/BOLD]`);
        
        // Add modifiers
        if (item.selected_modifiers && item.selected_modifiers.length > 0) {
          item.selected_modifiers.forEach(mod => {
            lines.push(`   + ${mod.name}`);
          });
        }
        
        // Add special instructions for item
        if (item.special_instructions) {
          lines.push(`   NOTE: ${item.special_instructions}`);
        }
        
        lines.push('');
      });
    }
    
    // Order special instructions
    if (order.special_instructions) {
      lines.push('--------------------------------');
      lines.push('[BOLD]SPECIAL INSTRUCTIONS:[/BOLD]');
      lines.push(order.special_instructions);
      lines.push('');
    }
    
    lines.push('--------------------------------');
    lines.push(`Prep Time: ${order.estimated_prep_time || 15} minutes`);
    lines.push(`[BOLD]Started: ${format(new Date(), 'HH:mm')}[/BOLD]`);
    lines.push('================================');
    lines.push('');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  formatCustomerReceipt(order) {
    const lines = [];
    const orderId = order.id.slice(-8);
    const orderDate = format(new Date(order.created_at), 'MMM dd, yyyy');
    const orderTime = format(new Date(order.created_at), 'HH:mm');
    
    lines.push('');
    lines.push('[CENTER]================================[/CENTER]');
    lines.push(`[CENTER][BOLD]${this.restaurant.name}[/BOLD][/CENTER]`);
    lines.push(`[CENTER]${this.restaurant.address}[/CENTER]`);
    lines.push(`[CENTER]${this.restaurant.phone}[/CENTER]`);
    lines.push('[CENTER]================================[/CENTER]');
    lines.push('');
    lines.push(`Order #: ${orderId}`);
    lines.push(`Date: ${orderDate}`);
    lines.push(`Time: ${orderTime}`);
    lines.push(`Type: ${order.order_type?.toUpperCase() || 'DELIVERY'}`);
    lines.push('');
    lines.push('--------------------------------');
    
    // Order items with prices
    if (order.line_items && order.line_items.length > 0) {
      order.line_items.forEach(item => {
        const itemTotal = (item.total_price_cents / 100).toFixed(2);
        const itemLine = `${item.quantity}x ${item.menu_item_name || item.item_name}`;
        const priceLine = `$${itemTotal}`;
        
        // Pad line to fit receipt width (32 chars)
        const padding = 32 - itemLine.length - priceLine.length;
        lines.push(`${itemLine}${' '.repeat(Math.max(1, padding))}${priceLine}`);
        
        // Add modifiers
        if (item.selected_modifiers && item.selected_modifiers.length > 0) {
          item.selected_modifiers.forEach(mod => {
            if (mod.price_cents > 0) {
              const modPrice = (mod.price_cents / 100).toFixed(2);
              lines.push(`  + ${mod.name}              $${modPrice}`);
            } else {
              lines.push(`  + ${mod.name}`);
            }
          });
        }
      });
    }
    
    lines.push('--------------------------------');
    
    // Totals
    const subtotal = (order.subtotal_cents / 100).toFixed(2);
    const tax = (order.tax_cents / 100).toFixed(2);
    const total = (order.total_cents / 100).toFixed(2);
    
    lines.push(`Subtotal:${this.padPrice(`$${subtotal}`, 24)}`);
    lines.push(`Tax:${this.padPrice(`$${tax}`, 28)}`);
    
    if (order.delivery_fee_cents && order.delivery_fee_cents > 0) {
      const deliveryFee = (order.delivery_fee_cents / 100).toFixed(2);
      lines.push(`Delivery:${this.padPrice(`$${deliveryFee}`, 23)}`);
    }
    
    if (order.tip_cents && order.tip_cents > 0) {
      const tip = (order.tip_cents / 100).toFixed(2);
      lines.push(`Tip:${this.padPrice(`$${tip}`, 28)}`);
    }
    
    if (order.discount_cents && order.discount_cents > 0) {
      const discount = (order.discount_cents / 100).toFixed(2);
      lines.push(`Discount:${this.padPrice(`-$${discount}`, 23)}`);
    }
    
    lines.push('--------------------------------');
    lines.push(`[BOLD]TOTAL:${this.padPrice(`$${total}`, 26)}[/BOLD]`);
    lines.push('--------------------------------');
    
    // Payment info
    if (order.payment_method) {
      lines.push(`Payment: ${order.payment_method.toUpperCase()}`);
    }
    
    if (order.payment_status === 'paid') {
      lines.push('[BOLD]PAID[/BOLD]');
    }
    
    lines.push('');
    lines.push('[CENTER]Thank you for your order![/CENTER]');
    
    if (order.estimated_delivery_time) {
      const deliveryTime = format(new Date(order.estimated_delivery_time), 'HH:mm');
      lines.push(`[CENTER]Est. Delivery: ${deliveryTime}[/CENTER]`);
    }
    
    lines.push('[CENTER]================================[/CENTER]');
    lines.push('');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  formatPickupReceipt(order) {
    const lines = [];
    const orderId = order.id.slice(-8);
    const currentTime = format(new Date(), 'HH:mm');
    
    lines.push('');
    lines.push('[CENTER]================================[/CENTER]');
    lines.push('[CENTER][BOLD]ORDER READY[/BOLD][/CENTER]');
    lines.push('[CENTER]================================[/CENTER]');
    lines.push('');
    lines.push(`[BIG]Order #: ${orderId}[/BIG]`);
    lines.push(`[BOLD]Ready at: ${currentTime}[/BOLD]`);
    lines.push('');
    
    if (order.customer_name) {
      lines.push(`[BOLD]Customer: ${order.customer_name}[/BOLD]`);
    }
    
    lines.push('');
    lines.push('[CENTER]Please call customer for pickup[/CENTER]');
    lines.push('================================');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  padPrice(price, totalWidth) {
    return ' '.repeat(Math.max(1, totalWidth - price.length)) + price;
  }

  formatDeliveryLabel(order) {
    const lines = [];
    const orderId = order.id.slice(-8);
    
    lines.push('');
    lines.push('[CENTER]================================[/CENTER]');
    lines.push('[CENTER][BOLD]DELIVERY LABEL[/BOLD][/CENTER]');
    lines.push('[CENTER]================================[/CENTER]');
    lines.push('');
    lines.push(`[BIG]Order #: ${orderId}[/BIG]`);
    lines.push('');
    
    if (order.customer_name) {
      lines.push(`[BOLD]Customer: ${order.customer_name}[/BOLD]`);
    }
    
    // Add delivery address if available
    if (order.delivery_address) {
      lines.push('');
      lines.push('[BOLD]Delivery Address:[/BOLD]');
      lines.push(order.delivery_address.address_line_1);
      if (order.delivery_address.address_line_2) {
        lines.push(order.delivery_address.address_line_2);
      }
      lines.push(`${order.delivery_address.city}, ${order.delivery_address.state}`);
      lines.push(order.delivery_address.postal_code);
    }
    
    lines.push('');
    lines.push(`Total: $${(order.total_cents / 100).toFixed(2)}`);
    
    if (order.special_instructions) {
      lines.push('');
      lines.push('[BOLD]Instructions:[/BOLD]');
      lines.push(order.special_instructions);
    }
    
    lines.push('================================');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }
}

module.exports = ReceiptFormatter;