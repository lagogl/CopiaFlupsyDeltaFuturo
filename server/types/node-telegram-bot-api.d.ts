declare module 'node-telegram-bot-api' {
  class TelegramBot {
    constructor(token: string, options?: any);
    sendMessage(chatId: string | number, text: string, options?: any): Promise<any>;
    on(event: string, listener: Function): this;
    // Aggiungi altri metodi se necessario
  }
  export = TelegramBot;
}