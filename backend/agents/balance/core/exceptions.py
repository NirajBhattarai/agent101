"""Custom exceptions for balance agent."""


class BalanceAgentError(Exception):
    """Base exception for balance agent errors."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(BalanceAgentError):
    """Exception raised when validation fails."""

    pass


class QueryParsingError(BalanceAgentError):
    """Exception raised when query parsing fails."""

    pass

