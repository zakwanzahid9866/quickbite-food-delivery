const io = require('socket.io-client');
const escpos = require('escpos');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const logger = require('./utils/logger');
const PrintQueue = require('./utils/printQueue');
const ReceiptFormatter = require('./utils/receiptFormatter');

class PrintAgent {
  constructor() {
    this.socket = null;
    this.printers = new Map();
    this.printQueue = new PrintQueue();
    this.printedOrders = new Set();
    this.isOnline = false;
    this.config = this.loadConfig();
    this.receiptFormatter = new ReceiptFormatter(this.config);
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.handleNewOrder = this.handleNewOrder.bind(this);
    this.processQueue = this.processQueue.bind(this);
  }

  loadConfig() {
    return {
      backend_url: process.env.BACKEND_URL || 'http://localhost:3000',
      auth_token: process.env.PRINT_AGENT_TOKEN,
      agent_id: process.env.AGENT_ID || require('os').hostname(),
      restaurant: {
        name: process.env.RESTAURANT_NAME || 'Fast Food Restaurant',
        address: process.env.RESTAURANT_ADDRESS || '123 Main Street',
        phone: process.env.RESTAURANT_PHONE || '(555) 123-4567'
      },
      printers: {
        kitchen: {
          type: process.env.KITCHEN_PRINTER_TYPE || 'network',
          ip: process.env.KITCHEN_PRINTER_IP || '192.168.1.100',
          port: parseInt(process.env.KITCHEN_PRINTER_PORT) || 9100,
          vendor_id: process.env.KITCHEN_PRINTER_VENDOR_ID,
          product_id: process.env.KITCHEN_PRINTER_PRODUCT_ID,
          enabled: true
        },
        receipt: {
          type: process.env.RECEIPT_PRINTER_TYPE || 'network',
          ip: process.env.RECEIPT_PRINTER_IP || '192.168.1.101',  
          port: parseInt(process.env.RECEIPT_PRINTER_PORT) || 9100,
          vendor_id: process.env.RECEIPT_PRINTER_VENDOR_ID,
          product_id: process.env.RECEIPT_PRINTER_PRODUCT_ID,
          enabled: true
        }
      },
      settings: {
        auto_cut: process.env.AUTO_CUT_ENABLED === 'true',
        debug_mode: process.env.DEBUG_MODE === 'true',
        max_retries: parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3,
        retry_delay: parseInt(process.env.RETRY_DELAY_MS) || 5000,
        receipt_copies: parseInt(process.env.RECEIPT_COPIES) || 1,
        kitchen_copies: parseInt(process.env.KITCHEN_COPIES) || 1
      }
    };
  }

  async initialize() {
    try {
      logger.info('🖨️  Initializing Print Agent...');
      logger.info(`Agent ID: ${this.config.agent_id}`);
      logger.info(`Backend URL: ${this.config.backend_url}`);
      logger.info(`Debug Mode: ${this.config.settings.debug_mode ? 'ON' : 'OFF'}`);

      // Initialize printers
      await this.initializePrinters();
      
      // Connect to backend
      this.connect();
      
      // Start queue processor
      this.startQueueProcessor();
      
      // Setup cleanup handlers
      this.setupCleanupHandlers();
      
      logger.info('✅ Print Agent initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Print Agent:', error);
      process.exit(1);
    }
  }

  async initializePrinters() {
    logger.info('🔧 Initializing printers...');

    for (const [name, config] of Object.entries(this.config.printers)) {
      if (!config.enabled) {
        logger.info(`⏭️  Printer '${name}' disabled, skipping`);
        continue;
      }

      try {
        let device;
        
        if (config.type === 'network') {
          const escposNetwork = require('escpos-network');
          device = new escposNetwork(config.ip, config.port);
          logger.info(`🌐 Network printer '${name}': ${config.ip}:${config.port}`);
        } else if (config.type === 'usb') {
          const escposUSB = require('escpos-usb');
          if (config.vendor_id && config.product_id) {
            device = new escposUSB(config.vendor_id, config.product_id);
          } else {
            device = new escposUSB();
          }
          logger.info(`🔌 USB printer '${name}' initialized`);
        } else {
          throw new Error(`Unsupported printer type: ${config.type}`);
        }

        const printer = new escpos.Printer(device);
        
        // Test printer connection
        if (!this.config.settings.debug_mode) {
          await this.testPrinter(device, name);
        }
        
        this.printers.set(name, { printer, device, config });
        logger.info(`✅ Printer '${name}' initialized successfully`);
        
      } catch (error) {
        logger.error(`❌ Failed to initialize printer '${name}':`, error.message);
        // Continue with other printers even if one fails
      }
    }

    if (this.printers.size === 0) {
      logger.warn('⚠️  No printers initialized. Running in simulation mode.');
    }
  }

