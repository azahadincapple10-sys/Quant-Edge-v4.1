import os
import jesse.config as config

# Jesse configuration for Quant-Edge integration
# Get absolute path for database
db_path = os.path.join(os.path.dirname(__file__), 'data', 'jesse.db')

config['env'] = {
    'exchanges': {
        'binance': {
            'api_key': os.getenv('BINANCE_API_KEY', ''),
            'api_secret': os.getenv('BINANCE_API_SECRET', ''),
        },
        'alpaca': {
            'api_key': os.getenv('ALPACA_API_KEY', ''),
            'api_secret': os.getenv('ALPACA_API_SECRET', ''),
        }
    },
    'databases': {
        'sqlite': {
            'path': db_path
        }
    },
    'logging': {
        'level': 'INFO',
        'file': True,
        'console': True
    }
}

# Trading configuration
config['trading'] = {
    'default_exchange': 'binance',
    'default_timeframe': '1h',
    'warmup_candles_num': 210,
    'settlement_currency': 'USDT'
}

# Backtesting configuration
config['backtesting'] = {
    'save_charts': True,
    'save_trades': True,
    'save_metrics': True
}</content>
<parameter name="filePath">/workspaces/Quant-Edge-v4/src/jesse/config.py