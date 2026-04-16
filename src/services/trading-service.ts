import Alpaca from '@alpacahq/alpaca-trade-api';

/**
 * Trading Service - Handles both Alpaca (paper/live) and Binance (sim) trading
 */

export interface TradeConfig {
  exchange: 'alpaca' | 'binance';
  alpacaKeyId?: string;
  alpacaSecretKey?: string;
  alpacaPaper?: boolean;
  binanceApiKey?: string;
  binanceApiSecret?: string;
}

export interface Position {
  id: string;
  symbol: string;
  qty: number;
  avgFillPrice: number;
  side: 'long' | 'short';
  unrealizedPL: number;
  unrealizedPLPercent: number;
  entryTime: string;
  currentPrice?: number;
}

export interface Account {
  equity: number;
  cash: number;
  buyingPower: number;
  leverage: number;
  dayPL: number;
  dayPLPercent: number;
  portfolioValue: number;
  currency: string;
  status: string;
}

export interface Trade {
  id: string;
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price: number;
  status: string;
  filledQty: number;
  timestamp: string;
}

/**
 * Alpaca Trading Handler
 */
class AlpacaTrader {
  private alpaca: any;
  private config: TradeConfig;
  private lastEquity: number = 0;

  constructor(config: TradeConfig) {
    this.config = config;
    this.alpaca = new Alpaca({
      keyId: config.alpacaKeyId || '',
      secretKey: config.alpacaSecretKey || '',
      paper: config.alpacaPaper ?? true,
      baseUrl: config.alpacaPaper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets',
    });
  }

  async getAccount(): Promise<Account> {
    try {
      const account = await this.alpaca.getAccount();
      
      const dayPL = (account.equity || 0) - (this.lastEquity || account.equity);
      this.lastEquity = account.equity;

      return {
        equity: parseFloat(account.equity),
        cash: parseFloat(account.cash),
        buyingPower: parseFloat(account.buying_power),
        leverage: 1, // Alpaca calculates this
        dayPL,
        dayPLPercent: this.lastEquity > 0 ? (dayPL / this.lastEquity) * 100 : 0,
        portfolioValue: parseFloat(account.portfolio_value),
        currency: account.currency || 'USD',
        status: account.status,
      };
    } catch (error: any) {
      throw new Error(`Alpaca getAccount failed: ${error.message}`);
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      const positions = await this.alpaca.getPositions();
      return positions.map((pos: any) => ({
        id: pos.asset_id,
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        avgFillPrice: parseFloat(pos.avg_fill_price),
        side: parseFloat(pos.qty) > 0 ? 'long' : 'short',
        unrealizedPL: parseFloat(pos.unrealized_pl),
        unrealizedPLPercent: parseFloat(pos.unrealized_plpc) * 100,
        entryTime: new Date(pos.filled_at).toISOString(),
        currentPrice: parseFloat(pos.current_price),
      }));
    } catch (error: any) {
      throw new Error(`Alpaca getPositions failed: ${error.message}`);
    }
  }

  async placeOrder(params: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    limitPrice?: number;
  }): Promise<Trade> {
    try {
      const order = await this.alpaca.createOrder({
        symbol: params.symbol,
        qty: params.qty,
        side: params.side,
        type: params.type,
        limit_price: params.limitPrice,
        time_in_force: 'gtc',
      });

      return {
        id: order.id,
        symbol: order.symbol,
        qty: order.qty,
        side: order.side as 'buy' | 'sell',
        type: order.order_type as 'market' | 'limit',
        price: order.limit_price || order.filled_avg_price || 0,
        status: order.status,
        filledQty: order.filled_qty,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Alpaca placeOrder failed: ${error.message}`);
    }
  }

  async closePosition(symbol: string): Promise<Trade> {
    try {
      const order = await this.alpaca.closePosition(symbol);
      return {
        id: order.id,
        symbol: order.symbol,
        qty: order.qty,
        side: order.side as 'buy' | 'sell',
        type: 'market',
        price: order.filled_avg_price || 0,
        status: order.status,
        filledQty: order.filled_qty,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Alpaca closePosition failed: ${error.message}`);
    }
  }

  async getOrders(): Promise<Trade[]> {
    try {
      const orders = await this.alpaca.getOrders({ status: 'all' });
      return orders.slice(0, 10).map((order: any) => ({
        id: order.id,
        symbol: order.symbol,
        qty: order.qty,
        side: order.side as 'buy' | 'sell',
        type: order.order_type as 'market' | 'limit',
        price: order.limit_price || order.filled_avg_price || 0,
        status: order.status,
        filledQty: order.filled_qty,
        timestamp: new Date(order.created_at).toISOString(),
      }));
    } catch (error: any) {
      throw new Error(`Alpaca getOrders failed: ${error.message}`);
    }
  }
}

