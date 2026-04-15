from jesse.strategies import Strategy
import jesse.indicators as ta
from jesse import utils

class ICTBreakerStrategy(Strategy):
    @property
    def htf_candles(self):
        # High Timeframe (HTF) for bias: Daily
        return self.get_candles(self.exchange, self.symbol, '1D')

    def should_long(self) -> bool:
        # 1. HTF Bias: Daily is making higher highs/lows
        daily_low = self.htf_candles[-10][4]
        daily_high = self.htf_candles[-1][3]
        discount_price = (daily_low + daily_high) / 2
        
        # 2. Context: Price is in HTF Discount and tagging a POI [00:24:01]
        context = self.price < discount_price
        
        # 3. Execution: LTF Breaker (Sweep + MSB) [00:32:15]
        # Look for a recent sweep of a 1H low followed by a break of a 1H high
        swapped_low = ta.lowest(self.candles, 10)[-1] < ta.lowest(self.candles, 20)[-2]
        break_high = self.price > ta.highest(self.candles, 10)[-2]
        
        return context and swapped_low and break_high

    def should_short(self) -> bool:
        daily_low = self.htf_candles[-10][4]
        daily_high = self.htf_candles[-1][3]
        premium_price = (daily_low + daily_high) / 2
        
        context = self.price > premium_price
        swapped_high = ta.highest(self.candles, 10)[-1] > ta.highest(self.candles, 20)[-2]
        break_low = self.price < ta.lowest(self.candles, 10)[-2]
        
        return context and swapped_high and break_low

    def go_long(self):
        # Stop loss placed at the 'Pico Low' (the sweep low) [00:33:09]
        sl = ta.lowest(self.candles, 5)[-1]
        qty = utils.risk_to_qty(self.balance, 1, self.price, sl, fee_rate=self.fee_rate)
        self.buy = qty, self.price

    def go_short(self):
        sh = ta.highest(self.candles, 5)[-1]
        qty = utils.risk_to_qty(self.balance, 1, self.price, sh, fee_rate=self.fee_rate)
        self.sell = qty, self.price

    @property
    def stop_loss(self) -> float:
        return ta.lowest(self.candles, 5)[-1] if self.is_long else ta.highest(self.candles, 5)[-1]

    @property
    def take_profit(self) -> float:
        # Target the HTF External Liquidity (Daily High/Low) [00:53:01]
        return self.htf_candles[-1][3] if self.is_long else self.htf_candles[-1][4]