  async testPrinter(device, name) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Printer '${name}' connection timeout`));
      }, 5000);

      device.open((error) => {
        clearTimeout(timeout);
        if (error) {
          reject(new Error(`Cannot connect to printer '${name}': ${error.message}`));
        } else {
          device.close();
          resolve();
        }
      });
    });
  }

  connect() {
    logger.info('🔗 Connecting to backend...');
    
    this.socket = io(this.config.backend_url, {
      auth: { 
        token: this.config.auth_token,
        role: 'printer',
        agentId: this.config.agent_id
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000
    });

    this.socket.on('connect', () => {
      logger.info('✅ Connected to backend successfully');
      this.isOnline = true;
      
      // Announce online status
      this.socket.emit('printer_agent_online', {
        agent_id: this.config.agent_id,
        printers: Array.from(this.printers.keys()),
        restaurant: this.config.restaurant
      });
      
      // Process any queued orders
      this.processQueue();
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn(`❌ Disconnected from backend: ${reason}`);
      this.isOnline = false;
    });

    this.socket.on('connect_error', (error) => {
      logger.error('🔗 Connection error:', error.message);
      this.isOnline = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      logger.info(`🔄 Reconnected to backend (attempt ${attemptNumber})`);
    });

    // Order events
    this.socket.on('new_order', this.handleNewOrder);
    
    this.socket.on('order_update', (order) => {
      if (order.status === 'ready') {
        logger.info(`📄 Order ready for pickup: #${order.id.slice(-8)}`);
        this.printPickupReceipt(order);
      }
    });

    this.socket.on('agent_status_confirmed', (data) => {
      logger.info(`✅ Agent status confirmed: ${data.status}`);
    });
  }

  async handleNewOrder(order) {
    const orderId = order.id.slice(-8);
    logger.info(`📋 New order received: #${orderId}`);

    if (this.printedOrders.has(order.id)) {
      logger.warn(`⚠️  Order #${orderId} already printed, skipping`);
      return;
    }

    try {
      // Print kitchen copy immediately
      await this.printKitchenCopy(order);
      
      // Print customer receipt if payment is completed
      if (order.payment_status === 'paid') {
        await this.printCustomerReceipt(order);
      }

      // Mark as printed
      this.printedOrders.add(order.id);
      
      // Confirm successful print
      this.confirmPrint(order.id, 'success');
      
      logger.info(`✅ Order #${orderId} printed successfully`);
      
    } catch (error) {
      logger.error(`❌ Print failed for order #${orderId}:`, error.message);
      this.queueForRetry(order, error);
    }
  }

  async printKitchenCopy(order) {
    const printer = this.printers.get('kitchen');
    if (!printer) {
      throw new Error('Kitchen printer not available');
    }

    const content = this.receiptFormatter.formatKitchenReceipt(order);
    
    for (let i = 0; i < this.config.settings.kitchen_copies; i++) {
      await this.print(printer, content, 'kitchen');
    }
  }

  async printCustomerReceipt(order) {
    const printer = this.printers.get('receipt');
    if (!printer) {
      logger.warn('Receipt printer not available, using kitchen printer');
      // Fallback to kitchen printer
      const kitchenPrinter = this.printers.get('kitchen');
      if (kitchenPrinter) {
        const content = this.receiptFormatter.formatCustomerReceipt(order);
        await this.print(kitchenPrinter, content, 'customer');
      }
      return;
    }

    const content = this.receiptFormatter.formatCustomerReceipt(order);
    
    for (let i = 0; i < this.config.settings.receipt_copies; i++) {
      await this.print(printer, content, 'customer');
    }
  }

  async printPickupReceipt(order) {
    // Print a simple pickup notification
    const printer = this.printers.get('kitchen');
    if (!printer) return;

    const content = this.receiptFormatter.formatPickupReceipt(order);
    await this.print(printer, content, 'pickup');
  }

  async print(printerInfo, content, type = 'unknown') {
    const { printer, device, config } = printerInfo;

    if (this.config.settings.debug_mode) {
      logger.info(`🖨️  [DEBUG] Would print ${type}:\n${content}`);
      return;
    }

    return new Promise((resolve, reject) => {
      device.open((error) => {
        if (error) {
          reject(new Error(`Failed to open printer: ${error.message}`));
          return;
        }

        try {
          printer
            .font('a')
            .align('lt')
            .size(0, 0);

          // Print content
          const lines = content.split('\n');
          lines.forEach(line => {
            if (line.includes('[BOLD]')) {
              printer.style('b').text(line.replace('[BOLD]', '').replace('[/BOLD]', '')).style('normal');
            } else if (line.includes('[CENTER]')) {
              printer.align('ct').text(line.replace('[CENTER]', '').replace('[/CENTER]', '')).align('lt');
            } else if (line.includes('[BIG]')) {
              printer.size(1, 1).text(line.replace('[BIG]', '').replace('[/BIG]', '')).size(0, 0);
            } else {
              printer.text(line);
            }
          });

          // Cut paper if enabled
          if (this.config.settings.auto_cut) {
            printer.cut();
          } else {
            printer.text('\n\n\n');
          }

          printer.close();
          resolve();
          
        } catch (err) {
          device.close();
          reject(new Error(`Print error: ${err.message}`));
        }
      });
    });
  }

  queueForRetry(order, error) {
    this.printQueue.add({
      order,
      error: error.message,
      attempts: 0,
      maxAttempts: this.config.settings.max_retries,
      nextRetry: Date.now() + this.config.settings.retry_delay
    });
    
    logger.info(`📝 Order #${order.id.slice(-8)} queued for retry`);
  }

  async processQueue() {
    if (!this.isOnline || this.printQueue.isEmpty()) {
      return;
    }

    const readyItems = this.printQueue.getReadyItems();
    
    for (const item of readyItems) {
      try {
        await this.handleNewOrder(item.order);
        this.printQueue.remove(item);
        logger.info(`✅ Retry successful for order #${item.order.id.slice(-8)}`);
      } catch (error) {
        item.attempts++;
        
        if (item.attempts >= item.maxAttempts) {
          logger.error(`❌ Giving up on order #${item.order.id.slice(-8)} after ${item.maxAttempts} attempts`);
          this.printQueue.remove(item);
          this.confirmPrint(item.order.id, 'failed');
        } else {
          item.nextRetry = Date.now() + (item.attempts * this.config.settings.retry_delay);
          logger.warn(`⏳ Retry ${item.attempts}/${item.maxAttempts} failed for order #${item.order.id.slice(-8)}, next retry in ${this.config.settings.retry_delay}ms`);
        }
      }
    }
  }

  startQueueProcessor() {
    // Process queue every 30 seconds
    setInterval(() => {
      this.processQueue();
    }, 30000);

    // Also schedule cleanup of old printed orders every hour
    cron.schedule('0 * * * *', () => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const oldOrders = Array.from(this.printedOrders).filter(orderId => {
        // This is a simple cleanup - in production you might want to track timestamps
        return Math.random() < 0.1; // Remove ~10% randomly as cleanup
      });
      
      oldOrders.forEach(orderId => this.printedOrders.delete(orderId));
      
      if (oldOrders.length > 0) {
        logger.info(`🧹 Cleaned up ${oldOrders.length} old printed order records`);
      }
    });
  }

  confirmPrint(orderId, status) {
    if (this.socket && this.isOnline) {
      this.socket.emit('print_confirmation', {
        order_id: orderId,
        agent_id: this.config.agent_id,
        status,
        timestamp: new Date().toISOString()
      });
    }
  }

  setupCleanupHandlers() {
    const cleanup = () => {
      logger.info('🛑 Print agent shutting down...');
      
      if (this.socket) {
        this.socket.emit('printer_agent_offline', {
          agent_id: this.config.agent_id
        });
        this.socket.disconnect();
      }
      
      // Close all printer connections
      this.printers.forEach((printerInfo, name) => {
        try {
          printerInfo.device.close();
          logger.info(`🔌 Closed connection to printer '${name}'`);
        } catch (error) {
          logger.warn(`⚠️  Error closing printer '${name}':`, error.message);
        }
      });
      
      logger.info('✅ Print agent shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (error) => {
      logger.error('🚨 Uncaught exception:', error);
      cleanup();
    });
  }
}

// Start the print agent
const agent = new PrintAgent();
agent.initialize().catch(error => {
  logger.error('💥 Fatal error:', error);
  process.exit(1);
});

module.exports = PrintAgent;