/**
 * Binance Trading Handler (Simulation)
 */
class BinanceTrader {
  private config: TradeConfig;
  private positions: Map<string, Position> = new Map();
  private lastEquity: number = 0;
  private baseEquity: number = 10000;

  constructor(config: TradeConfig) {
    this.config = config;
    this.lastEquity = this.baseEquity;
  }

  async getAccount(): Promise<Account> {
    const totalPositionValue = Array.from(this.positions.values()).reduce(
      (sum, pos) => sum + Math.abs(pos.qty * pos.currentPrice!),
      0
    );
    
    const dayPL = this.baseEquity - this.lastEquity;
    const currentEquity = this.baseEquity + dayPL;

    return {
      equity: currentEquity,
      cash: this.baseEquity - totalPositionValue,
      buyingPower: (this.baseEquity - totalPositionValue) * 3, // 3x leverage
      leverage: 1.25,
      dayPL,
      dayPLPercent: (dayPL / this.baseEquity) * 100,
      portfolioValue: currentEquity,
      currency: 'USDT',
      status: 'CONNECTED',
    };
  }

  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }

  async placeOrder(params: {
    symbol: string;
    qty: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    limitPrice?: number;
  }): Promise<Trade> {
    // Simulate order execution
    const mockPrice = params.limitPrice || Math.random() * 50000 + 40000;
    
    if (params.side === 'buy') {
      this.positions.set(params.symbol, {
        id: Math.random().toString(36).substr(2, 9),
        symbol: params.symbol,
        qty: params.qty,
        avgFillPrice: mockPrice,
        side: 'long',
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        entryTime: new Date().toISOString(),
        currentPrice: mockPrice,
      });
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      symbol: params.symbol,
      qty: params.qty,
      side: params.side,
      type: params.type,
      price: mockPrice,
      status: 'FILLED',
      filledQty: params.qty,
      timestamp: new Date().toISOString(),
    };
  }

  async closePosition(symbol: string): Promise<Trade> {
    const position = this.positions.get(symbol);
    if (!position) {
      throw new Error(`No position found for ${symbol}`);
    }

    this.positions.delete(symbol);

    return {
      id: Math.random().toString(36).substr(2, 9),
      symbol,
      qty: position.qty,
      side: 'sell',
      type: 'market',
      price: position.currentPrice || position.avgFillPrice,
      status: 'FILLED',
      filledQty: position.qty,
      timestamp: new Date().toISOString(),
    };
  }

  async getOrders(): Promise<Trade[]> {
    return [];
  }
}

/**
 * Trading Service Router
 */
export class TradingService {
  private trader: AlpacaTrader | BinanceTrader;
  private exchange: 'alpaca' | 'binance';

  constructor(config: TradeConfig) {
    this.exchange = config.exchange;
    if (config.exchange === 'alpaca') {
      this.trader = new AlpacaTrader(config);
    } else {
      this.trader = new BinanceTrader(config);
    }
  }

  async getAccount(): Promise<Account> {
    return this.trader.getAccount();
  }

  async getPositions(): Promise<Position[]> {
    return this.trader.getPositions();
  }

  async placeOrder(params: Parameters<typeof this.trader.placeOrder>[0]): Promise<Trade> {
    return this.trader.placeOrder(params);
  }

  async closePosition(symbol: string): Promise<Trade> {
    return this.trader.closePosition(symbol);
  }

  async getOrders(): Promise<Trade[]> {
    return this.trader.getOrders();
  }

  getExchange(): 'alpaca' | 'binance' {
    return this.exchange;
  }
}

export default TradingService;
