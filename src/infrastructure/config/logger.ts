 
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(message: string, ...args: unknown[]): string {
    const timestamp = new Date().toLocaleString();
    return `[${green}${timestamp}${reset}] [${yellow}${this.context}${reset}] ${message} ${args.length ? JSON.stringify(args) : ''}`;
  }

  info(message: string, ...args: unknown[]): void {
    console.info(this.formatMessage(message, ...args));
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(this.formatMessage(message, ...args));
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(yellow + this.formatMessage(message, ...args) + reset);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(red + this.formatMessage(message, ...args) + reset);
  }

  static create(context: string): Logger {
    return new Logger(context);
  }
}
