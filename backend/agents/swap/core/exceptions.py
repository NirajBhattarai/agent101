"""Custom exceptions for Swap Agent."""


class SwapAgentError(Exception):
    """Base exception for Swap Agent errors."""

    pass


class ChainNotSupportedError(SwapAgentError):
    """Raised when a chain is not supported."""

    def __init__(self, chain: str):
        self.chain = chain
        super().__init__(f"Chain not supported: {chain}")


class TokenNotFoundError(SwapAgentError):
    """Raised when a token is not found."""

    def __init__(self, token_symbol: str, chain: str):
        self.token_symbol = token_symbol
        self.chain = chain
        super().__init__(f"Token {token_symbol} not found on {chain}")


class SwapExecutionError(SwapAgentError):
    """Raised when swap execution fails."""

    pass
