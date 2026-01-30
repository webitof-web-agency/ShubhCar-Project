class Queue {
  constructor(name, opts) {
    this.name = name;
    this.opts = opts;
  }
  add() {
    return Promise.resolve();
  }
}

class Worker {
  constructor(name, processor, opts) {
    this.name = name;
    this.processor = processor;
    this.opts = opts;
  }
  close() {
    return Promise.resolve();
  }
}

module.exports = { Queue, Worker };
