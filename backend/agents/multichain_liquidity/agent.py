"""
Multi-Chain Liquidity Agent Definition

Defines the LiquidityAgent class that handles liquidity queries using direct tool calls.
"""

from .core.constants import (  # noqa: E402
    ERROR_VALIDATION_FAILED,
)
from .core.response_validator import (  # noqa: E402
    build_error_response,
    log_response_info,
    validate_and_serialize_response,
    validate_json,
)
from .services.query_parser import (  # noqa: E402
    extract_fee_tier,
    extract_token_addresses,
    parse_chain,
)
from .services.response_builder import build_liquidity_response  # noqa: E402
from .services.token_resolver import resolve_token_pair  # noqa: E402
from .tools import (  # noqa: E402
    get_ethereum_liquidity,
    get_hedera_liquidity,
    get_polygon_liquidity,
)


class LiquidityAgent:
    """Agent that retrieves liquidity pool information from blockchain chains using direct tool calls."""

    async def invoke(self, query: str, session_id: str) -> str:
        """Invoke the agent with a query."""
        print(f"💧 Liquidity Agent received query: {query}")

        # Parse query
        token_a, token_b = extract_token_addresses(query)
        chain = parse_chain(query)
        fee = extract_fee_tier(query) or 3000

        if not token_a or not token_b:
            error_msg = (
                "Could not extract token addresses from query. "
                "Please provide two token symbols (e.g., ETH, USDT) or addresses (0x...). "
                "Supported symbols: ETH, WETH, USDC, USDT, DAI, WBTC, HBAR, and others."
            )
            return build_error_response(
                chain, token_a or "unknown", token_b or "unknown", error_msg
            )

        print(f"📊 Resolved tokens: token_a={token_a}, token_b={token_b}, chain={chain}, fee={fee}")

        try:
            # Resolve addresses per-chain for direct tool calls
            # Using direct tool calls for reliability (parallel agent API has issues)
            if chain == "all":
                eth_token_a, eth_token_b = resolve_token_pair(token_a, token_b, "ethereum")
                poly_token_a, poly_token_b = resolve_token_pair(token_a, token_b, "polygon")
                hedera_token_a, hedera_token_b = resolve_token_pair(token_a, token_b, "hedera")
            else:
                # For single chain, resolve once and use for all (though only one will be queried)
                resolved_a, resolved_b = resolve_token_pair(token_a, token_b, chain)
                eth_token_a, eth_token_b = resolved_a, resolved_b
                poly_token_a, poly_token_b = resolved_a, resolved_b
                hedera_token_a, hedera_token_b = resolved_a, resolved_b

            print(
                f"🔗 Using per-chain addresses: ETH={eth_token_a}/{eth_token_b}, "
                f"POLY={poly_token_a}/{poly_token_b}, HEDERA={hedera_token_a}/{hedera_token_b}"
            )

            # Call tools directly in parallel for reliability
            # Skip chains where tokens couldn't be resolved (None values)
            import asyncio
            from concurrent.futures import ThreadPoolExecutor

            loop = asyncio.get_event_loop()
            chain_results = {}

            # Only query chains where both tokens are resolved
            futures_to_create = []

            if eth_token_a and eth_token_b:
                futures_to_create.append(
                    ("ethereum", get_ethereum_liquidity, eth_token_a, eth_token_b, fee)
                )
            else:
                chain_results["ethereum"] = {
                    "chain": "ethereum",
                    "token_a": token_a,
                    "token_b": token_b,
                    "fee": fee,
                    "status": "error",
                    "error": f"Token pair not available on Ethereum: {token_a}/{token_b}",
                }

            if poly_token_a and poly_token_b:
                futures_to_create.append(
                    ("polygon", get_polygon_liquidity, poly_token_a, poly_token_b, fee)
                )
            else:
                chain_results["polygon"] = {
                    "chain": "polygon",
                    "token_a": token_a,
                    "token_b": token_b,
                    "fee": fee,
                    "status": "error",
                    "error": f"Token pair not available on Polygon: {token_a}/{token_b}",
                }

            if hedera_token_a and hedera_token_b:
                futures_to_create.append(
                    ("hedera", get_hedera_liquidity, hedera_token_a, hedera_token_b, fee)
                )
            else:
                chain_results["hedera"] = {
                    "chain": "hedera",
                    "token_a": token_a,
                    "token_b": token_b,
                    "fee": fee,
                    "status": "error",
                    "error": f"Token pair not available on Hedera: {token_a}/{token_b}",
                }

            # Execute only valid futures
            if futures_to_create:
                with ThreadPoolExecutor(max_workers=len(futures_to_create)) as executor:
                    futures = []
                    for item in futures_to_create:
                        chain_name = item[0]
                        func = item[1]
                        args = item[2:]
                        futures.append((chain_name, loop.run_in_executor(executor, func, *args)))

                    results = await asyncio.gather(*[f[1] for f in futures], return_exceptions=True)
                    for (chain_name, _), result in zip(futures, results, strict=False):
                        if isinstance(result, Exception):
                            chain_results[chain_name] = {
                                "chain": chain_name,
                                "token_a": token_a,
                                "token_b": token_b,
                                "fee": fee,
                                "status": "error",
                                "error": str(result),
                            }
                        else:
                            chain_results[chain_name] = result

            ethereum_result = chain_results.get("ethereum")
            polygon_result = chain_results.get("polygon")
            hedera_result = chain_results.get("hedera")

            # Build response
            liquidity_data = build_liquidity_response(
                chain=chain,
                token_a=token_a,
                token_b=token_b,
                ethereum_result=ethereum_result,
                polygon_result=polygon_result,
                hedera_result=hedera_result,
            )

            response = validate_and_serialize_response(liquidity_data)
            log_response_info(token_a, token_b, chain, response)
            validate_json(response)
            return response

        except Exception as e:
            print(f"❌ Validation error: {e}")
            import traceback

            traceback.print_exc()
            error_msg = f"{ERROR_VALIDATION_FAILED}: {str(e)}"
            return build_error_response(chain, token_a, token_b, error_msg)
