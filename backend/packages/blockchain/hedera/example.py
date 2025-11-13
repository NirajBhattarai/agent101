"""Example usage of Hedera client."""

from packages.blockchain.hedera.client import HederaClient
from packages.blockchain.hedera.transactions import TransactionService


def example_usage():
    """Example of how to use the Hedera package."""
    # Initialize client
    client = HederaClient(
        account_id="0.0.123456",
        private_key="your-private-key-here"
    )

    # Connect to network
    client.connect()

    # Create transaction service
    transaction_service = TransactionService(client)

    # Example: Create a transaction
    transaction_data = {
        "type": "transfer",
        "amount": 100,
        "recipient": "0.0.789012"
    }

    transaction_id = transaction_service.create_transaction(transaction_data)
    if transaction_id:
        print(f"Transaction created: {transaction_id}")

        # Check transaction status
        status = transaction_service.get_transaction_status(transaction_id)
        print(f"Transaction status: {status}")

    # Disconnect
    client.disconnect()


if __name__ == "__main__":
    example_usage()

