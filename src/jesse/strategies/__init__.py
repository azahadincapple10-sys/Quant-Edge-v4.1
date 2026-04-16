import jesse.strategies as strategies
from jesse import utils
import numpy as np

class BaseJesseStrategy(strategies.Strategy):
    """
    Base strategy class for Quant-Edge generated strategies.
    This provides common functionality and can be extended by AI-generated strategies.
    """

    @property
    def dna(self):
        """
        DNA defines the hyperparameters that can be optimized.
        Override this in generated strategies.
        """
        return [
            {'name': 'rsi_period', 'type': int, 'min': 2, 'max': 30},
            {'name': 'rsi_overbought', 'type': int, 'min': 60, 'max': 90},
            {'name': 'rsi_oversold', 'type': int, 'min': 10, 'max': 40},
            {'name': 'stop_loss_pct', 'type': float, 'min': 0.01, 'max': 0.1},
            {'name': 'take_profit_pct', 'type': float, 'min': 0.02, 'max': 0.2},
        ]

    def setup(self):
        """
        Initialize strategy parameters from DNA.
        Override this in generated strategies.
        """
        self.rsi_period = self.hp[0] if len(self.hp) > 0 else 14
        self.rsi_overbought = self.hp[1] if len(self.hp) > 1 else 70
        self.rsi_oversold = self.hp[2] if len(self.hp) > 2 else 30
        self.stop_loss_pct = self.hp[3] if len(self.hp) > 3 else 0.05
        self.take_profit_pct = self.hp[4] if len(self.hp) > 4 else 0.1

    def should_long(self):
        """
        Define long entry conditions.
        Override this in generated strategies.
        """
        rsi = utils.rsi(self.candles, self.rsi_period)
        return rsi < self.rsi_oversold

    def should_short(self):
        """
        Define short entry conditions.
        Override this in generated strategies.
        """
        rsi = utils.rsi(self.candles, self.rsi_period)
        return rsi > self.rsi_overbought

    def go_long(self):
        """
        Execute long position entry.
        """
        qty = utils.size_to_qty(self.capital, self.price, 3)
        self.buy = qty, self.price

        # Set stop loss and take profit
        stop_loss_price = self.price * (1 - self.stop_loss_pct)
        take_profit_price = self.price * (1 + self.take_profit_pct)

        self.stop_loss = qty, stop_loss_price
        self.take_profit = qty, take_profit_price

    def go_short(self):
        """
        Execute short position entry.
        """
        qty = utils.size_to_qty(self.capital, self.price, 3)
        self.sell = qty, self.price

        # Set stop loss and take profit
        stop_loss_price = self.price * (1 + self.stop_loss_pct)
        take_profit_price = self.price * (1 - self.take_profit_pct)

        self.stop_loss = qty, stop_loss_price
        self.take_profit = qty, take_profit_price

    def should_cancel_entry(self):
        """
        Define conditions to cancel entry orders.
        """
        return False

    def update_position(self):
        """
        Update existing positions (for scaling in/out, etc.)
        """
        pass

    def filters(self):
        """
        Additional filters for entry conditions.
        """
        return []

    def before_terminate(self):
        """
        Cleanup before strategy termination.
        """
        pass
