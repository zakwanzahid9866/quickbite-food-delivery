class PrintQueue {
  constructor() {
    this.items = [];
  }

  add(item) {
    this.items.push({
      id: Date.now() + Math.random(),
      ...item,
      addedAt: Date.now()
    });
  }

  remove(item) {
    const index = this.items.findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  getReadyItems() {
    const now = Date.now();
    return this.items.filter(item => item.nextRetry <= now);
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }

  getStats() {
    return {
      total: this.items.length,
      ready: this.getReadyItems().length,
      failed: this.items.filter(item => item.attempts >= item.maxAttempts).length
    };
  }
}

module.exports = PrintQueue;